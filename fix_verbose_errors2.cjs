const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/res\.status\(500\)\.json\(\{ success: false, error: err(or)?\.message( \|\| '[^']+')? \}\)/g, "res.status(500).json({ success: false, error: 'An internal error occurred.' })");

fs.writeFileSync('server.ts', code);
console.log('Fixed remaining verbose error messages');
