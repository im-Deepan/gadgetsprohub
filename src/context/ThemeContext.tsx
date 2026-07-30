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

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = (currentTheme: Theme) => {
      if (currentTheme === 'dark') {
        setIsDark(true);
      } else if (currentTheme === 'light') {
        setIsDark(false);
      } else {
        setIsDark(mediaQuery.matches);
      }
    };

    applyTheme(theme);

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setIsDark(e.matches);
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

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const setTheme = useCallback((newTheme: Theme) => {
    safeSetItem('aff_theme_pref', newTheme);
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  return (
    <ThemeContext.Provider value={{ isDark, theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
