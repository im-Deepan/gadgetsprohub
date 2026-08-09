const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add rate limiter for emails
const rateLimitInject = `  const pairLimiter = rateLimit({`;
const newRateLimit = `  const emailActionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: 'Too many email actions from this IP, please retry in 1 hour' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, default: false }
  });
  app.use('/api/products/pick-left-click', emailActionLimiter);
  app.use('/api/newsletter/subscribe', emailActionLimiter);
  
  const pairLimiter = rateLimit({`;

if (content.includes(rateLimitInject) && !content.includes('emailActionLimiter')) {
  content = content.replace(rateLimitInject, newRateLimit);
}

// Ensure crypto is imported
if (!content.includes("import crypto from 'crypto';")) {
  content = content.replace("import path from 'path';", "import path from 'path';\nimport crypto from 'crypto';");
}

fs.writeFileSync('server.ts', content);
console.log("Patched rate limiter and crypto");
