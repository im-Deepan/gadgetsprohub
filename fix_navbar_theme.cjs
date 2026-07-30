const fs = require('fs');

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

content = content.replace(
  /<button\s*onClick=\{toggleTheme\}[\s\S]*?<\/button>/,
  `<button
              onClick={() => {
                if (theme === 'light') setTheme('dark');
                else if (theme === 'dark') setTheme('system');
                else setTheme('light');
              }}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95"
              title={\`Current theme: \${theme}. Click to change.\`}
              aria-label="Toggle theme"
            >
              {theme === 'system' ? (
                <Monitor className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 dark:text-indigo-400" />
              ) : theme === 'dark' ? (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-300" />
              ) : (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              )}
            </button>`
);

fs.writeFileSync('src/components/Navbar.tsx', content);
