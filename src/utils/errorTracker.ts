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
    message === '' ||
    message === 'Error' ||
    message === '[object Object]' ||
    (normalizedContext === 'unhandled promise rejection' && (!message || message === 'Error' || message === '[object Object]')) ||
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

  // If in a browser environment, optionally send to our global error tracking endpoint
  if (typeof window !== 'undefined') {
    fetch('/api/track-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorDetails),
    }).catch(() => {
      // Prevent infinite loop if the error tracker itself fails
    });
  }
};
