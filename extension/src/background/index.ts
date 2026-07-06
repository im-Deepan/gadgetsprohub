/**
 * Unified Service Worker entry point for GadgetsProHub Chrome Extension.
 * Operates purely as a messaging coordinator using our centralized Message Router.
 */

import { logger } from '../services/logger';
import { routeMessage } from './router';
import { ExtensionMessage, ExtensionResponse } from '../types';

logger.info("GadgetsProHub Background Service Worker started.");

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
