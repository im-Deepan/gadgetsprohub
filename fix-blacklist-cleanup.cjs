const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const isTokenLocalBlacklisted = \(token: string\): boolean => \{/,
  `setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of localBlacklistedTokens.entries()) {
    if (now > expiresAt) {
      localBlacklistedTokens.delete(token);
    }
  }
}, 60 * 60 * 1000);

const isTokenLocalBlacklisted = (token: string): boolean => {`
);

fs.writeFileSync('server.ts', code);
