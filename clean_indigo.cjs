const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductList.tsx', 'utf-8');

code = code.replace(/shadow-indigo-400/g, 'shadow-zinc-400');
code = code.replace(/text-indigo-300/g, 'text-zinc-200');
code = code.replace(/bg-indigo-[0-9]+\/[0-9]+/g, 'bg-zinc-800/50');
code = code.replace(/border-indigo-[0-9]+\/[0-9]+/g, 'border-zinc-700');
code = code.replace(/border-indigo-[0-9]+/g, 'border-zinc-700');
code = code.replace(/bg-indigo-[0-9]+/g, 'bg-zinc-100');
code = code.replace(/text-indigo-[0-9]+/g, 'text-zinc-900');
code = code.replace(/focus:ring-indigo-[0-9]+\/[0-9]+/g, 'focus:ring-zinc-500/20');
code = code.replace(/focus:border-indigo-[0-9]+/g, 'focus:border-zinc-500');

fs.writeFileSync('src/pages/ProductList.tsx', code);
console.log('Cleaned indigo from ProductList');
