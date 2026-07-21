/**
 * Secure wrapper around chrome.storage APIs.
 * Ensures consistent serialization, standard fallbacks, and typed key management.
 * Sensitive tokens are stored in memory-only session storage.
 */

import { ENVIRONMENTS, DEFAULT_ENVIRONMENT, EXTENSION_VERSION } from '../config/environments';
import { ExtensionSettings } from '../types';
import { logger } from './logger';

const SETTINGS_KEY = 'gph_settings';
const AUTH_TOKEN_KEY = 'gph_auth_token';

class StorageService {
  /**
   * Write data to chrome storage.
   */
  public async set(key: string, value: any): Promise<void> {
    let finalValue = value;
    let authTokenToSave = null;

    if (key === SETTINGS_KEY && value && typeof value === 'object') {
      finalValue = { ...value };
      if ('authToken' in finalValue) {
        authTokenToSave = finalValue.authToken;
        finalValue.authToken = null; // Never persist tokens to local disk
      }
    }

    const localPromise = new Promise<void>((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [key]: finalValue }, () => {
          if (chrome.runtime.lastError) {
            logger.error(`Storage write failed for key: ${key}`, chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } else {
        try {
          localStorage.setItem(key, JSON.stringify(finalValue));
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    });

    const sessionPromises: Promise<void>[] = [];
    if (key === SETTINGS_KEY && authTokenToSave !== null) {
      sessionPromises.push(
        new Promise<void>((resolve) => {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
            chrome.storage.session.set({ [AUTH_TOKEN_KEY]: authTokenToSave }, () => resolve());
          } else {
            try {
              if (authTokenToSave) {
                sessionStorage.setItem(AUTH_TOKEN_KEY, authTokenToSave);
              } else {
                sessionStorage.removeItem(AUTH_TOKEN_KEY);
              }
            } catch (e) { /* ignore fallback errors */ }
            resolve();
          }
        })
      );
    }

    await Promise.all([localPromise, ...sessionPromises]);
  }

  /**
   * Retrieve data from chrome storage.
   */
  public async get<T = any>(key: string, defaultValue: T | null = null): Promise<T | null> {
    const localVal = await new Promise<any>((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([key], (result: any) => {
          if (chrome.runtime.lastError) {
            logger.warn(`Storage read failed for key: ${key}. Returning default.`, chrome.runtime.lastError);
            resolve(defaultValue);
          } else {
            resolve(result[key] !== undefined ? result[key] : defaultValue);
          }
        });
      } else {
        const item = localStorage.getItem(key);
        if (item === null) resolve(defaultValue);
        else {
          try {
            resolve(JSON.parse(item));
          } catch {
            resolve(item);
          }
        }
      }
    });

    if (key === SETTINGS_KEY && localVal && typeof localVal === 'object') {
      const mergedVal = { ...localVal };
      mergedVal.authToken = await new Promise<string | null>((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
          chrome.storage.session.get([AUTH_TOKEN_KEY], (result) => {
            resolve((result[AUTH_TOKEN_KEY] as string) || null);
          });
        } else {
          try {
            resolve(sessionStorage.getItem(AUTH_TOKEN_KEY) || null);
          } catch {
            resolve(null);
          }
        }
      });
      return mergedVal as unknown as T;
    }

    return localVal as T;
  }

  /**
   * Delete data from chrome storage.
   */
  public async remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove([key], () => {
          if (chrome.runtime.lastError) {
            logger.error(`Storage removal failed for key: ${key}`, chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } else {
        localStorage.removeItem(key);
        resolve();
      }
    });
  }

  /**
   * Generates the default settings object
   */
  public getDefaultSettings(): ExtensionSettings {
    const envConfig = ENVIRONMENTS[DEFAULT_ENVIRONMENT];
    return {
      apiBaseUrl: envConfig.apiBaseUrl,
      authToken: null,
      adminEmail: null,
      tokenExpiresAt: null,
      environment: DEFAULT_ENVIRONMENT,
      debugMode: envConfig.debugMode,
      version: EXTENSION_VERSION,
      popupWidth: 360,
      popupHeight: 420,
      affiliateTag: 'gadgetspro-20',
      supportedDomains: ['amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.ca'],
      features: {
        enableDeveloperMode: false,
        enableHealthCheck: true,
        enableModularParser: true,
        showExtractionPreview: true,
        enableParserLogs: false
      }
    };
  }

  /**
   * Retrieve the complete, unified settings object
   */
  public async getSettings(): Promise<ExtensionSettings> {
    const defaults = this.getDefaultSettings();
    let settings = await this.get<ExtensionSettings>(SETTINGS_KEY);

    if (!settings) {
      // Perform legacy key check & migration
      const legacyToken = await this.get<string>('authToken');
      const legacyEmail = await this.get<string>('adminEmail');
      const legacyUrl = await this.get<string>('customApiUrl');

      if (legacyToken || legacyEmail || legacyUrl) {
        logger.info('Migrating legacy individual storage keys to unified settings model.');
        settings = {
          apiBaseUrl: legacyUrl || defaults.apiBaseUrl,
          authToken: legacyToken || null,
          adminEmail: legacyEmail || null,
          tokenExpiresAt: null,
          environment: legacyUrl ? 'Custom' : DEFAULT_ENVIRONMENT,
          debugMode: defaults.debugMode,
          version: EXTENSION_VERSION,
          features: defaults.features
        };
        await this.set(SETTINGS_KEY, settings);
        
        // Clean up legacy keys (removed plaintext backup)
        await this.remove('authToken');
        await this.remove('adminEmail');
        await this.remove('customApiUrl');
      } else {
        settings = defaults;
        await this.set(SETTINGS_KEY, settings);
      }
    } else {
      // Ensure the version is updated to current
      if (settings.version !== EXTENSION_VERSION || !settings.features) {
        settings.version = EXTENSION_VERSION;
        settings.features = { ...defaults.features, ...(settings.features || {}) };
        await this.set(SETTINGS_KEY, settings);
      }
    }

    return settings;
  }

  /**
   * Save/merge update to our unified settings model
   */
  public async updateSettings(updates: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    await this.set(SETTINGS_KEY, updated);
    return updated;
  }

  /**
   * Helper to fetch the current active API URL configuration
   */
  public async getApiUrl(): Promise<string> {
    const settings = await this.getSettings();
    return settings.apiBaseUrl;
  }

  /**
   * Helper to fetch active JWT Authentication Token
   */
  public async getAuthToken(): Promise<string | null> {
    const settings = await this.getSettings();
    return settings.authToken;
  }
}

export const extensionStorage = new StorageService();
