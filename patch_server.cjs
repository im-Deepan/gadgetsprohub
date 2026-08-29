const fs = require('fs');

const atomicHelper = `
// ========== ATOMIC FILE WRITE UTILITY ==========
const atomicWriteFileSync = (filePath, data, encoding = 'utf8') => {
  const tempPath = filePath + '.' + Date.now() + Math.floor(Math.random()*1000) + '.tmp';
  try {
    fs.writeFileSync(tempPath, data, encoding);
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(\`[FATAL] Atomic write failed for \${filePath}:\`, err.message);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch(e) {}
    }
    throw err;
  }
};
// ===============================================
`;

let code = fs.readFileSync('server.ts', 'utf8');

// Insert atomicHelper after imports (e.g. after "const PORT = ...")
code = code.replace(/const PORT = process\.env\.PORT \|\| 3000;/, match => match + '\n' + atomicHelper);

// Replace all fs.writeFileSync with atomicWriteFileSync EXCEPT for the image one which takes buffer
code = code.replace(/fs\.writeFileSync\(([^,]+),\s*(JSON\.stringify[^,]+(?:,[^,]+,[^,]+)?)(?:,\s*'utf8')?\)/g, "atomicWriteFileSync($1, $2, 'utf8')");
// Wait, the regex might be tricky. Let's just do a blanket replace for fs.writeFileSync(..., JSON.stringify...)
code = code.replace(/fs\.writeFileSync\(([^,]+),\s*(JSON\.stringify[^;]+?)(?:,\s*'utf8')?\)/g, "atomicWriteFileSync($1, $2, 'utf8')");

// Also replace standard fs.writeFileSync calls directly
code = code.replace(/fs\.writeFileSync\(/g, "atomicWriteFileSync(");

// Re-fix the sharp one because we might have replaced it and it writes a buffer
code = code.replace(/atomicWriteFileSync\(destPath, optimizedBuffer\)/, "fs.writeFileSync(destPath, optimizedBuffer)");

fs.writeFileSync('server.ts', code, 'utf8');
console.log("Patched server.ts with atomic writes.");
