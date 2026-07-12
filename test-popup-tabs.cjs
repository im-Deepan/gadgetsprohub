const fs = require('fs');
let code = fs.readFileSync('extension/src/popup/Popup.tsx', 'utf8');

code = code.replace("useState<'scraper' | 'history' | 'analytics'>('scraper')", "useState<'scraper' | 'bulk' | 'history' | 'analytics'>('scraper')");
fs.writeFileSync('extension/src/popup/Popup.tsx', code);
console.log('Updated popup tabs type');
