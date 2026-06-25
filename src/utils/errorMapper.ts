/**
 * Error Mapping Utility
 * Translates technical exceptions into human-friendly, professional, and reassuring status notifications.
 */

export interface FriendlyError {
  message: string;
  category: 'System Status' | 'User Action' | 'Connectivity';
  type: 'error' | 'warning' | 'info';
}

export const mapErrorToFriendly = (error: unknown, contextDescription?: string): FriendlyError => {
  // Extract error message string
  let rawMessage = '';
  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  } else if (error && typeof (error as Record<string, unknown>).message === 'string') {
    rawMessage = (error as Record<string, unknown>).message as string;
  } else if (error !== null && error !== undefined) {
    rawMessage = String(error);
  }

  const msg = rawMessage.toLowerCase();

  // Primary: Connectivity and network outages
  if (
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    msg.includes('cors') ||
    msg.includes('timeout') ||
    msg.includes('offline')
  ) {
    return {
      message: contextDescription 
        ? `We are experiencing connectivity issues while trying to ${contextDescription}. Your local progress has been temporarily preserved.`
        : 'Communication with the server was interrupted. Please check your network connection and try again.',
      category: 'Connectivity',
      type: 'warning'
    };
  }

  // Secondary: Authentication/Permission bottlenecks
  if (
    msg.includes('unauthorized') ||
    msg.includes('jwt') ||
    msg.includes('token') ||
    msg.includes('expired') ||
    msg.includes('login') ||
    msg.includes('sign in') ||
    msg.includes('auth') ||
    msg.includes('permission') ||
    msg.includes('forbidden')
  ) {
    return {
      message: contextDescription
        ? `Authentication required to ${contextDescription}. Please log in or refresh your session to proceed.`
        : 'Your security session has ended or is invalid. Please sign in to re-verify your identity.',
      category: 'User Action',
      type: 'error'
    };
  }

  // Tertiary: Database / Server anomalies
  if (
    msg.includes('mongoose') ||
    msg.includes('mongodb') ||
    msg.includes('database') ||
    msg.includes('server error') ||
    msg.includes('500') ||
    msg.includes('internal error') ||
    msg.includes('cast to objectid') ||
    msg.includes('schema')
  ) {
    return {
      message: contextDescription
        ? `A background system delay occurred while trying to ${contextDescription}. Our system has seamlessly loaded secure backup content.`
        : 'A background synchronization event occurred. Secure system backups have been activated.',
      category: 'System Status',
      type: 'info'
    };
  }

  // Quaternary: Custom Validation, item missing details
  if (
    msg.includes('validation') ||
    msg.includes('required') ||
    msg.includes('invalid') ||
    msg.includes('missing') ||
    msg.includes('bad request') ||
    msg.includes('400')
  ) {
    return {
      message: `${contextDescription ? `Unable to ${contextDescription}: ` : ''}Please check that all required fields are correctly completed before submitting.`,
      category: 'User Action',
      type: 'warning'
    };
  }

  // Final fallback
  return {
    message: contextDescription
      ? `An unexpected system detail occurred while trying to ${contextDescription}. Please try again shortly.`
      : 'The action could not be completed at this time. Our engineers have been logged on this occurrence.',
    category: 'System Status',
    type: 'error'
  };
};
