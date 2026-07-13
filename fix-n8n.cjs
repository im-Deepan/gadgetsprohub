const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /let isMatch = false;\n\s*if \(token && secret\) \{\n\s*const tokenBuf = Buffer\.from\(token\);\n\s*const secretBuf = Buffer\.from\(secret\);\n\s*if \(tokenBuf\.length === secretBuf\.length\) \{\n\s*isMatch = crypto\.timingSafeEqual\(tokenBuf, secretBuf\);\n\s*\} else \{\n\s*crypto\.timingSafeEqual\(tokenBuf, tokenBuf\);\n\s*\}\n\s*\}/,
  `let isMatch = false;
    if (token && secret) {
      const tokenHash = crypto.createHash('sha256').update(token).digest();
      const secretHash = crypto.createHash('sha256').update(secret).digest();
      isMatch = crypto.timingSafeEqual(tokenHash, secretHash);
    }`
);

fs.writeFileSync('server.ts', code);
