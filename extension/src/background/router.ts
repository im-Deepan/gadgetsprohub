import { ExtensionMessage, ExtensionResponse } from '../types';
import { logger } from '../services/logger';
import { handleSessionVerification, handleSessionTokenUpdate, handleLogin, handleLogout } from './handlers/authHandler';
import { handleProductImport } from './handlers/importHandler';
import { handleActiveTabInquiry } from './handlers/productHandler';
import { handleStorageWrite, handleStorageRead } from './handlers/storageHandler';
import { apiService } from '../services/api';
import { queueManager } from './queueManager';

/**
 * Checks if the sender is an internal extension context (Popup, Options page, or Background worker).
 * Internal extension contexts do not have sender.tab attached, and sender.url starts with chrome-extension://<extension_id>/
 */
export const isInternalExtensionContext = (sender: chrome.runtime.MessageSender): boolean => {
  if (!sender || !sender.id || sender.id !== chrome.runtime.id) {
    return false;
  }
  
  // If sender.tab is undefined, it originated from extension UI or background script
  if (!sender.tab) {
    return true;
  }

  // If sender.url is provided, it must match the extension's own origin
  const extensionOrigin = chrome.runtime.getURL('');
  if (sender.url && sender.url.startsWith(extensionOrigin)) {
    return true;
  }

  return false;
};

/**
 * Checks if the sender is a legitimate content script running on an authorized store tab (e.g. Amazon).
 */
export const isAuthorizedStoreTabContext = (sender: chrome.runtime.MessageSender): boolean => {
  if (!sender || !sender.id || sender.id !== chrome.runtime.id) {
    return false;
  }

  if (!sender.tab || !sender.url) {
    return false;
  }

  try {
    const parsed = new URL(sender.url);
    return /(^|\.)(amazon\.[a-z\.]+|amzn\.[a-z]+|a\.co|link\.amazon)$/i.test(parsed.hostname);
  } catch (e) {
    return false;
  }
};

/**
 * Strict set of actions that may ONLY be called from the internal Extension UI (Popup/Options/Background).
 * Content scripts or injected scripts are strictly forbidden from invoking these.
 */
const INTERNAL_ONLY_ACTIONS = new Set<string>([
  'SET_SESSION_TOKEN',
  'STORAGE_WRITE',
  'STORAGE_READ',
  'EXECUTE_LOGIN',
  'EXECUTE_LOGOUT',
  'BULK_IMPORT_START',
  'BULK_IMPORT_PAUSE',
  'BULK_IMPORT_RESUME',
  'BULK_IMPORT_CANCEL',
  'BULK_IMPORT_STATUS',
  'GET_IMPORT_HISTORY',
  'GET_IMPORT_ANALYTICS',
  'GET_SESSION_STATUS',
  'PING_CONTENT_SCRIPT'
]);

/**
 * Universal background coordinator routing incoming chrome runtime messages
 * safely to their dedicated business handlers with multi-tiered privilege verification.
 */
