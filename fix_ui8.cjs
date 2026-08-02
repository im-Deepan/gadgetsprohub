const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

code = code.replace(/\) : \(\n*(\s*)<AnimatePresence mode="popLayout" initial=\{false\}>/g, ") : (<>\n$1<AnimatePresence mode=\"popLayout\" initial={false}>");

fs.writeFileSync('src/pages/Login.tsx', code);
