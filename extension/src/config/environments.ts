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
    apiBaseUrl: 'https://staging.gadgetsprohub.com',
    debugMode: true,
  },
  Production: {
    name: 'Production',
    apiBaseUrl: 'https://gadgetsprohub.onrender.com',
    debugMode: false,
  },
};

export const DEFAULT_ENVIRONMENT: 'Development' | 'Staging' | 'Production' = 'Production';
export const EXTENSION_VERSION = '1.0.0';
