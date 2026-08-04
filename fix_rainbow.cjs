const fs = require('fs');
['src/pages/Login.tsx', 'src/pages/Blog.tsx', 'src/components/Footer.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(/<span className="bg-gradient-to-r from-pink-400 via-purple-400 to-amber-400 bg-clip-text text-transparent font-black/g, '<span className="text-zinc-900 dark:text-white font-display font-black');
  fs.writeFileSync(file, code);
});
console.log('Fixed rainbow in other files');
