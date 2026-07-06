/**
 * Environment-specific Configuration for GadgetsProHub Chrome Extension
 */

export interface EnvironmentConfig {
  name: 'Development' | 'Staging' | 'Production' | 'Custom';
  apiBaseUrl: string;
  debugMode: boolean;
}

export const ENVIRONMENTS: Record<'Development' | 'Staging' | 'Production', EnvironmentConfig> = {
  Development: {
    name: 'Development',
    apiBaseUrl: 'http://localhost:3000',
    debugMode: true,
  },
  Staging: {
    name: 'Staging',
    apiBaseUrl: 'https://ais-dev-qsss35leqdsbti2ibtyylr-247249937666.asia-east1.run.app',
    debugMode: true,
  },
  Production: {
    name: 'Production',
    apiBaseUrl: 'https://ais-pre-qsss35leqdsbti2ibtyylr-247249937666.asia-east1.run.app',
    debugMode: false,
  },
};

export const DEFAULT_ENVIRONMENT: 'Development' | 'Staging' | 'Production' = 'Staging';
export const EXTENSION_VERSION = '1.0.0';
