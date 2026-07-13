const fs = require('fs');
let code = fs.readFileSync('src/services/AiService.ts', 'utf8');

// Replace computeHash
code = code.replace(
  /private computeHash\(prompt: string, provider: string, model: string\): string \{\n    return crypto\.createHash\('md5'\)\.update\(`\$\{prompt\}:\$\{provider\}:\$\{model\}`\)\.digest\('hex'\);\n  \}/,
  `private computeHash(prompt: string, provider: string, model: string, systemInstruction?: string): string {
    return crypto.createHash('sha256').update(\`\${prompt}:\${provider}:\${model}:\${systemInstruction || ''}\`).digest('hex');
  }`
);

code = code.replace(
  /public async getCachedResponse\(prompt: string, provider: string, model: string\): Promise<string \| null> \{\n    const hash = this\.computeHash\(prompt, provider, model\);/,
  `public async getCachedResponse(prompt: string, provider: string, model: string, systemInstruction?: string): Promise<string | null> {
    const hash = this.computeHash(prompt, provider, model, systemInstruction);`
);

code = code.replace(
  /public async setCachedResponse\(prompt: string, provider: string, model: string, response: string, ttlMs = 86400000\): Promise<void> \{\n    const hash = this\.computeHash\(prompt, provider, model\);/,
  `public async setCachedResponse(prompt: string, provider: string, model: string, response: string, ttlMs = 86400000, systemInstruction?: string): Promise<void> {
    const hash = this.computeHash(prompt, provider, model, systemInstruction);`
);

fs.writeFileSync('src/services/AiService.ts', code);
