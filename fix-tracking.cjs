const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const trackingNumber = 'TRK' \+ Math\.floor\(100000000 \+ Math\.random\(\) \* 900000000\);/g,
  `const trackingNumber = 'TRK' + crypto.randomBytes(6).toString('hex').toUpperCase();`
);

fs.writeFileSync('server.ts', code);
