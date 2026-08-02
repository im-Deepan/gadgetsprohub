const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/if \(targetUser && transporter\) \{/g, "const transporter = getMailTransport();\n      if (targetUser && transporter) {");
code = code.replace(/smtpError: smtpErrorMsg \|\| \(\!transporter \? 'SMTP transporter not configured' : ''\),/g, "smtpError: smtpErrorMsg || (!transporter ? 'SMTP transporter not configured' : ''),"); // Already in scope there since it's after the const declaration
code = code.replace(/targetUser\.resetPasswordToken/g, "(targetUser as any).resetPasswordToken");
code = code.replace(/targetUser\.resetPasswordExpiresAt/g, "(targetUser as any).resetPasswordExpiresAt");
code = code.replace(/u\.resetPasswordToken/g, "(u as any).resetPasswordToken");
code = code.replace(/u\.resetPasswordExpiresAt/g, "(u as any).resetPasswordExpiresAt");

fs.writeFileSync('server.ts', code);
