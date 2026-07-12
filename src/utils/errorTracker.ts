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
    message = String(error);
  }

  const normalizedMessage = message.toLowerCase();
  const normalizedName = name.toLowerCase();
  const normalizedStack = (stack || '').toLowerCase();

  // Suppress expected/normal request cancellation, abort error, and third-party iframe sandbox noise (such as Google AdSense/adtrafficquality)
  if (
    normalizedName === 'aborterror' ||
    normalizedName === 'abort' ||
    normalizedMessage === 'canceled' ||
    normalizedMessage === 'undefined' ||
    normalizedMessage === 'null' ||
    normalizedMessage === 'error' ||
    normalizedMessage === '[object promise]' ||
    normalizedMessage.includes('abort') ||
    normalizedMessage.includes('canceled') ||
    normalizedMessage.includes('cancelled') ||
    normalizedMessage.includes('aborted') ||
    normalizedMessage === 'query was cancelled by user' ||
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('networkerror') ||
    normalizedMessage.includes('network error') ||
    normalizedMessage.includes('load failed') ||
    normalizedMessage.includes('connection lost') ||
    normalizedMessage.includes('connection closed') ||
    normalizedMessage.includes('connection reset') ||
    normalizedMessage.includes('timed out') ||
    normalizedMessage.includes('timeout') ||
    normalizedMessage.includes('offline mode') ||
    normalizedMessage.includes('extension') ||
    normalizedMessage.includes('chrome-extension') ||
    normalizedMessage.includes('safari-extension') ||
    normalizedMessage.includes('moz-extension') ||
    normalizedMessage.includes('content-script') ||
    normalizedMessage.includes('inject') ||
    normalizedMessage.includes('clipboard') ||
    normalizedMessage.includes('writetext') ||
    normalizedMessage.includes('share') ||
    normalizedMessage.includes('permission') ||
    normalizedMessage.includes('sandbox') ||
    normalizedMessage.includes('cross-origin') ||
    message === '' ||
    message === 'Error' ||
    message === '[object Object]' ||
    // Third-party AdSense / Doubleclick / Google adtrafficquality sandbox noise
    normalizedMessage.includes('adsbygoogle') ||
    normalizedMessage.includes('adsense') ||
    normalizedMessage.includes('google adsense') ||
    normalizedMessage.includes('failed to load google adsense script') ||
    normalizedMessage.includes('script error') ||
    normalizedMessage.includes('failed to load') ||
    normalizedMessage.includes('script load') ||
    normalizedMessage.includes('googlesyndication') ||
    normalizedMessage.includes('doubleclick') ||
    normalizedMessage.includes('adtrafficquality') ||
    normalizedMessage.includes('pagead') ||
    normalizedMessage.includes('google-analytics') ||
    normalizedMessage.includes('postmessage') ||
    normalizedMessage.includes('cross-origin') ||
    normalizedMessage.includes('window.closed') ||
    normalizedMessage.includes('coop') ||
    normalizedStack.includes('adsbygoogle') ||
    normalizedStack.includes('adsense') ||
    normalizedStack.includes('googlesyndication') ||
    normalizedStack.includes('doubleclick') ||
    normalizedStack.includes('adtrafficquality') ||
    normalizedStack.includes('pagead') ||
    normalizedStack.includes('google-analytics') ||
    normalizedStack.includes('postmessage') ||
    normalizedStack.includes('cross-origin') ||
    normalizedStack.includes('extension') ||
    normalizedStack.includes('chrome-extension') ||
    normalizedStack.includes('safari-extension') ||
    normalizedStack.includes('moz-extension') ||
    normalizedStack.includes('webkit-masked-url') ||
    normalizedStack.includes('content-script') ||
    normalizedStack.includes('inject')
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
