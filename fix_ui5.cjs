const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

code = code.replace(/\) : \(\<AnimatePresence mode="popLayout" initial=\{false\}\>/g, ") : (<><AnimatePresence mode=\"popLayout\" initial={false}>");
code = code.replace(/\)\}<\/form>/g, ")</>}</form>");

fs.writeFileSync('src/pages/Login.tsx', code);
