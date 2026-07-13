const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const getCookieToken = \(req: express\.Request\): string \| undefined => \{\n\s*if \(\!req\.headers\.cookie\) return undefined;\n\s*const cookies = req\.headers\.cookie\.split\(';'\)\.reduce\(\(acc, c\) => \{\n\s*const \[key, val\] = c\.trim\(\)\.split\('='\);\n\s*if \(key && val\) acc\[key\] = val;\n\s*return acc;\n\s*\}, \{\} as Record<string, string>\);\n\s*return cookies\['token'\];\n\};\n/,
  `const getCookieToken = (req: express.Request): string | undefined => {
  if (!req.headers.cookie) return undefined;
  const match = req.headers.cookie.match(/(?:^|;\\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
};\n`
);

fs.writeFileSync('server.ts', code);
