import { ExtensionMessage, ExtensionResponse } from '../types';
import { logger } from '../services/logger';
import { handleSessionVerification, handleSessionTokenUpdate, handleLogin, handleLogout } from './handlers/authHandler';
import { handleProductImport } from './handlers/importHandler';
import { handleActiveTabInquiry } from './handlers/productHandler';
import { handleStorageWrite, handleStorageRead } from './handlers/storageHandler';
import { apiService } from '../services/api';
import { queueManager } from './queueManager';

/**
 * Universal background coordinator routing incoming chrome runtime messages
 * safely to their dedicated business handlers.
 */
export function routeMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ExtensionResponse) => void
): boolean {
  const { action, payload } = message;

  logger.debug(`Background router incoming action: ${action}`);

  if (sender.tab) {
    logger.debug(`Routed message context originates from active tab: ${sender.tab.url}`);
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
