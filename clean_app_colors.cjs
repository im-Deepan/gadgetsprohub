const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(/bg-indigo-500/g, 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900');
code = code.replace(/bg-indigo-300/g, 'bg-zinc-300 dark:bg-zinc-700');
code = code.replace(/text-indigo-500/g, 'text-zinc-900 dark:text-white');
code = code.replace(/text-indigo-600/g, 'text-zinc-900 dark:text-white');

fs.writeFileSync('src/App.tsx', code);
console.log('Cleaned indigo from App.tsx');
