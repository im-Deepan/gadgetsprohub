const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ Find matching interests: categoryName of the clicked interest matches product subcategory \(case-insensitive\) OR matching categoryName directly[\s\S]*?\} else \{/m;

const replacement = `// Find matching interests: categoryName of the clicked interest matches product subcategory (case-insensitive) OR matching categoryName directly
      interests = await PickLeftInterest.find({
        $or: [
          { categoryName: { $regex: new RegExp(\`^\${escapeRegExp(subcategoryName)}\$\`, 'i') } },
          { categoryName: { $regex: new RegExp(\`^\${escapeRegExp(categoryName)}\$\`, 'i') } }
        ],
        isVerified: true
      });
    } else {`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('server.ts', content);
  console.log("Fixed trigger syntax error");
} else {
  console.log("Could not find the damaged section.");
}
