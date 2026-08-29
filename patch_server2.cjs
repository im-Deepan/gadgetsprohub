const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const atomicHelper = `
// ========== ATOMIC FILE WRITE UTILITY ==========
const atomicWriteFileSync = (filePath: string, data: string, encoding: BufferEncoding = 'utf8') => {
  const tempPath = filePath + '.' + Date.now() + Math.floor(Math.random()*1000) + '.tmp';
  try {
    fs.writeFileSync(tempPath, data, encoding);
    fs.renameSync(tempPath, filePath);
  } catch (err: any) {
    console.error(\`[FATAL] Atomic write failed for \${filePath}:\`, err.message);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch(e) {}
    }
    throw err;
  }
};
// ===============================================
`;

// Insert after the first bunch of imports
code = code.replace(/(import .*;\n)+/, match => match + '\n' + atomicHelper);

// Fix getJwtSecret
const secureJwt = `
let generatedFallbackSecret: string | null = null;
const getJwtSecret = (): string => {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '' && process.env.JWT_SECRET !== 'your-secret-key') {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be explicitly provided in production. Check your .env file or deployment config.');
  }
  if (!generatedFallbackSecret) {
    try {
      const crypto = require('crypto');
      generatedFallbackSecret = crypto.randomBytes(64).toString('hex');
    } catch {
      generatedFallbackSecret = 'fallback-gadgetsprohub-crypto-secret-key-32bytes-hex-99201';
    }
    console.warn("⚠️ JWT_SECRET env variable not provided; generated 64-byte high-entropy fallback secret for development.");
  }
  if (!generatedFallbackSecret) throw new Error('Failed to generate JWT secret'); return generatedFallbackSecret;
};
`;

code = code.replace(/let generatedFallbackSecret[\s\S]*?const getJwtSecret[\s\S]*?};\n/, secureJwt);

fs.writeFileSync('server.ts', code, 'utf8');
console.log("Patched server.ts with atomic helper globally.");
