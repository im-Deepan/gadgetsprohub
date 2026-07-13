const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const publisherId = process\.env\.ADSENSE_CLIENT_ID \|\| 'ca-pub-0000000000000000';/,
  `const publisherId = process.env.ADSENSE_CLIENT_ID;
    if (!publisherId) return res.status(404).send('Not configured');`
);

fs.writeFileSync('server.ts', code);
