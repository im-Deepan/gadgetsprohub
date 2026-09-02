export interface ErrorContext {
  [key: string]: any;
}

export const captureError = (error: Error | unknown, context?: ErrorContext) => {
  let message = '';
  let name = '';
  let stack = undefined;

  if (error instanceof Error) {
    message = error.message;
    name = error.name;
    stack = error.stack;
  } else if (error && typeof error === 'object') {
    name = 'name' in error ? String((error as any).name) : '';
    message = 'message' in error ? String((error as any).message) : String(error);
    stack = 'stack' in error ? String((error as any).stack) : undefined;
  } else {
    message = String(error || '');
  }

  const normalizedMessage = (message || '').toLowerCase();
  const normalizedName = (name || '').toLowerCase();
  const normalizedStack = (stack || '').toLowerCase();
  const contextStr = typeof context === 'string' 
    ? context 
    : (context && typeof context === 'object' && 'context' in context ? String(context.context) : '');
  const normalizedContext = contextStr.toLowerCase();

  // Suppress only expected request aborts, empty/blank errors, and third-party extension/ad script noise
  if (
    normalizedName === 'aborterror' ||
    normalizedName === 'abort' ||
    normalizedName === 'cancelederror' ||
    normalizedMessage === 'canceled' ||
    normalizedMessage.includes('aborted') ||
    normalizedMessage.includes('chrome-extension') ||
    normalizedMessage.includes('safari-extension') ||
    normalizedMessage.includes('moz-extension') ||
    normalizedMessage.includes('content-script') ||
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('networkerror') ||
    normalizedMessage.includes('load failed') ||
    message === '' ||
    message === 'Error' ||
    message === '[object Object]' ||
    (normalizedContext.includes('unhandled promise rejection') && (
      !message ||
      message === 'Error' ||
      message === '[object Object]' ||
      normalizedName === 'error' ||
      normalizedMessage === 'error' ||
      normalizedMessage.includes('failed to fetch') ||
      normalizedMessage.includes('load failed') ||
      normalizedMessage.includes('networkerror')
    )) ||
    normalizedMessage.includes('adsbygoogle') ||
    normalizedMessage.includes('googlesyndication') ||
    normalizedStack.includes('chrome-extension') ||
    normalizedStack.includes('moz-extension') ||
    normalizedStack.includes('safari-extension')
  ) {
    return;
  }

  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    message,
    name,
    stack,
    context,
  };

  // Log to console (simulating central service for development/demonstration)
  console.warn('[GlobalErrorTracker]', JSON.stringify(errorDetails, null, 2));

  // If in a browser environment, safely send to our global error tracking endpoint with comprehensive boundary
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    try {
      // Don't attempt outbound network tracking when clearly offline
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return;
      }

      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;

      window.fetch('/api/track-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorDetails),
        signal: controller ? controller.signal : undefined,
        keepalive: true
      })
      .catch(() => {
        // Prevent unhandled promise rejection or loop if error endpoint is unreachable
      })
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });
    } catch {
      // Defensive boundary: never let error tracking itself throw or interrupt application flow
    }
  }
};
