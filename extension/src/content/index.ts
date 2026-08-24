/**
 * GadgetsProHub Chrome Extension Content Script
 * 
 * Runs in the context of Amazon product pages.
 * Responsible ONLY for reading the DOM, extracting structural HTML fields,
 * and communicating that raw payload back to the background worker.
 */

import { AmazonParser } from './parser';
import { ProductValidator } from './parser/ProductValidator';
import { ExtensionMessage, ExtensionResponse } from '../types';


console.log("[GadgetsProHub Importer] Content Script initialized successfully.");

// Helper function to capture DOM debug snapshot for Amazon product pages
function captureDomDebugSnapshot() {
  const containerIds = [
    '#titleSection',
    '#productTitle',
    '#centerCol',
    '#buybox',
    '#corePriceDisplay_desktop_feature_div',
    '#corePrice_desktop',
    '#apex_desktop',
    '#dp-container'
  ];

  const domSnapshot: Record<string, { exists: boolean; htmlLength: number; snippet: string }> = {};

  for (const id of containerIds) {
    const el = document.querySelector(id);
    if (el) {
      const outerHtml = el.outerHTML || '';
      domSnapshot[id] = {
        exists: true,
        htmlLength: outerHtml.length,
        snippet: outerHtml.slice(0, 300).replace(/\s+/g, ' ')
      };
    } else {
      domSnapshot[id] = { exists: false, htmlLength: 0, snippet: '' };
    }
  }

  console.debug('[GadgetsProHub Debug] DOM Container Snapshot:', {
    url: window.location.href,
    title: document.title,
    containers: domSnapshot
  });

  return domSnapshot;
}

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
        isAmazon: /(^|\.)(amazon\.[a-z\.]+|amzn\.[a-z]+|a\.co|link\.amazon)$/i.test(window.location.hostname)
      }
    });
    return false;
  } else if (action === "SCRAPE_AMAZON_PRODUCT") {
    console.log("[GadgetsProHub Importer] Starting SCRAPE_AMAZON_PRODUCT extraction...");
    const debugSnapshot = captureDomDebugSnapshot();

    AmazonParser.parse().then(result => {
      console.log("[GadgetsProHub Importer] Extraction result:", result);
       if (result.isValidPage && result.data && result.errors.length === 0) {
         // Final Schema Validation Safety Check to prevent mangled data submission
         const schemaValidation = ProductValidator.validate(result.data);
         if (schemaValidation.errors.length > 0) {
           console.warn("[GadgetsProHub Importer] Schema validation failed:", schemaValidation.errors);
           sendResponse({
             success: false,
             error: {
               code: 'SCRAPE_VALIDATION_FAILED',
               message: `Product data failed schema validation: ${schemaValidation.errors.join(' | ')}`,
               details: { schemaErrors: schemaValidation.errors, result, debugSnapshot }
             }
           });
           return;
         }

         sendResponse({
           success: true,
           data: result.data
         });
       } else {
         console.warn("[GadgetsProHub Importer] Scrape validation or page invalid:", result.errors);
         sendResponse({
           success: false,
           error: {
             code: result.isValidPage ? 'SCRAPE_VALIDATION_FAILED' : 'INVALID_PAGE',
             message: result.errors.join(' | ') || 'Extraction failed',
             details: { ...result, debugSnapshot }
           }
         });
       }
    }).catch(err => {
      console.error("[GadgetsProHub Importer] Scrape exception:", err);
      sendResponse({
        success: false,
        error: {
          code: 'SCRAPE_EXCEPTION',
          message: err.message || 'An error occurred during Amazon DOM scraping'
        }
      });
    });
    return true;
  } else if (action === "TEST_PARSER") {
    console.log("[GadgetsProHub Importer] Running TEST_PARSER...");
    const debugSnapshot = captureDomDebugSnapshot();
    AmazonParser.parse().then(result => {
      sendResponse({ success: true, data: { ...result, debugSnapshot } });
    }).catch(err => {
      sendResponse({ success: false, error: { code: 'TEST_ERR', message: err.message } });
    });
    return true;
  } else {
    sendResponse({ success: false, error: { code: 'UNRECOGNIZED_ACTION', message: `Unrecognized action: ${action}` } });
    return false;
  }
});

