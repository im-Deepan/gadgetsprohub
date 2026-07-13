const fs = require('fs');
let lines = fs.readFileSync('server.ts', 'utf8').split('\n');

const startIdx = lines.findIndex(line => line.includes('app.get(/^\\/src\\/.+\\.(tsx|ts|jsx|js)$/'));
if (startIdx !== -1) {
  lines.splice(startIdx, 8, 
    '    app.get(/^\\/src\\/.+\\.(tsx|ts|jsx|js)$/, (req: express.Request, res: express.Response) => {',
    '      const filePath = path.normalize(path.join(process.cwd(), req.path));',
    '      if (!filePath.startsWith(path.join(process.cwd(), "src"))) {',
    '        return res.status(403).send("Forbidden directory traversal");',
    '      }',
    '      res.sendFile(filePath, (err) => {',
    '        if (err) { res.status(404).send("Source file not found"); }',
    '      });',
    '    });'
  );
  fs.writeFileSync('server.ts', lines.join('\n'));
}
