const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// I will just read the original server.ts if it was backed up? No, I don't have it.
// I will find the duplicate prefix and remove it!

// The duplication starts right after `^${escapeRegExp(subcategoryName)}`
// And it inserted the prefix. The prefix starts with `import express from 'express';`
// And ends exactly where the match started.

// Wait, the easiest way is to just cut out the broken lines and write the correct ones.
const startLinePattern = "// Find matching interests: categoryName of the clicked interest matches product subcategory (case-insensitive) OR matching categoryName directly";
const endLinePattern = "      interests = localPickLeftInterests.filter((i: any) => ";

const idx1 = content.indexOf(startLinePattern);
const idx2 = content.indexOf(endLinePattern, idx1);

if (idx1 !== -1 && idx2 !== -1) {
  const correctBlock = `// Find matching interests: categoryName of the clicked interest matches product subcategory (case-insensitive) OR matching categoryName directly
      interests = await PickLeftInterest.find({
        $or: [
          { categoryName: { $regex: new RegExp('^' + escapeRegExp(subcategoryName) + '$', 'i') } },
          { categoryName: { $regex: new RegExp('^' + escapeRegExp(categoryName) + '$', 'i') } }
        ],
        isVerified: true
      });
    } else {
`;

  content = content.substring(0, idx1) + correctBlock + content.substring(idx2);
  fs.writeFileSync('server.ts', content);
  console.log("Fixed the `$`` problem!");
} else {
  console.log("Could not find blocks");
}

