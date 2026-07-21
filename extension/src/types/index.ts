/**
 * Unified Type Definitions for GadgetsProHub Chrome Extension
 */

export interface ProductPayload {
  name: string;
  brand: string;
  asin: string;
  price?: number;
  currentPrice: number;
  originalPrice: number;
  discount: number;
  currency: string;
  rating: number;
  reviewCount: number;
  availability: boolean;
  description: string;
  bulletFeatures: string[];
  specifications: Record<string, string>;
  images: string[];
  productUrl: string;
  affiliateLink?: string;
  parserVersion?: string;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface StorageSchema {
  authToken: string | null;
  adminEmail: string | null;
  lastImportedAsin: string | null;
  apiBaseUrl: string;
}

export interface FeatureFlags {
  enableDeveloperMode: boolean;
  enableHealthCheck: boolean;
  enableModularParser: boolean;
  showExtractionPreview: boolean;
  enableParserLogs: boolean;
  enableTelemetry?: boolean;
}

export interface ExtensionSettings {
  apiBaseUrl: string;
  authToken: string | null;
  adminEmail: string | null;
  tokenExpiresAt: number | null; // expiration epoch timestamp in milliseconds
  environment: 'Development' | 'Staging' | 'Production' | 'Custom';
  debugMode: boolean;
  version: string;
  features: FeatureFlags;
  popupWidth?: number;
  popupHeight?: number;
  affiliateTag?: string;
  supportedDomains?: string[];
}

export interface ParserMetrics {
  extractionSuccessRate: number; // Percentage of attempted fields successfully extracted
  failedFields: string[];
}

export interface ParserResult {
  isValidPage: boolean;
  errors: string[];
  warnings: string[];
  logs: string[];
  data: Partial<ProductPayload> | null;
  durationMs: number;
  metrics?: ParserMetrics;
}


// Strictly Typed Messages for chrome.runtime Communication
export type ExtensionMessageAction =
  | 'PING_CONTENT_SCRIPT'
  | 'SCRAPE_AMAZON_PRODUCT'
  | 'EXECUTE_PRODUCT_IMPORT'
  | 'GET_SESSION_STATUS'
  | 'SET_SESSION_TOKEN'
  | 'TEST_PARSER'
  | 'EXECUTE_LOGIN'
  | 'EXECUTE_LOGOUT'
  | 'CHECK_DUPLICATE_PRODUCT'
  | 'GET_IMPORT_HISTORY'
  | 'GET_IMPORT_ANALYTICS'
  | 'BULK_IMPORT_START'
  | 'BULK_IMPORT_PAUSE'
  | 'BULK_IMPORT_RESUME'
  | 'BULK_IMPORT_CANCEL'
  | 'BULK_IMPORT_STATUS'
  | 'STORAGE_WRITE'
  | 'STORAGE_READ';

export interface ExtensionMessage<T = any> {
  action: ExtensionMessageAction;
  payload?: T;
}

export interface ExtensionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
