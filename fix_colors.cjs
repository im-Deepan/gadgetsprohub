const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductList.tsx', 'utf-8');

code = code.replace(/text-indigo-600/g, 'text-zinc-900 dark:text-white');
code = code.replace(/text-indigo-500/g, 'text-zinc-900 dark:text-white');
code = code.replace(/bg-indigo-600/g, 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900');
code = code.replace(/bg-indigo-500/g, 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900');
code = code.replace(/bg-indigo-50/g, 'bg-slate-100 dark:bg-slate-800');
code = code.replace(/border-indigo-100/g, 'border-slate-200 dark:border-slate-700');

fs.writeFileSync('src/pages/ProductList.tsx', code);
console.log('Fixed colors in ProductList');
