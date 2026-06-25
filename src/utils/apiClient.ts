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
    timeout = 15000,
    maxRetries = 3,
    backoffDelay = 500,
    deduplicate = true,
    ...fetchOptions
  } = options;

  const requestKey = getRequestKey(url, options);

  // 1. Auto-Abort previous identical in-flight request if requested
  // This cleans up previous requests for the same endpoint (e.g. searching, typing, fast switching)
  if (options.method === 'GET' || options.method === 'POST') {
    const existingController = abortControllersRegistry.get(requestKey);
    if (existingController) {
      existingController.abort();
    }
    const newController = new AbortController();
    abortControllersRegistry.set(requestKey, newController);
    
    // Merge signals safely
    if (options.signal) {
      // If user provided their own signal, listen to both
      options.signal.addEventListener('abort', () => newController.abort());
    }
    fetchOptions.signal = newController.signal;
  }

  // Helper function to perform fetch with timeout and retry logic
  const executeFetchWithRetry = async (attempt: number = 0): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    // Merge signals for timing out
    let signalToUse = fetchOptions.signal;
    if (!signalToUse) {
      signalToUse = controller.signal;
    } else {
      // Listen to timeout controller if user did not abort first
      signalToUse.addEventListener('abort', () => clearTimeout(id));
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
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
  if (deduplicate && (options.method === 'GET' || !options.method)) {
    let existingPromise = activeRequests.get(requestKey);
    if (!existingPromise) {
      existingPromise = executeFetchWithRetry().finally(() => {
        activeRequests.delete(requestKey);
        abortControllersRegistry.delete(requestKey);
      });
      activeRequests.set(requestKey, existingPromise);
    } else {
      
    }
    return existingPromise;
  }

  // If deduplication is not needed (e.g. POST/PUT/DELETE mutations), run directly
  return executeFetchWithRetry().finally(() => {
    abortControllersRegistry.delete(requestKey);
  });
}
