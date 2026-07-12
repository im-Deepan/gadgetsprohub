const fs = require('fs');
let code = fs.readFileSync('extension/src/popup/components/BulkImportTab.tsx', 'utf8');

const oldParse = `    // Parse
    const items = rawItems.map(raw => {
      // Very basic URL extraction, otherwise assume ASIN
      if (raw.includes('amazon.')) {
        return { url: raw };
      }
      return { asin: raw };
    });`;

const newParse = `    // Parse and Validate
    const items = [];
    const seen = new Set();
    const asinRegex = /^[A-Z0-9]{10}$/;
    let errors = 0;

    for (let raw of rawItems) {
      let asin = '';
      let url = '';
      
      if (raw.includes('amazon.')) {
        url = raw;
        const match = url.match(/\\/([A-Z0-9]{10})(?:[/?]|$)/);
        if (match) asin = match[1];
      } else {
        asin = raw.toUpperCase();
      }

      if (!asin || !asinRegex.test(asin)) {
        errors++;
        continue; // skip invalid
      }

      if (seen.has(asin)) continue; // duplicate row
      seen.add(asin);

      items.push({ asin, url: url || '' });
    }
    
    if (items.length === 0) return alert("No valid ASINs found.");
    if (errors > 0) alert(\`Skipped \${errors} invalid or malformed items.\`);`;

code = code.replace(oldParse, newParse);
fs.writeFileSync('extension/src/popup/components/BulkImportTab.tsx', code);
console.log('Added validation');
