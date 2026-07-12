const fs = require('fs');
let code = fs.readFileSync('extension/src/background/router.ts', 'utf8');

// Insert import
code = code.replace("import { apiService } from '../services/api';", "import { apiService } from '../services/api';\nimport { queueManager } from './queueManager';");

// Insert new cases
const newCases = `
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
`;

const insertPoint = code.indexOf('default:');
code = code.slice(0, insertPoint) + newCases + code.slice(insertPoint);

fs.writeFileSync('extension/src/background/router.ts', code);
console.log('Updated router.ts');
