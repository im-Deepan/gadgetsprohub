const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const rateLimitCode = `
  // Rate limiter for pairing code exchange
  const exchangeCodeLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { error: 'Too many code exchange attempts from this IP, please try again after 5 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Exchange single-use, 1-minute authorization code for session JWT
  app.post('/api/auth/exchange-code', exchangeCodeLimiter, async (req: express.Request, res: express.Response): Promise<any> => {
`;

code = code.replace(/  \/\/ Exchange single-use, 1-minute authorization code for session JWT\n  app\.post\('\/api\/auth\/exchange-code', async \(req: express\.Request, res: express\.Response\): Promise<any> => {/, rateLimitCode);

fs.writeFileSync('server.ts', code, 'utf8');
console.log("Added rate limiting to exchange-code endpoint.");
