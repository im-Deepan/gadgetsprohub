/**
 * Elegant and highly resilient API Client for React/Vite.
 * 
 * Implements:
 * 1. Request Cancellation (via AbortController signals)
 * 2. Duplicate Prevention / Request Deduplication (coalescing concurrent active identical calls)
 * 3. Error Recovery (retry logic with exponential backoff for transient failures)
 */

interface ApiFetchOptions extends RequestInit {
  timeout?: number;
  maxRetries?: number;
  backoffDelay?: number; // Initial backoff delay in ms
  deduplicate?: boolean; // Enable promise deduplication for concurrent identical calls
}

// Registry to track and coalescing identical in-flight promises (Deduplication)
const activeRequests = new Map<string, Promise<Response>>();

// Registry for auto-aborting previous duplicate requests
const abortControllersRegistry = new Map<string, AbortController>();

// Memory cache to store completed GET responses with a Time To Live (TTL)
const completedRequestsCache = new Map<string, { response: Response; timestamp: number }>();
const CACHE_TTL_MS = 45000; // Cache GET requests for 45 seconds by default to enable lightning fast Back/Forward and Page transitions

/**
 * Manually clears the API client-side response cache
 */
export function clearApiCache(): void {
  completedRequestsCache.clear();
}

/**
 * Diagnostic helper to check the product collection count and structure directly.
 */
