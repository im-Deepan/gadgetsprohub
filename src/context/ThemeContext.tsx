import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeSetItem, safeGetItem } from '../utils/localStorage';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
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
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    let resolvedIsDark = false;
    const saved = safeGetItem('aff_theme');
    if (saved !== null) {
      try {
        resolvedIsDark = JSON.parse(saved);
      } catch {
        resolvedIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } else {
      resolvedIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    setIsDark(resolvedIsDark);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    safeSetItem('aff_theme', JSON.stringify(isDark));

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark, mounted]);

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
