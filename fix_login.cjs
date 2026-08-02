const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');
code = code.replace(/if \(err\.includes\('incorrect'\) \|\| err\.includes\('invalid-credential'\) \|\| err\.includes\('wrong-password'\) \|\| err\.includes\('invalid credentials'\)\) \{/g,
  "if (err.includes('incorrect') || err.includes('invalid-credential') || err.includes('wrong-password') || err.includes('invalid credentials') || err.includes('user-not-found') || err.includes('no user record')) {");
code = code.replace(/  if \(err\.includes\('user-not-found'\) \|\| err\.includes\('no user record'\)\) \{\n    return \{\n      title: "Account Not Found",\n      description: "No registered account matches the email address you entered.",\n      suggestion: "Double-check for spelling mistakes, or click 'Register Account' to set up a new profile."\n    \};\n  \}\n/g, '');
fs.writeFileSync('src/pages/Login.tsx', code);
