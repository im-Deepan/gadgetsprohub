const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Replace standard 500 err.message patterns
code = code.replace(/res\.status\(500\)\.json\(\{ error: err\.message( \S+ [^}]+)? \}\)/g, "res.status(500).json({ error: 'An internal error occurred.' })");

// Also replace error: error.message if it's there
code = code.replace(/res\.status\(500\)\.json\(\{ error: error\.message \}\)/g, "res.status(500).json({ error: 'An internal error occurred.' })");
code = code.replace(/res\.status\(500\)\.json\(\{ error: err \}\)/g, "res.status(500).json({ error: 'An internal error occurred.' })");

// Specific ones with || 'something failed'
code = code.replace(/res\.status\(500\)\.json\(\{ error: err(or)?\.message \|\| '([^']+)' \}\)/g, "res.status(500).json({ error: '$2' })");

// Update any others that concatenate
code = code.replace(/res\.status\(500\)\.json\(\{ error: '([^']+)' \+ err(or)?\.message \}\)/g, "res.status(500).json({ error: '$1' })");

fs.writeFileSync('server.ts', code);
console.log('Fixed verbose error messages');
