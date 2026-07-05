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

  // Suppress expected/normal request cancellation and abort error noise
  if (
    normalizedName === 'aborterror' ||
    normalizedName === 'abort' ||
    normalizedMessage === 'canceled' ||
    normalizedMessage.includes('abort') ||
    normalizedMessage.includes('canceled') ||
    normalizedMessage.includes('cancelled') ||
    normalizedMessage.includes('aborted') ||
    normalizedMessage === 'query was cancelled by user' ||
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('networkerror') ||
    normalizedMessage.includes('network error')
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
