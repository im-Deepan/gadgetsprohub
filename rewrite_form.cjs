const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

const formStartIndex = code.indexOf('<form onSubmit={handleSubmit} className="space-y-4">');
const formEndIndex = code.indexOf('</form>', formStartIndex) + 7;

if (formStartIndex === -1 || formEndIndex === -1) {
  console.log("Could not find form");
  process.exit(1);
}

// Just copy the whole chunk to a separate file, and I will rewrite it using a simple script.
const formStr = code.substring(formStartIndex, formEndIndex);
fs.writeFileSync('form.txt', formStr);