export function routeMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ExtensionResponse) => void
): boolean {
  if (!message || typeof message !== 'object' || !message.action) {
    sendResponse({
      success: false,
      error: {
        code: 'INVALID_MESSAGE_STRUCTURE',
        message: 'Malformed runtime message rejected.'
      }
    });
    return false;
  }

  const { action, payload } = message;
  const isInternal = isInternalExtensionContext(sender);
  const isAuthorizedStoreTab = isAuthorizedStoreTabContext(sender);

  logger.debug(`Background router incoming action: ${action} (isInternal: ${isInternal}, isStoreTab: ${isAuthorizedStoreTab})`);

  // 1. Verify that sender is from this extension
  if (!sender.id || sender.id !== chrome.runtime.id) {
    logger.warn(`Rejected message from unauthorized extension/external ID: ${sender.id}. Action: ${action}`);
    sendResponse({
      success: false,
      error: {
        code: 'UNAUTHORIZED_SENDER_ID',
        message: 'Access denied: Sender ID does not match extension ID.'
      }
    });
    return false;
  }

  // 2. Block content scripts from executing privileged internal-only commands
  if (INTERNAL_ONLY_ACTIONS.has(action)) {
    if (!isInternal) {
      logger.warn(`Security Violation: Content script from ${sender.url || 'unknown'} attempted to invoke privileged internal action '${action}'`, {
        senderUrl: sender.url,
        tabId: sender.tab?.id,
        action
      });
      sendResponse({
        success: false,
        error: {
          code: 'UNAUTHORIZED_PRIVILEGE_LEVEL',
          message: `Access denied: Action '${action}' is restricted to internal extension UI contexts.`
        }
      });
      return false;
    }
  }

  // 3. For store tab content script actions, ensure tab is on an authorized domain
  if (!isInternal && !isAuthorizedStoreTab) {
    logger.warn(`Rejected message from unauthorized origin: ${sender.url}. Action: ${action}`);
    sendResponse({
      success: false,
      error: {
        code: 'UNAUTHORIZED_TAB_ORIGIN',
        message: 'Access denied: Content script is not running on an authorized store domain.'
      }
    });
    return false;
  }

  switch (action) {
    case 'PING_CONTENT_SCRIPT':
      handleActiveTabInquiry(sendResponse);
      return true; // Async handling is internal to handleActiveTabInquiry

    case 'EXECUTE_PRODUCT_IMPORT':
      handleProductImport(payload)
        .then(response => sendResponse(response))
        .catch(err => {
          logger.error(`Router error during product import handling:`, err);
          sendResponse({
            success: false,
            error: {
              code: 'ROUTER_IMPORT_FAILED',
              message: err.message || 'Product import handler failed.'
            }
          });
        });
      return true; // Keep the runtime messaging port open asynchronously

    case 'GET_SESSION_STATUS':
      handleSessionVerification()
        .then(response => sendResponse(response))
        .catch(err => {
          logger.error(`Router error during session status validation:`, err);
          sendResponse({
            success: false,
            error: {
              code: 'ROUTER_SESSION_CHECK_FAILED',
              message: err.message || 'Session verification handler failed.'
            }
          });
        });
      return true;

    case 'SET_SESSION_TOKEN':
      handleSessionTokenUpdate(payload)
        .then(response => sendResponse(response))
        .catch(err => {
          logger.error(`Router error during session token modification:`, err);
          sendResponse({
            success: false,
            error: {
              code: 'ROUTER_TOKEN_SET_FAILED',
              message: err.message || 'Token update handler failed.'
            }
          });
        });
      return true;

    case 'EXECUTE_LOGIN':
      handleLogin(payload)
        .then(response => sendResponse(response))
        .catch(err => {
          logger.error(`Router error during login flow:`, err);
          sendResponse({
            success: false,
            error: {
              code: 'ROUTER_LOGIN_FAILED',
              message: err.message || 'Login flow handler failed.'
            }
          });
        });
      return true;

    case 'EXECUTE_LOGOUT':
      handleLogout()
        .then(response => sendResponse(response))
        .catch(err => {
          logger.error(`Router error during logout flow:`, err);
          sendResponse({
            success: false,
            error: {
              code: 'ROUTER_LOGOUT_FAILED',
              message: err.message || 'Logout flow handler failed.'
            }
          });
        });
      return true;

    case 'CHECK_DUPLICATE_PRODUCT':
      apiService.checkDuplicate(payload)
        .then(res => sendResponse({ success: true, data: res }))
        .catch(err => {
          logger.error('Error checking duplicate in router:', err);
          sendResponse({ success: false, error: { code: 'CHECK_DUPLICATE_FAILED', message: err.message } });
        });
      return true;

    case 'GET_IMPORT_HISTORY':
      apiService.getImportHistory(payload)
        .then(res => sendResponse({ success: true, data: res }))
        .catch(err => {
          logger.error('Error fetching import history in router:', err);
          sendResponse({ success: false, error: { code: 'GET_HISTORY_FAILED', message: err.message } });
        });
      return true;

    case 'GET_IMPORT_ANALYTICS':
      apiService.getImportAnalytics()
        .then(res => sendResponse({ success: true, data: res }))
        .catch(err => {
          logger.error('Error fetching import analytics in router:', err);
          sendResponse({ success: false, error: { code: 'GET_ANALYTICS_FAILED', message: err.message } });
        });
      return true;

    case 'BULK_IMPORT_START':
      queueManager.startJob(payload.jobId, payload.items, payload.concurrency, payload.maxRetries, payload.conflictStrategy, payload.options)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    case 'BULK_IMPORT_PAUSE':
      queueManager.pauseJob()
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    case 'BULK_IMPORT_RESUME':
      queueManager.resumeJob()
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    case 'BULK_IMPORT_CANCEL':
      queueManager.cancelJob()
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    case 'BULK_IMPORT_STATUS':
      chrome.storage.local.get('currentBulkJob').then((data) => {
        sendResponse({ success: true, data: data.currentBulkJob });
      });
      return true;
    case 'STORAGE_WRITE':
      handleStorageWrite(payload)
        .then(response => sendResponse(response))
        .catch(err => {
          logger.error(`Router error during storage write:`, err);
          sendResponse({
            success: false,
            error: {
              code: 'ROUTER_STORAGE_WRITE_FAILED',
              message: err.message || 'Storage write failed.'
            }
          });
        });
      return true;
    case 'STORAGE_READ':
      handleStorageRead(payload && typeof payload === 'object' ? payload.key : payload)
        .then(response => sendResponse(response))
        .catch(err => {
          logger.error(`Router error during storage read:`, err);
          sendResponse({
            success: false,
            error: {
              code: 'ROUTER_STORAGE_READ_FAILED',
              message: err.message || 'Storage read failed.'
            }
          });
        });
      return true;
    default:
      logger.warn(`Unregistered action encountered in router: ${action}`);
      sendResponse({
        success: false,
        error: {
          code: 'UNSUPPORTED_ACTION',
          message: `The action '${action}' is not supported by GadgetsProHub background coordinator.`
        }
      });
      return false;
  }
}
