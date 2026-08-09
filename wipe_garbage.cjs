const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const marker = "// Find matching interests: categoryName of the clicked interest matches product subcategory (case-insensitive) OR matching categoryName directly";

const idxStart = content.indexOf(marker);

const localFallback = `      interests = localPickLeftInterests.filter(
        (interest: any) => 
          interest.categoryName.trim().toLowerCase() === subcategoryName.toLowerCase() ||
          interest.categoryName.trim().toLowerCase() === categoryName.toLowerCase()
      );`;

let idxEnd = content.indexOf(localFallback);

if (idxStart !== -1 && idxEnd !== -1) {
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
    content = content.substring(0, idxStart) + correctBlock + content.substring(idxEnd);
    fs.writeFileSync('server.ts', content);
    console.log("Garbage wiped!");
} else {
    console.log("Could not find start or end. start:", idxStart, "end:", idxEnd);
}
