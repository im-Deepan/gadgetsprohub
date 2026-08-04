const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  /return generatedFallbackSecret \|\| 'fallback-gadgetsprohub-crypto-secret-key-32bytes-hex-99201';/,
  "if (!generatedFallbackSecret) throw new Error('Failed to generate JWT secret'); return generatedFallbackSecret;"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed JWT hardcoded secret');
