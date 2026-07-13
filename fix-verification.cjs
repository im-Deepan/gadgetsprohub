const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add to schema
code = code.replace(
  /verificationToken: \{ type: String, default: null \},/,
  `verificationToken: { type: String, default: null },\n  verificationExpiresAt: { type: Date, default: null },`
);

// Set expiry in Mongo DB user creation
code = code.replace(
  /verificationToken\n\s*\}\);/,
  `verificationToken,\n          verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)\n        });`
);

// Set expiry in Local users creation
code = code.replace(
  /verificationToken\n\s*\};\n\s*localUsers\.push\(newUser\);/,
  `verificationToken,\n          verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)\n        };\n        localUsers.push(newUser);`
);

// Add to verify route - Mongo
code = code.replace(
  /const user = await User\.findOne\(\{ verificationToken: token \}\);\n\s*if \(\!user\) \{/,
  `const user = await User.findOne({ verificationToken: token });
        if (!user || (user.verificationExpiresAt && user.verificationExpiresAt < new Date())) {`
);

// Add to verify route - Local
code = code.replace(
  /const user = localUsers\.find\(u => u\.verificationToken === token\);\n\s*if \(\!user\) \{/,
  `const user = localUsers.find(u => u.verificationToken === token);
        if (!user || (user.verificationExpiresAt && new Date(user.verificationExpiresAt) < new Date())) {`
);

// Reset expiry on login resend (Mongo)
code = code.replace(
  /user\.verificationToken = crypto\.randomBytes\(32\)\.toString\('hex'\);\n\s*await user\.save\(\)\.catch\(e => console\.warn\(e\)\);/,
  `user.verificationToken = crypto.randomBytes(32).toString('hex');
            user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await user.save().catch(e => console.warn(e));`
);

// Reset expiry on login resend (Local)
code = code.replace(
  /user\.verificationToken = crypto\.randomBytes\(32\)\.toString\('hex'\);\n\s*saveLocalUsers\(\);/,
  `user.verificationToken = crypto.randomBytes(32).toString('hex');
            user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            saveLocalUsers();`
);

fs.writeFileSync('server.ts', code);
