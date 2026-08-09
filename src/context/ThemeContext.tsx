import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { safeSetItem, safeGetItem } from '../utils/localStorage';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    const saved = safeGetItem('aff_theme_pref');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved as Theme;
    }
    // Backward compatibility for old boolean pref
    const savedOld = safeGetItem('aff_theme');
    if (savedOld !== null) {
      try {
         return JSON.parse(savedOld) ? 'dark' : 'light';
      } catch (e) {}
    }
    return 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const updateDOMAndState = useCallback((newTheme: Theme) => {
    let nextIsDark = false;
    if (newTheme === 'dark') {
      nextIsDark = true;
    } else if (newTheme === 'light') {
      nextIsDark = false;
    } else {
      nextIsDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    setIsDark(nextIsDark);
    setThemeState(newTheme);
    safeSetItem('aff_theme_pref', newTheme);

    if (typeof document !== 'undefined') {
      if (nextIsDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Initial sync
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      const systemDark = mediaQuery.matches;
      document.documentElement.classList.toggle('dark', systemDark);
      setIsDark(systemDark);
    }

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setIsDark(e.matches);
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    updateDOMAndState(newTheme);
  }, [updateDOMAndState]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    updateDOMAndState(nextTheme);
  }, [theme, updateDOMAndState]);

  return (
    <ThemeContext.Provider value={{ isDark, theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
