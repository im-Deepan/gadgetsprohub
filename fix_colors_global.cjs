const fs = require('fs');

['src/pages/Home.tsx', 'src/pages/ProductDetail.tsx', 'src/pages/Blog.tsx'].forEach(file => {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf-8');
    code = code.replace(/text-indigo-600/g, 'text-zinc-900 dark:text-white');
    code = code.replace(/text-indigo-500/g, 'text-zinc-900 dark:text-white');
    code = code.replace(/text-indigo-400/g, 'text-zinc-700 dark:text-slate-200');
    code = code.replace(/bg-indigo-600/g, 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900');
    code = code.replace(/bg-indigo-500/g, 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900');
    code = code.replace(/bg-indigo-950/g, 'bg-slate-900');
    code = code.replace(/bg-indigo-900/g, 'bg-slate-800');
    code = code.replace(/bg-indigo-50/g, 'bg-slate-100 dark:bg-slate-800');
    code = code.replace(/border-indigo-100/g, 'border-slate-200 dark:border-slate-700');
    code = code.replace(/border-indigo-500/g, 'border-zinc-900 dark:border-white');
    code = code.replace(/border-indigo-600/g, 'border-zinc-900 dark:border-white');
    
    // Replace rounded-2xl with rounded-xl or rounded-lg for card radii reduction
    code = code.replace(/rounded-2xl/g, 'rounded-xl');
    // Replace shadow-xl or 2xl with shadow-sm or borders
    code = code.replace(/shadow-2xl/g, 'shadow-sm border border-slate-200 dark:border-slate-800');
    code = code.replace(/shadow-xl/g, 'shadow-sm border border-slate-200 dark:border-slate-800');
    
    fs.writeFileSync(file, code);
  }
});

let plCode = fs.readFileSync('src/pages/ProductList.tsx', 'utf-8');
plCode = plCode.replace(/rounded-2xl/g, 'rounded-xl');
plCode = plCode.replace(/shadow-2xl/g, 'shadow-sm border border-slate-200 dark:border-slate-800');
plCode = plCode.replace(/shadow-xl/g, 'shadow-sm border border-slate-200 dark:border-slate-800');
fs.writeFileSync('src/pages/ProductList.tsx', plCode);

console.log('Fixed colors and radii globally');
