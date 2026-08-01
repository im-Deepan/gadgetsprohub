const fs = require('fs');
let code = fs.readFileSync('src/services/MarketplaceService.ts', 'utf8');
code = code.replace(/\[\.\.\.html\.matchAll\(\/\["'\\]hiRes\["'\\]\\s\*:\\s\*\["'\\]\(\[\^"'\\]\+\)\["'\\]\/gi\)\\]/g, 'Array.from(html.matchAll(/["\']hiRes["\']\\s*:\\s*["\']([^"\']+)["\']/gi))');
code = code.replace(/\[\.\.\.html\.matchAll\(\/\["'\\]large\["'\\]\\s\*:\\s\*\["'\\]\(\[\^"'\\]\+\)\["'\\]\/gi\)\\]/g, 'Array.from(html.matchAll(/["\']large["\']\\s*:\\s*["\']([^"\']+)["\']/gi))');
code = code.replace(/<span\[\^>\]\*>([^<]\+)<\/span>\/is/g, '<span[^>]*>([^<]+)<\\/span>/i'); // removing s flag, it's just a fallback anyway
fs.writeFileSync('src/services/MarketplaceService.ts', code);
