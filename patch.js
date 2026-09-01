const fs = require('fs');
let code = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
code = code.replace(
  /\) : \(\s*loading \? \(/,
  ") : loading ? ("
);
code = code.replace(
  / \)}/,
  " )}"
);
fs.writeFileSync('src/pages/Profile.tsx', code);
