const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const res = await fetch\(`https:\/\/api\.telegram\.org\/bot\$\{token\}\/setWebhook\?url=\$\{encodeURIComponent\(webhookUrl\)\}`\);/,
  `const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET || crypto.createHash('sha256').update(token).digest('hex').substring(0, 32);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch(\`https://api.telegram.org/bot\${token}/setWebhook?url=\${encodeURIComponent(webhookUrl)}&secret_token=\${encodeURIComponent(secretToken)}\`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);`
);

fs.writeFileSync('server.ts', code);
