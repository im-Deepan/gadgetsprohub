const fs = require('fs');
let code = fs.readFileSync('src/services/AiService.ts', 'utf8');

code = code.replace(
  /const cachedVal = await this\.getCachedResponse\(params\.prompt, provider, model\);/,
  `const cachedVal = await this.getCachedResponse(params.prompt, provider, model, params.systemInstruction);`
);

code = code.replace(
  /await this\.setCachedResponse\(params\.prompt, provider, model, finalResponse, CACHE_TTL\);/,
  `await this.setCachedResponse(params.prompt, provider, model, finalResponse, CACHE_TTL, params.systemInstruction);`
);

fs.writeFileSync('src/services/AiService.ts', code);