export async function diagnosticCheckProducts(): Promise<{
  success: boolean;
  source?: string;
  count?: number;
  sampleStructure?: string[];
  sampleData?: any;
  error?: string;
}> {
  try {
    const res = await apiFetch('/api/diagnostic/products', { deduplicate: false });
    if (!res.ok) {
      throw new Error(`Failed to fetch diagnostic data. Status: ${res.status}`);
    }
    const data = await res.json();
    console.log('[Diagnostic] Product Sync Status:', data);
    return data;
  } catch (err: any) {
    console.error('[Diagnostic] Client Error:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Generates a unique deterministic key for a request to identify duplicates
 */
function getRequestKey(url: string, options: ApiFetchOptions = {}): string {
  const method = options.method || 'GET';
  const body = typeof options.body === 'string' ? options.body : '';
  const headers = options.headers ? JSON.stringify(options.headers) : '';
  return `${method}:${url}:${body}:${headers}`;
}

/**
 * Resilient fetch utility wrapper
 */
export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const {
    timeout = 10000,
    maxRetries = 3,
    backoffDelay = 500,
    deduplicate = true,
    credentials = 'include',
    ...fetchOptions
  } = options;

  // Copy and handle headers to inject Authorization Bearer token from localStorage if available
  const originalHeaders = fetchOptions.headers;
  let headersObj: any;
  if (originalHeaders instanceof Headers) {
    headersObj = new Headers(originalHeaders);
  } else if (Array.isArray(originalHeaders)) {
    headersObj = [...originalHeaders];
  } else if (originalHeaders && typeof originalHeaders === 'object') {
    headersObj = { ...originalHeaders };
  } else {
    headersObj = {};
  }

  let hasAuthHeader = false;
  if (headersObj instanceof Headers) {
    hasAuthHeader = headersObj.has('Authorization') || headersObj.has('authorization');
  } else if (Array.isArray(headersObj)) {
    hasAuthHeader = headersObj.some(([k]) => k.toLowerCase() === 'authorization');
  } else if (typeof headersObj === 'object') {
    hasAuthHeader = Object.keys(headersObj).some(k => k.toLowerCase() === 'authorization');
  }

  if (!hasAuthHeader) {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('authToken'))
      : null;
    if (token) {
      if (headersObj instanceof Headers) {
        headersObj.set('Authorization', `Bearer ${token}`);
      } else if (Array.isArray(headersObj)) {
        headersObj.push(['Authorization', `Bearer ${token}`]);
      } else if (typeof headersObj === 'object') {
        headersObj['Authorization'] = `Bearer ${token}`;
      }
    }
  }

  let hasContentType = false;
  if (headersObj instanceof Headers) {
    hasContentType = headersObj.has('Content-Type') || headersObj.has('content-type');
  } else if (Array.isArray(headersObj)) {
    hasContentType = headersObj.some(([k]) => k.toLowerCase() === 'content-type');
  } else if (typeof headersObj === 'object') {
    hasContentType = Object.keys(headersObj).some(k => k.toLowerCase() === 'content-type');
  }

  if (!hasContentType && fetchOptions.body && typeof fetchOptions.body === 'string') {
    if (headersObj instanceof Headers) {
      headersObj.set('Content-Type', 'application/json');
    } else if (Array.isArray(headersObj)) {
      headersObj.push(['Content-Type', 'application/json']);
    } else if (typeof headersObj === 'object') {
      headersObj['Content-Type'] = 'application/json';
    }
  }

  fetchOptions.headers = headersObj;

  const requestKey = getRequestKey(url, options);
  const isGet = !options.method || options.method.toUpperCase() === 'GET';

  // Check GET memory cache
  if (isGet) {
    const cachedEntry = completedRequestsCache.get(requestKey);
    if (cachedEntry) {
      const isExpired = Date.now() - cachedEntry.timestamp > CACHE_TTL_MS;
      if (!isExpired) {
        return cachedEntry.response.clone();
      } else {
        completedRequestsCache.delete(requestKey);
      }
    }
  }

  // 1. Auto-Abort previous identical in-flight request if requested
  // This cleans up previous requests for the same endpoint (e.g. searching, typing, fast switching)
  // Ensure we do NOT abort the previous request if deduplication is enabled and currently coalescing active requests
  const isDeduplicated = deduplicate && isGet;
  if ((isGet || options.method === 'POST') && !(isDeduplicated && activeRequests.has(requestKey))) {
    const existingController = abortControllersRegistry.get(requestKey);
    if (existingController) {
      existingController.abort();
    }
    const newController = new AbortController();
    abortControllersRegistry.set(requestKey, newController);
    
    // Merge signals safely
    if (options.signal) {
      if (options.signal.aborted) {
        newController.abort();
      } else {
        options.signal.addEventListener('abort', () => newController.abort());
      }
    }
    fetchOptions.signal = newController.signal;
  }

  // Helper function to perform fetch with timeout and retry logic
  const executeFetchWithRetry = async (attempt: number = 0): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    // Merge signals for timing out
    let signalToUse: AbortSignal | null | undefined = fetchOptions.signal;
    if (!signalToUse) {
      signalToUse = controller.signal;
    } else if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
      signalToUse = (AbortSignal as any).any([signalToUse, controller.signal]);
      signalToUse?.addEventListener('abort', () => clearTimeout(id));
    } else {
      // Polyfill behavior for AbortSignal.any if unsupported
      const combinedController = new AbortController();
      const existingSignal = signalToUse;
      existingSignal.addEventListener('abort', () => combinedController.abort());
      controller.signal.addEventListener('abort', () => combinedController.abort());
      signalToUse = combinedController.signal;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        credentials,
        signal: signalToUse
      });

      clearTimeout(id);

      // Retry for transient 5xx server errors
      if (response.status >= 500 && response.status <= 599 && attempt < maxRetries) {
        const delay = backoffDelay * Math.pow(2, attempt); // Exponential backoff: 500ms -> 1000ms -> 2000ms
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeFetchWithRetry(attempt + 1);
      }

      return response;
    } catch (err: unknown) {
      clearTimeout(id);
      
      const errorObj = err instanceof Error ? err : new Error(String(err));

      // Don't retry if the request was intentionally aborted
      if (errorObj.name === 'AbortError') {
        throw errorObj;
      }

      // Retry for network failures/offline states
      if (attempt < maxRetries) {
        const delay = backoffDelay * Math.pow(2, attempt);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeFetchWithRetry(attempt + 1);
      }

      throw errorObj;
    }
  };

  // 2. Coalescing / Deduplicating identical active requests to prevent double-firing
  if (deduplicate && isGet) {
    let existingPromise = activeRequests.get(requestKey);
    if (!existingPromise) {
      const p = executeFetchWithRetry();
      p.catch(() => {}); // Prevent unhandled rejection on base promise
      existingPromise = p.finally(() => {
        activeRequests.delete(requestKey);
        abortControllersRegistry.delete(requestKey);
      });
      existingPromise.catch(() => {});
      activeRequests.set(requestKey, existingPromise);
    }
    // Return a clone of the response so multiple callers can read the body stream
    const returnedPromise = existingPromise.then(res => {
      // Cache the response if it is successful and is a GET
      if (res.ok) {
        completedRequestsCache.set(requestKey, {
          response: res.clone(),
          timestamp: Date.now()
        });
      }
      return res.clone();
    });
    returnedPromise.catch(() => {}); // Prevent unhandled rejection on the returned cloned promise
    return returnedPromise;
  }

  // If deduplication is not needed (e.g. POST/PUT/DELETE mutations), run directly
  const p = executeFetchWithRetry();
  p.catch(() => {}); // Prevent unhandled rejection of original promise
  const returnedPromise = p.then(res => {
    // Invalidate the entire GET cache on any successful non-GET mutation
    if (res.ok && options.method && options.method.toUpperCase() !== 'GET') {
      clearApiCache();
    }
    return res;
  }).finally(() => {
    abortControllersRegistry.delete(requestKey);
  });
  returnedPromise.catch(() => {}); // Prevent unhandled rejection on the returned promise
  return returnedPromise;
}
