const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

code = code.replace(/\)<\/\\\}<\/form>/g, ""); // wait, I literally wrote `)</>}</form>`.

code = code.replace(")</>}</form>", "</>)}</form>");

fs.writeFileSync('src/pages/Login.tsx', code);
