const fs = require('fs');
let code = fs.readFileSync('extension/src/background/index.ts', 'utf8');

code = code.replace("import { extensionStorage } from '../services/storage';", "import { extensionStorage } from '../services/storage';\nimport { queueManager } from './queueManager';");
code = code.replace("restoreSessionOnStartup();", "restoreSessionOnStartup();\nqueueManager.restoreJob();");

fs.writeFileSync('extension/src/background/index.ts', code);
console.log('Updated index.ts');
