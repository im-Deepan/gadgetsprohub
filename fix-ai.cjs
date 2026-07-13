const fs = require('fs');
let code = fs.readFileSync('src/services/AiService.ts', 'utf8');

// #3 AI Provider Keys Share JWT_SECRET-Derived Encryption
code = code.replace(
  /const secret = process\.env\.JWT_SECRET \|\| 'default-secret-key';\s*this\.encryptionKey = crypto\.scryptSync\(secret, 'salt-enterprise-affiliate-ai', 32\);/,
  `const secret = process.env.AI_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-secret-key';\n    this.encryptionKey = crypto.scryptSync(secret, 'salt-enterprise-affiliate-ai', 32);`
);

// #4 MD5 Hash Used for Cache Keys
// #5 AI Cache Keys Omit systemInstruction Causing Stale Responses
code = code.replace(
  /const cacheKey = crypto\.createHash\('md5'\)\.update\(`\$\{prompt\}:\$\{provider\}:\$\{model\}`\)\.digest\('hex'\);/,
  `const cacheKey = crypto.createHash('sha256').update(\`\${prompt}:\${provider}:\${model}:\${systemInstruction || ''}\`).digest('hex');`
);

fs.writeFileSync('src/services/AiService.ts', code);
