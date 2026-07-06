/**
 * Custom error classes for the GadgetsProHub Importer Extension.
 * Enforces standardized exception tracking across popup, content, and background.
 */

export class ExtensionError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code = 'UNKNOWN_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      }
    };
  }
}

export class NetworkError extends ExtensionError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
  }
}

export class AuthenticationError extends ExtensionError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_REQUIRED');
  }
}

export class ScrapingError extends ExtensionError {
  constructor(message: string, details?: any) {
    super(message, 'SCRAPING_FAILED', details);
  }
}

export class ValidationError extends ExtensionError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_FAILED', details);
  }
}
