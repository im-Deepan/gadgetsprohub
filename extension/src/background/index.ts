/**
 * Unified Service Worker entry point for GadgetsProHub Chrome Extension.
 * Operates purely as a messaging coordinator using our centralized Message Router.
 */

import { logger } from '../services/logger';
import { routeMessage } from './router';
import { ExtensionMessage, ExtensionResponse } from '../types';
import { apiService } from '../services/api';
import { extensionStorage } from '../services/storage';
import { queueManager } from './queueManager';

logger.info("GadgetsProHub Background Service Worker started.");

/**
 * Proactively verifies any existing session token on extension startup
 */
async function restoreSessionOnStartup() {
  try {
    const token = await extensionStorage.getAuthToken();
    if (token) {
      logger.info('Authenticating existing session on startup...');
      const session = await apiService.checkSession();
      if (session.isAuthenticated && session.role === 'admin') {
        logger.info(`Session restored successfully for ${session.email} (${session.role})`);
      } else {
        logger.warn('Session is invalid or not an administrator. Cleaning up storage credentials.');
        await extensionStorage.updateSettings({
          authToken: null,
          adminEmail: null,
          tokenExpiresAt: null
        });
      }
    } else {
      logger.info('No existing auth token found on startup.');
    }
  } catch (err) {
    logger.error('Failed to restore session on startup', err);
  }
}

// Run immediately when service worker boots
restoreSessionOnStartup();
queueManager.restoreJob();

// Also register standard chrome startup event listener
chrome.runtime.onStartup.addListener(() => {
  logger.info('Chrome onStartup event fired.');
  restoreSessionOnStartup();
});

// Register our unified messaging router to process all runtime extension commands
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response: ExtensionResponse) => void
  ) => {
    return routeMessage(message, sender, sendResponse);
  }
);
