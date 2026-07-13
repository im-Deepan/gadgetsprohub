const fs = require('fs');
let code = fs.readFileSync('src/services/SyncService.ts', 'utf8');

// Remove the random simulation in SyncService.ts
code = code.replace(/const dice = [^}]+}/s, `
      // Simulation removed to prevent catalog corruption
`);
fs.writeFileSync('src/services/SyncService.ts', code);
