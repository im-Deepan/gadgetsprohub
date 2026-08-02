const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

// I will just add the "Forgot password?" link next to the "Secure Password" label.
code = code.replace(/<label className="text-\[10px\] font-bold uppercase tracking-wider text-slate-300">Secure Password<\/label>/g, 
  `<div className="flex justify-between items-center"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Secure Password</label>{activeTab === 'login' && <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline">Forgot password?</button>}</div>`);

fs.writeFileSync('src/pages/Login.tsx', code);
