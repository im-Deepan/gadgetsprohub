const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

// Replace rainbow text
code = code.replace(/<span className={`from-pink-400 via-rose-400 via-amber-300 via-emerald-300 via-teal-400 via-indigo-400 via-purple-500 to-pink-400 bg-clip-text text-transparent font-black text-lg tracking-tight \${getGradientClass\(colorFlowDir\)}`}>\s*gadgetsprohub\s*<\/span>/g, '<span className="text-zinc-900 dark:text-white font-display font-black text-xl tracking-tight">gadgetsprohub</span>');

code = code.replace(/<span className={`from-pink-400 via-rose-400 via-amber-300 via-emerald-300 via-teal-400 via-indigo-400 via-purple-500 to-pink-400 bg-clip-text text-transparent font-black text-xl tracking-tight \${getGradientClass\(colorFlowDir\)}`}>\s*gadgetsprohub\s*<\/span>/g, '<span className="text-zinc-900 dark:text-white font-display font-black text-xl tracking-tight">gadgetsprohub</span>');

code = code.replace(/text-indigo-600/g, 'text-zinc-900 dark:text-white');
code = code.replace(/text-indigo-500/g, 'text-zinc-900 dark:text-white');
code = code.replace(/bg-indigo-600/g, 'bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white');
code = code.replace(/bg-indigo-500/g, 'bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white');

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('Updated Navbar');
