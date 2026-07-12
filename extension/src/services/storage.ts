/**
 * Secure wrapper around chrome.storage.local APIs.
 * Ensures consistent serialization, standard fallbacks, and typed key management.
 */

import { ENVIRONMENTS, DEFAULT_ENVIRONMENT, EXTENSION_VERSION } from '../config/environments';
import { ExtensionSettings } from '../types';
import { logger } from './logger';

const SETTINGS_KEY = 'gph_settings';

class StorageService {
  /**
   * Write data to chrome.storage.local
   */
  public async set(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            logger.error(`Storage write failed for key: ${key}`, chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } else {
        // Fallback for non-extension environments (local preview/testing)
        try {
          localStorage.setItem(key, JSON.stringify(value));
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    });
  }

  /**
   * Retrieve data from chrome.storage.local
   */
  public async get<T = any>(key: string, defaultValue: T | null = null): Promise<T | null> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            logger.warn(`Storage read failed for key: ${key}. Returning default.`, chrome.runtime.lastError);
            resolve(defaultValue);
          } else {
            resolve(result[key] !== undefined ? result[key] : defaultValue);
          }
        });
      } else {
        // Fallback for local preview/testing
        const item = localStorage.getItem(key);
        if (item === null) {
          resolve(defaultValue);
        } else {
          try {
            resolve(JSON.parse(item) as T);
          } catch {
            resolve(item as unknown as T);
          }
        }
      }
    });
  }

  /**
   * Delete data from chrome.storage.local
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
        
        // Clean up legacy keys
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
