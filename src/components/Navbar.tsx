import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Heart, User, LogOut, Menu, X, LayoutDashboard, Sun, Moon, Monitor, Keyboard } from 'lucide-react';
import { Category } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../utils/apiClient';
import { fetchCategoriesShared } from '../utils/category';
import { SearchAutocompleteInput } from './SearchAutocompleteInput';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, slug?: string) => void;
  onPreload?: (view: any, slug?: string) => void;
  onOpenWishlist?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onPreload, onOpenWishlist }) => {
  const { user, isAuthenticated, isAdmin, logout, wishlist } = useAuth();
  const { showToast } = useToast();
  const { isDark, theme, toggleTheme, setTheme } = useTheme();
  
  const handleLogout = () => {
    logout();
    onNavigate('home');
    showToast("You have successfully signed out of your account.", "success", 4000, "User Action");
  };
  
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Custom states for running color longitudinally in catchy directions
  const [colorFlowDir, setColorFlowDir] = useState<'ltr' | 'rtl' | 'diagonal' | 'vertical'>('ltr');

  // Real-time Database Connection verification status
  const [dbStatus, setDbStatus] = useState<'connected' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    const controller = new AbortController();
    let interval: NodeJS.Timeout;
    const checkDb = async () => {
      try {
        const res = await apiFetch('/api/health-check', { signal: controller.signal, maxRetries: 0 });
        if (res.ok) {
          const data = await res.json();
          if (data && data.database === 'connected') {
            setDbStatus('connected');
            return;
          }
        }
        setDbStatus('offline');
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setDbStatus('offline');
        }
      }
    };

    // Defer initial check by 4s to prevent network/CPU contention during initial page paint
    const initialTimer = setTimeout(() => {
      checkDb().catch(() => {});
      interval = setInterval(() => {
        checkDb().catch(() => {});
      }, 60000);
    }, 4000);

    return () => {
      controller.abort();
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, []);

  // Global power users keyboard shortcuts help state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Scroll behavior state
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = React.useRef(0);

  // Scroll handler with instant reaction at any vertical screen position
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (showMobileMenu) {
            setIsVisible(true);
            ticking = false;
            return;
          }
          const currentScrollY = window.scrollY;
          const prevScrollY = lastScrollYRef.current;
          const diff = currentScrollY - prevScrollY;
          
          if (Math.abs(diff) >= 1) {
            if (currentScrollY <= 15) {
              setIsVisible(prev => prev ? prev : true);
            } else if (diff > 1 && currentScrollY > 70) {
              setIsVisible(prev => !prev ? prev : false);
            } else if (diff < -1) {
              setIsVisible(prev => prev ? prev : true);
            }
            lastScrollYRef.current = currentScrollY;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showMobileMenu]);

  // Global Keyboard shortcuts implementation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively writing in form/input elements
      const target = e.target as HTMLElement;
      if (target) {
        const tagName = target.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || target.getAttribute('contenteditable') === 'true') {
          // Pressing escape inside the input blurs it
          if (e.key === 'Escape') {
            target.blur();
          }
          return;
        }
      }

      const key = e.key.toLowerCase();

      // Ignore other shortcut keys when the keyboard shortcuts modal is open
      if (showShortcutsModal) {
        if (key !== 'escape' && key !== '?' && key !== 'k') {
          return;
        }
      }

      switch (key) {
        case '/':
          e.preventDefault();
          setIsVisible(true); // make sure navigation bar slides back in
          window.dispatchEvent(new CustomEvent('focus-search-input'));
          showToast("Search field focused via keyboard shortcut.", "info", 3000, "User Action");
          break;
        case 'h':
          e.preventDefault();
          onNavigate('home');
          showToast("Navigated to Homepage view.", "info", 3000, "User Action");
          break;
        case 'p':
          e.preventDefault();
          onNavigate('products');
          showToast("Navigated to Products Catalog view.", "info", 3000, "User Action");
          break;
        case 'b':
          e.preventDefault();
          onNavigate('blogs');
          showToast("Navigated to Editorial Articles view.", "info", 3000, "User Action");
          break;
        case 'c':
          e.preventDefault();
          onNavigate('contact');
          showToast("Navigated to Contact Support view.", "info", 3000, "User Action");
          break;
        case 't':
          e.preventDefault();
          if (theme === 'light') setTheme('dark');
          else if (theme === 'dark') setTheme('system');
          else setTheme('light');
          showToast("Visual color theme refreshed.", "success", 4000, "User Action");
          break;
        case 'w':
          if (isAuthenticated) {
            e.preventDefault();
            onNavigate('profile');
            showToast("Navigated to Profile Settings.", "info", 3000, "User Action");
          } else {
            showToast("Please sign in to view your synchronized bookmarks.", "warning", 4000, "User Action");
          }
          break;
        case 'a':
          if (isAdmin) {
            e.preventDefault();
            onNavigate('admin');
            showToast("Launching security-credentialed Admin Control Panel.", "success", 4000, "User Action");
          }
          break;
        case '?':
        case 'k':
          e.preventDefault();
          setShowShortcutsModal(prev => !prev);
          break;
        case 'escape':
          if (showShortcutsModal) {
            e.preventDefault();
            setShowShortcutsModal(false);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, isAdmin, isAuthenticated, theme, setTheme, showMobileMenu, showShortcutsModal, showToast]);

  useEffect(() => {
    const dirs: ('ltr' | 'rtl' | 'diagonal' | 'vertical')[] = ['ltr', 'rtl', 'diagonal', 'vertical'];
    const getRandomDir = (arr: ('ltr' | 'rtl' | 'diagonal' | 'vertical')[]) => {
      const randomArray = new Uint32Array(1);
      window.crypto.getRandomValues(randomArray);
      return arr[randomArray[0] % arr.length];
    };
    
    const randomDir = getRandomDir(dirs);
    setColorFlowDir(randomDir);

    // Set up a dynamic interval ticker to rotate to another random color/gradient flow direction every 5 seconds!
    const interval = setInterval(() => {
      setColorFlowDir((current) => {
        const filtered = dirs.filter(d => d !== current);
        return getRandomDir(filtered);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Disable body scroll when mobile menu is open, and force header visibility
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
      setIsVisible(true);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileMenu]);

  const getGradientClass = useCallback((dir: 'ltr' | 'rtl' | 'diagonal' | 'vertical') => {
    switch (dir) {
      case 'ltr': return 'animate-gradient-longitudinal-ltr bg-gradient-to-r';
      case 'rtl': return 'animate-gradient-longitudinal-rtl bg-gradient-to-l';
      case 'diagonal': return 'animate-gradient-longitudinal-diagonal bg-gradient-to-tr';
      case 'vertical': return 'animate-gradient-longitudinal-vertical bg-gradient-to-b';
      default: return 'bg-gradient-to-r';
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategoriesShared(controller.signal)
      .then(data => {
        if (Array.isArray(data) && !controller.signal.aborted) {
          setCategories(data);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('Navbar load categories error:', err);
        }
      });
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full animate-fade-in">
      {/* Scrollable translated header panel */}
      <nav 
        aria-label="Main navigation"
        className={`w-full border-b border-slate-100/50 bg-white/80 dark:border-slate-700/50 dark:bg-black/85 backdrop-blur-xl shadow-xs transition-transform duration-300 ease-in-out transform ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        {/* Top running longitudinal colored accent line */}
        <div className={`h-[3.5px] w-full ${getGradientClass(colorFlowDir)} object-cover shadow-sm`} />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-4">
          
          {/* Brand & Left burger trigger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-600 dark:bg-slate-800/80 dark:text-slate-200 lg:hidden cursor-pointer overflow-hidden"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={showMobileMenu ? 'close' : 'menu'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex items-center justify-center"
                >
                  {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </motion.div>
              </AnimatePresence>
            </button>
            
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <a 
                href="/"
                onClick={(e) => { e.preventDefault(); onNavigate('home'); }} 
                className="flex items-center gap-2 font-display text-base sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
                  G
                </div>
                <span>GadgetsProHub</span>
              </a>

              {/* Real-time DB Connection status badge */}
              {isAdmin && (
                <div 
                  className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider select-none border transition-all duration-300 ${
                    dbStatus === 'connected'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                      : dbStatus === 'offline'
                      ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                      : 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                  }`}
                  title={
                    dbStatus === 'connected'
                      ? 'Connected to Live MongoDB Database'
                      : dbStatus === 'offline'
                      ? 'Safe Offline Fallback (Using Local Seed Backup)'
                      : 'Verifying connection status...'
                  }
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    dbStatus === 'connected'
                      ? 'bg-emerald-400 animate-pulse'
                      : dbStatus === 'offline'
                      ? 'bg-amber-400'
                      : 'bg-slate-300'
                  }`} />
                  <span className="hidden xs:inline">
                    {dbStatus === 'connected' ? 'Live DB' : dbStatus === 'offline' ? 'Local DB' : 'Syncing'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links - Desktop */}
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <a 
              href="/"
              onClick={(e) => { e.preventDefault(); onNavigate('home'); }}
              onMouseEnter={() => onPreload?.('home')}
              className={`transition-colors duration-300 hover:text-indigo-600 cursor-pointer ${currentView === 'home' ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-200'}`}
            >
              Home
            </a>
            <div 
              className="relative flex items-center h-full"
              onMouseEnter={() => {
                setShowCategoryDropdown(true);
                onPreload?.('products');
              }}
              onMouseLeave={() => setShowCategoryDropdown(false)}
            >
              <a 
                href="/products"
                onClick={(e) => { e.preventDefault(); onNavigate('products'); }}
                onMouseEnter={() => onPreload?.('products')}
                className={`transition-colors duration-300 hover:text-indigo-600 cursor-pointer py-2 ${currentView === 'products' ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-200'}`}
              >
                Products
              </a>
              
              {showCategoryDropdown && categories.length > 0 && (
                <div className="absolute top-full left-0 mt-0 w-48 rounded-xl border border-slate-100 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col gap-1">
                    {categories.map((cat: Category) => (
                      <a
                        key={cat._id}
                        href={`/products/category-${cat.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setShowCategoryDropdown(false);
                          if (cat.slug) onNavigate('products', `category-${cat.slug}`);
                        }}
                        onMouseEnter={() => onPreload?.('products')}
                        className="w-full text-left rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-indigo-300 cursor-pointer block"
                      >
                        {cat.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a 
              href="/blogs"
              onClick={(e) => { e.preventDefault(); onNavigate('blogs'); }}
              onMouseEnter={() => onPreload?.('blogs')}
              className={`transition-colors duration-300 hover:text-indigo-600 cursor-pointer ${currentView === 'blogs' ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-200'}`}
            >
              Blog
            </a>
            <a 
              href="/contact"
              onClick={(e) => { e.preventDefault(); onNavigate('contact'); }}
              onMouseEnter={() => onPreload?.('contact')}
              className={`transition-colors duration-300 hover:text-indigo-600 cursor-pointer ${currentView === 'contact' ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-200'}`}
            >
              Contact
            </a>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:block w-48 lg:w-64">
            <SearchAutocompleteInput
              onNavigate={(view, slug) => onNavigate(view, slug)}
              variant="navbar"
              placeholder="Search gadgets..."
            />
          </div>

          {/* Right Header Icons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                if (theme === 'light') setTheme('dark');
                else if (theme === 'dark') setTheme('system');
                else setTheme('light');
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all duration-300 cursor-pointer"
              title={`Current theme: ${theme}. Click to change.`}
              aria-label="Toggle theme"
            >
              {theme === 'system' ? (
                <Monitor className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              ) : theme === 'dark' ? (
                <Moon className="h-4 w-4 text-indigo-300" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
            </button>

            {/* Wishlist Link - Desktop */}
            <button
              type="button"
              onClick={() => {
                if (onOpenWishlist) onOpenWishlist();
                else onNavigate('profile');
              }}
              aria-label="Your saved wishlist"
              className="hidden sm:flex relative h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors duration-300 cursor-pointer"
              title="Your saved wishlist"
            >
              <Heart className="h-4 w-4" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 font-mono text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Profile Menu tab */}
            <div className="relative">
              {isAuthenticated ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  {isAdmin && (
                    <a
                      href="/admin"
                      onClick={(e) => { e.preventDefault(); onNavigate('admin'); }}
                      onMouseEnter={() => onPreload?.('admin')}
                      aria-label="Admin Dashboard"
                      className={`flex h-11 w-11 sm:w-auto sm:h-11 items-center justify-center sm:gap-1.5 rounded-full p-0 sm:px-4 sm:py-2.5 text-xs font-semibold cursor-pointer border ${currentView === 'admin' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-700 dark:text-indigo-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100'}`}
                      title={isAdmin ? "Admin Dashboard" : undefined}
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Admin</span>
                    </a>
                  )}

                  <a
                    href="/profile"
                    onClick={(e) => { e.preventDefault(); onNavigate('profile'); }}
                    onMouseEnter={() => onPreload?.('profile')}
                    className="flex h-11 w-11 sm:w-auto sm:h-11 items-center justify-center sm:gap-2 rounded-full border border-slate-200 bg-white p-0 sm:px-4 sm:py-2.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px] uppercase shrink-0">
                      {user?.name?.[0] || 'U'}
                    </div>
                    <span className="hidden sm:inline text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">{user?.name?.split('@')[0]?.split(' ')?.[0] || 'User'}</span>
                  </a>

                  <button
                    onClick={handleLogout}
                    aria-label="Sign Out"
                    className="hidden sm:flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-500 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-rose-950/30 transition-colors duration-300 cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <a
                  href="/login"
                  onClick={(e) => { e.preventDefault(); onNavigate('login'); }}
                  onMouseEnter={() => onPreload?.('login')}
                  className="flex items-center gap-1.5 rounded-full bg-indigo-600 p-0 h-11 w-11 sm:w-auto sm:h-11 sm:px-5 sm:py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all duration-300 cursor-pointer justify-center shrink-0"
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign in</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>

      {/* Mobile Drawer Navigation overlay (rendered independently of sliding header panel) */}
      <AnimatePresence>
        {showMobileMenu && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Semi-transparent Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs"
              onClick={() => setShowMobileMenu(false)}
            />
            
            {/* Left-aligned Side Drawer menu container */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white p-5 shadow-2xl dark:bg-slate-950 flex flex-col space-y-6 overflow-y-auto max-h-screen"
            >
              
              {/* Drawer Header Brand & Close controller */}
              <div className="flex items-center justify-between border-b pb-4 dark:border-slate-700">
                <div className="flex items-center">
                  <span className="text-zinc-900 dark:text-white font-display font-black text-xl tracking-tight">gadgetsprohub</span>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  aria-label="Close menu"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 cursor-pointer transition-colors duration-300"
                  title="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Search Bar */}
              <div className="w-full">
                <SearchAutocompleteInput
                  onNavigate={(view, slug) => {
                    onNavigate(view, slug);
                    setShowMobileMenu(false);
                  }}
                  variant="navbar"
                  placeholder="Search gadgets..."
                />
              </div>

              {/* Mobile Nav items */}
              <div className="flex flex-col gap-1 font-semibold flex-grow">
                <a 
                  href="/"
                  onClick={(e) => { e.preventDefault(); onNavigate('home'); setShowMobileMenu(false); }}
                  onMouseEnter={() => onPreload?.('home')}
                  className={`block text-left text-sm py-2 px-3 rounded-lg cursor-pointer transition-all duration-300 ${currentView === 'home' ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-200 font-bold' : 'text-slate-500 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  Home
                </a>
                <a 
                  href="/products"
                  onClick={(e) => { e.preventDefault(); onNavigate('products'); setShowMobileMenu(false); }}
                  onMouseEnter={() => onPreload?.('products')}
                  className={`block text-left text-sm py-2 px-3 rounded-lg cursor-pointer transition-all duration-300 ${currentView === 'products' ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-200 font-bold' : 'text-slate-500 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  All Products
                </a>
                
                <a 
                  href="/blogs"
                  onClick={(e) => { e.preventDefault(); onNavigate('blogs'); setShowMobileMenu(false); }}
                  onMouseEnter={() => onPreload?.('blogs')}
                  className={`block text-left text-sm py-2 px-3 rounded-lg cursor-pointer transition-all duration-300 ${currentView === 'blogs' ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-200 font-bold' : 'text-slate-500 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  Blog Reviews
                </a>
                <a 
                  href="/contact"
                  onClick={(e) => { e.preventDefault(); onNavigate('contact'); setShowMobileMenu(false); }}
                  onMouseEnter={() => onPreload?.('contact')}
                  className={`block text-left text-sm py-2 px-3 rounded-lg cursor-pointer transition-all duration-300 ${currentView === 'contact' ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-200 font-bold' : 'text-slate-500 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  Contact Us
                </a>

                <button 
                  onClick={() => { setShowShortcutsModal(true); setShowMobileMenu(false); }}
                  className="flex items-center gap-2.5 text-left text-sm py-2 px-3 rounded-lg text-slate-500 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all duration-300"
                >
                  <Keyboard className="h-4 w-4 text-slate-400" />
                  <span className="flex-grow">Keyboard Shortcuts</span>
                  <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700 rounded">?</kbd>
                </button>

                {isAuthenticated && (
                  <div className="pt-2 mt-2 border-t dark:border-slate-700">
                    <p className="px-3 text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Your Account</p>
                    <button 
                      onClick={() => { onNavigate('profile'); setShowMobileMenu(false); }}
                      className={`flex items-center gap-3 w-full text-left text-sm py-2 px-3 rounded-lg cursor-pointer transition-all duration-300 ${currentView === 'profile' ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-200 font-bold' : 'text-slate-500 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <Heart className="h-4 w-4" />
                      <span>My Bookmarks</span>
                      {wishlist.length > 0 && (
                        <span className="ml-auto bg-rose-400 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-bold">
                          {wishlist.length}
                        </span>
                      )}
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => { onNavigate('admin'); setShowMobileMenu(false); }}
                        className={`flex items-center gap-3 w-full text-left text-sm py-2 px-3 rounded-lg cursor-pointer transition-all duration-300 ${currentView === 'admin' ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-200 font-bold' : 'text-slate-500 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </button>
                    )}
                    <button 
                      onClick={() => { handleLogout(); setShowMobileMenu(false); }}
                      className="flex items-center gap-3 w-full text-left text-sm py-2 px-3 rounded-lg text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors duration-300"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Footer brand marker */}
              <div className="border-t pt-4 dark:border-slate-700 text-center">
                <p className="text-[10px] text-slate-300 font-mono">gadgetsprohub Product Directory</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts modal */}
      <AnimatePresence>
        {showShortcutsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShortcutsModal(false)}
              className="absolute inset-0 bg-slate-800/60 dark:bg-black/80 backdrop-blur-xs"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950 text-slate-700 dark:text-slate-50 z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 dark:border-slate-700/80">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300">
                    <Keyboard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold tracking-tight">Keyboard Shortcuts Guide</h3>
                    <p className="text-[11px] text-slate-300 dark:text-slate-400 font-medium">Boost your browsing speed & efficiency</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShortcutsModal(false)}
                  className="rounded-full p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-300 hover:text-slate-500 dark:hover:text-slate-200 transition-colors duration-300 cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Shortcuts Grid List */}
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column: Navigation Keys */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 dark:text-slate-400 mb-3">Navigation</p>
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-200">Go to Home</span>
                        <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-800 bg-slate-50 border border-slate-100 rounded-md shadow-xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">H</kbd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-200">Go to Products</span>
                        <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-800 bg-slate-50 border border-slate-100 rounded-md shadow-xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">P</kbd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-200">Go to Blog</span>
                        <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-800 bg-slate-50 border border-slate-100 rounded-md shadow-xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">B</kbd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-200">Go to Contact</span>
                        <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-800 bg-slate-50 border border-slate-100 rounded-md shadow-xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">C</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions Keys */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 dark:text-slate-400 mb-3">Actions</p>
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-200">Focus Search</span>
                        <kbd className="px-2.5 py-1 text-xs font-bold font-mono text-slate-800 bg-slate-50 border border-slate-100 rounded-md shadow-xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">/</kbd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-200">Toggle Theme</span>
                        <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-800 bg-slate-50 border border-slate-100 rounded-md shadow-xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">T</kbd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-200 font-medium">Bookmarks & History</span>
                        <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-800 bg-slate-50 border border-slate-100 rounded-md shadow-xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">W</kbd>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-200">Admin Console</span>
                          <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-800 bg-slate-50 border border-slate-100 rounded-md shadow-xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">A</kbd>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Shortcuts */}
                <div className="border-t border-slate-50 pt-4 flex items-center justify-between dark:border-slate-700/80">
                  <div className="flex items-center gap-1 text-[11px] text-slate-300 dark:text-slate-400">
                    <kbd className="px-1 py-0.5 text-[9px] font-bold font-mono bg-slate-50 border border-slate-50 rounded dark:bg-slate-800 dark:border-slate-700">ESC</kbd>
                    <span>to close or blur inputs</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-indigo-400 dark:text-indigo-300 font-mono">
                    <kbd className="px-1 py-0.5 text-[9px] font-bold font-mono bg-indigo-50 border border-indigo-50 rounded text-indigo-500 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-200">?</kbd>
                    <span>or</span>
                    <kbd className="px-1 py-0.5 text-[9px] font-bold font-mono bg-indigo-50 border border-indigo-50 rounded text-indigo-500 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-200">K</kbd>
                    <span>to toggle this guide</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
