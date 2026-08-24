import { ExtensionResponse } from '../../types';
import { logger } from '../../services/logger';

/**
 * Detects the currently active tab in the browser and pings its injected content script
 */
export function handleActiveTabInquiry(sendResponse: (response: ExtensionResponse) => void): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id || !activeTab.url) {
      sendResponse({ 
        success: false, 
        error: { code: 'NO_ACTIVE_TAB', message: "No active browser tab found" } 
      });
      return;
    }

    let isAmazonDomain = false;
    try {
      const parsedUrl = new URL(activeTab.url);
      isAmazonDomain = /(^|\.)(amazon\.[a-z\.]+|amzn\.[a-z]+|a\.co|link\.amazon)/i.test(parsedUrl.hostname);
    } catch (e) {}

    // Ping the content script in that tab to check if it's responsive
    chrome.tabs.sendMessage(activeTab.id, { action: "PING_CONTENT_SCRIPT" }, (response: any) => {
      if (chrome.runtime.lastError) {
        logger.debug('Content script not active on active tab', chrome.runtime.lastError);
        sendResponse({
          success: true,
          data: {
            tabId: activeTab.id,
            url: activeTab.url,
            title: activeTab.title || "",
            contentScriptLoaded: false,
            isAmazon: isAmazonDomain
          }
        });
        return;
      }

      sendResponse({
        success: true,
        data: {
          tabId: activeTab.id,
          url: activeTab.url,
          title: activeTab.title || "",
          contentScriptLoaded: true,
          isAmazon: response?.data?.isAmazon ?? isAmazonDomain,
          pingResponse: response?.data
        }
      });
    });
  });
}
