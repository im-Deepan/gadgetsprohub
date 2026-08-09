/**
 * Centralized Configuration for GadgetsProHub Chrome Extension
 */

import { ENVIRONMENTS, DEFAULT_ENVIRONMENT } from "./environments";

export const CONFIG = {
  // Default development environment endpoint (can be overridden by Chrome storage)
  API_BASE_URL: ENVIRONMENTS[DEFAULT_ENVIRONMENT].apiBaseUrl,
  
  // Storage Keys
  STORAGE_KEYS: {
    SETTINGS: "gph_settings",
    AUTH_TOKEN: "gph_auth_token",
    LAST_IMPORTED_ASIN: "lastImportedAsin",
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
