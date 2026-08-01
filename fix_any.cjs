const fs = require('fs');

let code = fs.readFileSync('src/services/MarketplaceService.ts', 'utf8');
code = code.replace(/matches\.forEach\(m =>/g, 'matches.forEach((m: any) =>');
code = code.replace(/analytics\.find\(a =>/g, 'analytics.find((a: any) =>');
code = code.replace(/healthStatus\.find\(h =>/g, 'healthStatus.find((h: any) =>');
fs.writeFileSync('src/services/MarketplaceService.ts', code);

let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(/settings\.map\(s =>/g, 'settings.map((s: any) =>');
fs.writeFileSync('server.ts', serverCode);

