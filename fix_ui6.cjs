const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

code = code.replace(/\)\<\/\\\}\<\/form\>/g, "</>)}</form>"); // wait, I wrote `)</>}</form>`, so replace `)\}<\/\}\<\/form\>`
code = code.replace(/\)\<\/\\\}\<\/form\>/g, ""); 
