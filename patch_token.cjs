const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const t1 = `verificationToken: token });`;
const r1 = `verificationToken: String(token) });`;
content = content.replace(t1, r1);
content = content.replace(t1, r1); // There might be two occurrences (PickLeft and Subscriber)

// Let's also check for any `await interest.save();` errors:
// TypeScript might think `PickLeftInterest.findOne` returns something that doesn't have `.save()` ?
// Actually, if the `.findOne` call was failing typechecking, TypeScript infers the type of `interest` as `any` or throws an error.
// Once `.findOne` compiles, `.save()` will compile.

fs.writeFileSync('server.ts', content);
console.log("Patched token!");
