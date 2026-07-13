const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/try \{\n\s*try \{/g, 'try {');

fs.writeFileSync('server.ts', code);
