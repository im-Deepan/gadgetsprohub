const fs = require('fs');
let code = fs.readFileSync('src/services/MarketplaceService.ts', 'utf8');
code = code.replace(/const hiResMatches = \[\.\.\.html\.matchAll\(\/\["'\]hiRes\["'\]\\s\*:\\s\*\["'\]\(\[\^"'\]\+\)\["'\]\/gi\)\];/g, 
  "let hiResMatches = []; let m1; const re1 = /[\"']hiRes[\"']\\s*:\\s*[\"']([^\"']+)[\"']/gi; while ((m1 = re1.exec(html)) !== null) { hiResMatches.push(m1); }");
code = code.replace(/const largeMatches = \[\.\.\.html\.matchAll\(\/\["'\]large\["'\]\\s\*:\\s\*\["'\]\(\[\^"'\]\+\)\["'\]\/gi\)\];/g, 
  "let largeMatches = []; let m2; const re2 = /[\"']large[\"']\\s*:\\s*[\"']([^\"']+)[\"']/gi; while ((m2 = re2.exec(html)) !== null) { largeMatches.push(m2); }");
code = code.replace(/<span\[\^>\]\*>([^<]\+)<\/span>\/is/g, '<span[^>]*>([^<]+)<\\/span>/i');
fs.writeFileSync('src/services/MarketplaceService.ts', code);
