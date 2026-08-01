const fs = require('fs');
let code = fs.readFileSync('src/services/MarketplaceService.ts', 'utf8');
code = code.replace(/<\/span>\/is/g, '</span>/i');
fs.writeFileSync('src/services/MarketplaceService.ts', code);
