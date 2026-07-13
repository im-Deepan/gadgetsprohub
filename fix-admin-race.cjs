const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /if \(user\.role !== 'admin'\) \{\n\s*user\.role = 'admin';\n\s*user\.save\(\)\.catch\(e => console\.warn\("Failed automatic database role promotion:", e\)\);\n\s*\}/g,
  `if (user.role !== 'admin') {
              User.updateOne({ _id: user._id }, { $set: { role: 'admin' } }).catch(e => console.warn("Failed automatic database role promotion:", e));
              user.role = 'admin';
            }`
);

code = code.replace(
  /if \(user\.role === 'admin'\) \{\n\s*user\.role = 'user';\n\s*user\.save\(\)\.catch\(e => console\.warn\("Failed automatic database role demotion:", e\)\);\n\s*\}/g,
  `if (user.role === 'admin') {
              User.updateOne({ _id: user._id }, { $set: { role: 'user' } }).catch(e => console.warn("Failed automatic database role demotion:", e));
              user.role = 'user';
            }`
);

fs.writeFileSync('server.ts', code);
