const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductList.tsx', 'utf-8');

// The main layout div
code = code.replace(/<div className="flex flex-col lg:flex-row lg:items-start lg:gap-8 w-full md:px-4">/, `<div className="flex flex-col md:flex-row md:items-start md:gap-6 lg:gap-8 w-full md:px-4 relative">`);

// The aside
code = code.replace(/<aside className="hidden lg:block lg:w-64 xl:w-72 shrink-0 sticky top-20 rounded-xl border border-slate-200\/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900\/60 space-y-5">/, 
`<aside className={\`hidden md:block shrink-0 sticky top-20 rounded-xl bg-white dark:bg-slate-900/60 space-y-5 transition-all duration-300 origin-left \${
  isFilterOpen 
    ? 'w-60 lg:w-64 xl:w-72 p-5 border border-slate-200/80 dark:border-slate-800 opacity-100 scale-100' 
    : 'w-0 lg:w-64 xl:w-72 p-0 lg:p-5 border-none lg:border lg:border-slate-200/80 dark:lg:border-slate-800 opacity-0 lg:opacity-100 scale-95 lg:scale-100 overflow-hidden lg:overflow-visible'
}\`}>`);

// Hide the drawer button on md
code = code.replace(/className="lg:hidden fixed bottom-20 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900/g, 'className="md:hidden fixed bottom-20 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900');

// Mobile sliding drawer should be md:hidden
code = code.replace(/<div className="lg:hidden">/g, '<div className="md:hidden">');

// Minimizer trigger button should be visible on md (to toggle the collapsible docked sidebar)
code = code.replace(/className={\`lg:hidden flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all duration-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 \${/,
`className={\`lg:hidden flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all duration-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 \${`);

fs.writeFileSync('src/pages/ProductList.tsx', code);
console.log('Fixed ProductList Layout');
