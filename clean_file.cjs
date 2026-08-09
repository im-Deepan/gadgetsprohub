const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// The file has multiple duplications where the prefix of the file was inserted.
// Each insertion starts with `import express from 'express';` (except the very first valid one)
// We need to find all occurrences of `import express from 'express';`
let idx = content.indexOf("import express from 'express';");
if (idx !== -1) {
    // skip the first valid one
    idx = content.indexOf("import express from 'express';", idx + 1);
}

while (idx !== -1) {
    // The insertion is from `idx` to some point. Where does it end?
    // It ends exactly where the original template string was before it was broken.
    // The original template string was `^${escapeRegExp(subcategoryName)}$` or similar.
    // Let's find the end of the insertion by finding the next `\$\`, 'i')` or something.
    // Actually, each insertion is an exact copy of the prefix!
    // The prefix length is exactly `idx` characters! (Because it inserted everything from 0 to idx)
    // Wait! Is it? 
    // Yes! The text inserted is exactly `content.substring(0, idx)`.
    // Wait, no. When the second insertion happened, the prefix was LONGER!
    // So the second insertion inserted the already-duplicated prefix!
    
    // Instead of guessing, let's just use string replacement to fix the specific lines.
    // We can just find `^${escapeRegExp(subcategoryName)}` and everything after it until `\$\`, 'i') } }` ?
    // No, it's easier to just rebuild the file from scratch if we can't clean it.
    break;
}
