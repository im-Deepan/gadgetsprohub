import { ExtensionMessage, ExtensionResponse } from '../types';
import { logger } from '../services/logger';
import { handleSessionVerification, handleSessionTokenUpdate } from './handlers/authHandler';
import { handleProductImport } from './handlers/importHandler';
import { handleActiveTabInquiry } from './handlers/productHandler';

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
