/**
 * GadgetsProHub Chrome Extension Content Script
 * 
 * Runs in the context of Amazon product pages.
 * Responsible ONLY for reading the DOM, extracting structural HTML fields,
 * and communicating that raw payload back to the background worker.
 */

import { AmazonParser } from './parser';
import { ExtensionMessage, ExtensionResponse } from '../types';


console.log("[GadgetsProHub Importer] Content Script initialized successfully.");

// Listens for structural inquiry or extraction requests from the background or popup scripts
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: ExtensionResponse) => void) => {
  const { action } = message;

  if (action === "PING_CONTENT_SCRIPT") {
    sendResponse({ 
      success: true,
      data: {
        status: "ALIVE", 
        url: window.location.href,
        title: document.title,
        isAmazon: /amazon\.(com|in|co\.uk|ca)$/.test(window.location.hostname) || window.location.hostname.includes("amazon")
      }
    });
  } else if (action === "SCRAPE_AMAZON_PRODUCT") {
    AmazonParser.parse().then(result => {
       if (result.isValidPage && result.data && result.errors.length === 0) {
         sendResponse({
           success: true,
           data: result.data
         });
       } else {
         sendResponse({
           success: false,
           error: {
             code: result.isValidPage ? 'SCRAPE_VALIDATION_FAILED' : 'INVALID_PAGE',
             message: result.errors.join(' | ') || 'Extraction failed',
             details: result
           }
         });
       }
    }).catch(err => {
      sendResponse({
        success: false,
        error: {
          code: 'SCRAPE_EXCEPTION',
          message: err.message || 'An error occurred during Amazon DOM scraping'
        }
      });
    });
  } else if (action === "TEST_PARSER") {
    AmazonParser.parse().then(result => {
      sendResponse({ success: true, data: result });
    }).catch(err => {
      sendResponse({ success: false, error: { code: 'TEST_ERR', message: err.message } });
    });
  }
  return true; // Keeps the messaging channel open for asynchronous responses
});

