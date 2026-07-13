const fs = require('fs');
let code = fs.readFileSync('src/services/SyncService.ts', 'utf8');

// Replace the dice logic
code = code.replace(/const dice = [\s\S]*?\} else if \(dice > 0\.75\) \{[\s\S]*?\}/, `// Random price simulation removed to prevent catalog corruption.
      // In a real environment, we would fetch actual API data here.`);
fs.writeFileSync('src/services/SyncService.ts', code);
