export interface ErrorContext {
  [key: string]: any;
}

export const captureError = (error: Error | unknown, context?: ErrorContext) => {
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  };

  // Log to console (simulating central service for development/demonstration)
  console.error('[GlobalErrorTracker]', JSON.stringify(errorDetails, null, 2));

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
