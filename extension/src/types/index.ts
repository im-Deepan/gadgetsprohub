/**
 * Unified Type Definitions for GadgetsProHub Chrome Extension
 */

export interface ProductPayload {
  name: string;
  brand: string;
  asin: string;
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
  environment: 'Development' | 'Staging' | 'Production' | 'Custom';
  debugMode: boolean;
  version: string;
  features: FeatureFlags;
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
  | 'TEST_PARSER';

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
