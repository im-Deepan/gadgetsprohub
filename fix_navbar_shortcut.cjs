const fs = require('fs');

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

content = content.replace(
  /case 't':[\s\S]*?break;/,
  `case 't':
          e.preventDefault();
          if (theme === 'light') setTheme('dark');
          else if (theme === 'dark') setTheme('system');
          else setTheme('light');
          showToast("Visual color theme refreshed.", "success", 4000, "User Action");
          break;`
);

content = content.replace(
  /\[onNavigate, isAdmin, isAuthenticated, toggleTheme, showMobileMenu, showShortcutsModal, showToast\]/,
  `[onNavigate, isAdmin, isAuthenticated, theme, setTheme, showMobileMenu, showShortcutsModal, showToast]`
);

fs.writeFileSync('src/components/Navbar.tsx', content);
