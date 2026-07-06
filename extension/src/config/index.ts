/**
 * Centralized Configuration for GadgetsProHub Chrome Extension
 */

export const CONFIG = {
  // Default development environment endpoint (can be overridden by Chrome storage)
  API_BASE_URL: "https://ais-dev-qsss35leqdsbti2ibtyylr-247249937666.asia-east1.run.app",
  
  // Storage Keys
  STORAGE_KEYS: {
    AUTH_TOKEN: "authToken",
    ADMIN_EMAIL: "adminEmail",
    LAST_IMPORTED_ASIN: "lastImportedAsin",
    CUSTOM_API_URL: "customApiUrl",
  },

  // Extension default settings
  SUPPORTED_AMAZON_DOMAINS: [
    "amazon.com",
    "amazon.in",
    "amazon.co.uk",
    "amazon.ca"
  ],

  // UI / UX constants
  POPUP_WIDTH: 360,
  POPUP_MIN_HEIGHT: 420
};
