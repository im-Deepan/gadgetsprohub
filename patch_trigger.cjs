const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  `const interests = await PickLeftInterest.find({ categoryName: product.category.name });`,
  `const interests = await PickLeftInterest.find({ categoryName: product.category.name, isVerified: true });`
);

content = content.replace(
  `const interests = localPickLeftInterests.filter((i: any) => i.categoryName === categoryName);`,
  `const interests = localPickLeftInterests.filter((i: any) => i.categoryName === categoryName && i.isVerified);`
);

fs.writeFileSync('server.ts', content);
console.log("Patched trigger logic");
