const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/app\.post\('\/api\/auth\/forgot-password', authLimiter, async \(req, res\) =>/g, "app.post('/api/auth/forgot-password', authLimiter, async (req: express.Request, res: express.Response): Promise<any> =>");
code = code.replace(/app\.post\('\/api\/auth\/reset-password', authLimiter, async \(req, res\) =>/g, "app.post('/api/auth/reset-password', authLimiter, async (req: express.Request, res: express.Response): Promise<any> =>");
code = code.replace(/catch \(err\) {/g, "catch (err: any) {");
code = code.replace(/catch \(error\) {/g, "catch (error: any) {");
fs.writeFileSync('server.ts', code);
