const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

code = code.replace(/<span className={`from-pink-400 via-rose-400 via-amber-300 via-emerald-300 via-teal-400 via-indigo-400 via-purple-500 to-pink-400 bg-clip-text text-transparent font-black text-lg tracking-tight \${getGradientClass\(colorFlowDir\)}`}>\s*gadgetsprohub\s*<\/span>/g, '<span className="text-zinc-900 dark:text-white font-display font-black text-xl tracking-tight">gadgetsprohub</span>');

code = code.replace(/<span className={`from-pink-400 via-rose-400 via-amber-300 via-emerald-300 via-teal-400 via-indigo-400 via-purple-500 to-pink-400 bg-clip-text text-transparent font-black text-xl tracking-tight \${getGradientClass\(colorFlowDir\)}`}>\s*gadgetsprohub\s*<\/span>/g, '<span className="text-zinc-900 dark:text-white font-display font-black text-xl tracking-tight">gadgetsprohub</span>');

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('Updated Navbar');
