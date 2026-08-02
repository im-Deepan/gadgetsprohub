const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/pendingEmailTokenExpires: \{ type: Date, default: null \},/g, 
  "pendingEmailTokenExpires: { type: Date, default: null },\n  resetPasswordToken: { type: String, default: null },\n  resetPasswordExpiresAt: { type: Date, default: null },");
fs.writeFileSync('server.ts', code);
