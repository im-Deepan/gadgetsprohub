const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldMongoFind = `      interests = await PickLeftInterest.find({
        $or: [
          { categoryName: { $regex: new RegExp(\`^\${escapeRegExp(subcategoryName)}\$\`, 'i') } },
          { categoryName: { $regex: new RegExp(\`^\${escapeRegExp(categoryName)}\$\`, 'i') } }
        ]
      });`;

const newMongoFind = `      interests = await PickLeftInterest.find({
        $or: [
          { categoryName: { $regex: new RegExp(\`^\${escapeRegExp(subcategoryName)}\$\`, 'i') } },
          { categoryName: { $regex: new RegExp(\`^\${escapeRegExp(categoryName)}\$\`, 'i') } }
        ],
        isVerified: true
      });`;

const oldLocalFind = `      interests = localPickLeftInterests.filter((i: any) => 
        i.categoryName.toLowerCase() === subcategoryName.toLowerCase() || 
        i.categoryName.toLowerCase() === categoryName.toLowerCase()
      );`;

const newLocalFind = `      interests = localPickLeftInterests.filter((i: any) => 
        (i.categoryName.toLowerCase() === subcategoryName.toLowerCase() || 
         i.categoryName.toLowerCase() === categoryName.toLowerCase()) && 
        i.isVerified
      );`;

if(content.includes(oldMongoFind)) {
   content = content.replace(oldMongoFind, newMongoFind);
}
if(content.includes(oldLocalFind)) {
   content = content.replace(oldLocalFind, newLocalFind);
}

fs.writeFileSync('server.ts', content);
console.log("Patched trigger logic part 2");
