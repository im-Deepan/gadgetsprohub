const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /if \(role !== 'user' && role !== 'admin'\) \{/,
  `if (typeof role !== 'string' || (role !== 'user' && role !== 'admin')) {`
);

fs.writeFileSync('server.ts', code);
