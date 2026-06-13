import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Search, Heart, User, LogOut, Menu, X, Inbox, LayoutDashboard, Gift, Sun, Moon, Keyboard } from 'lucide-react';
import { Category, Product, Blog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, slug?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, isAuthenticated, isAdmin, logout, wishlist } = useAuth();
  const { showToast } = useToast();
  const { isDark, toggleTheme } = useTheme();
  
  const handleLogout = () => {
    logout();
    onNavigate('home');
    showToast("Logout successful", "success");
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<{ products: Product[]; blogs: Blog[] }>({ products: [], blogs: [] });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const showMobileMenuRef = React.useRef(showMobileMenu);
  useEffect(() => {
    showMobileMenuRef.current = showMobileMenu;
  }, [showMobileMenu]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Custom states for running color longitudinally in catchy directions
  const [colorFlowDir, setColorFlowDir] = useState<'ltr' | 'rtl' | 'diagonal' | 'vertical'>('ltr');

  // Interactive search bar Refs for global power user focus shortcuts
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = React.useRef<HTMLInputElement>(null);

  // Global power users keyboard shortcuts help state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Scroll behavior state
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = React.useRef(0);

  // Scroll handler with instant reaction at any vertical screen position
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    
    const handleScroll = () => {
      if (showMobileMenuRef.current) {
        setIsVisible(true);
        return;
      }
      const currentScrollY = window.scrollY;
      const prevScrollY = lastScrollYRef.current;
      const diff = currentScrollY - prevScrollY;
      
      if (Math.abs(diff) < 1) return;

      if (currentScrollY <= 15) {
        // At the absolute top -> always show
        setIsVisible(true);
      } else if (diff > 1 && currentScrollY > 70) {
        // Scrolling down even slightly (or sliding up) -> hide navbar
        setIsVisible(false);
      } else if (diff < -1) {
        // Scrolling up even slightly (or sliding down) -> reveal navbar instantly
        setIsVisible(true);
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global Keyboard shortcuts implementation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively writing in form/input elements
      const target = e.target as HTMLElement;
      if (target) {
        const tagName = target.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || target.getAttribute('contenteditable') === 'true') {
          // Pressing escape inside the input blurs it & closes live search
          if (e.key === 'Escape') {
            target.blur();
            setShowResults(false);
          }
          return;
        }
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case '/':
          e.preventDefault();
          setIsVisible(true); // make sure navigation bar slides back in
          setTimeout(() => {
            if (showMobileMenu && mobileSearchInputRef.current) {
              mobileSearchInputRef.current.focus();
            } else if (searchInputRef.current) {
              searchInputRef.current.focus();
            }
          }, 50);
          showToast("Search field focused", "info");
          break;
        case 'h':
          e.preventDefault();
          onNavigate('home');
          showToast("Navigated: Home Screen", "info");
          break;
        case 'p':
          e.preventDefault();
          onNavigate('products');
          showToast("Navigated: All Products", "info");
          break;
        case 'b':
          e.preventDefault();
          onNavigate('blogs');
          showToast("Navigated: Blog Reviews", "info");
          break;
        case 'c':
          e.preventDefault();
          onNavigate('contact');
          showToast("Navigated: Contact Page", "info");
          break;
        case 't':
          e.preventDefault();
          toggleTheme();
          showToast("Theme changed", "success");
          break;
        case 'w':
          if (isAuthenticated) {
            e.preventDefault();
            onNavigate('profile');
            showToast("Navigated: Bookmarks & History", "info");
          } else {
            showToast("Login to view bookmarks!", "info");
          }
          break;
        case 'a':
          if (isAdmin) {
            e.preventDefault();
            onNavigate('admin');
            showToast("Navigated: Admin Dashboard", "info");
          }
          break;
        case '?':
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
  }, [onNavigate, isAdmin, isAuthenticated, toggleTheme, showMobileMenu, showShortcutsModal, showToast]);

  useEffect(() => {
    const dirs: ('ltr' | 'rtl' | 'diagonal' | 'vertical')[] = ['ltr', 'rtl', 'diagonal', 'vertical'];
    const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
    setColorFlowDir(randomDir);
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

  const getGradientClass = (dir: 'ltr' | 'rtl' | 'diagonal' | 'vertical') => {
    switch (dir) {
      case 'ltr': return 'animate-gradient-longitudinal-ltr bg-gradient-to-r';
      case 'rtl': return 'animate-gradient-longitudinal-rtl bg-gradient-to-l';
      case 'diagonal': return 'animate-gradient-longitudinal-diagonal bg-gradient-to-tr';
      case 'vertical': return 'animate-gradient-longitudinal-vertical bg-gradient-to-b';
    }
  };

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(err => console.warn('Navbar categorizing check failing:', err));
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Debounce search query to prevent flooding the backend API on rapid user typing
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length > 1) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
            setShowResults(true);
          }
        } catch (err) {
          console.error('Navbar query fail:', err);
        }
      }, 300); // 300ms debounce input typing rate
      return () => clearTimeout(timer);
    } else {
      setShowResults(false);
    }
  }, [searchQuery]);

  const handleResultClick = (view: string, slug: string) => {
    onNavigate(view, slug);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length > 0) {
      onNavigate('products', `search-${searchQuery}`);
      setSearchQuery('');
      setShowResults(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full animate-fade-in">
      {/* Scrollable translated header panel */}
      <div 
        className={`w-full border-b border-slate-200/50 bg-white/80 dark:border-slate-800/50 dark:bg-black/85 backdrop-blur-xl shadow-xs transition-transform duration-300 ease-in-out transform ${
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
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-700 dark:bg-slate-900/80 dark:text-slate-300 lg:hidden cursor-pointer overflow-hidden"
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
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onNavigate('home')} 
                className="flex items-center text-sm sm:text-lg font-bold tracking-tight cursor-pointer group"
              >
                <span className={`bg-gradient-to-r from-pink-500 via-rose-500 via-amber-400 via-emerald-400 via-teal-500 via-indigo-500 via-purple-600 to-pink-500 bg-clip-text text-transparent font-black tracking-tight text-sm sm:text-xl transition-all group-hover:scale-[1.02] ${getGradientClass(colorFlowDir)}`}>
                  gadgetsprohub
                </span>
              </button>
            </div>
          </div>

          {/* Navigation Links - Desktop */}
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <button 
              onClick={() => onNavigate('home')}
              className={`transition-colors hover:text-indigo-600 cursor-pointer ${currentView === 'home' ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Home
            </button>
            <button 
              onClick={() => onNavigate('products')}
              className={`transition-colors hover:text-indigo-600 cursor-pointer ${currentView === 'products' ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Products
            </button>

            <button 
              onClick={() => onNavigate('blogs')}
              className={`transition-colors hover:text-indigo-600 cursor-pointer ${currentView === 'blogs' ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Blog
            </button>
            <button 
              onClick={() => onNavigate('contact')}
              className={`transition-colors hover:text-indigo-600 cursor-pointer ${currentView === 'contact' ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Contact
            </button>
          </div>

          {/* Search Bar Input - Desktop */}
          <div className="relative hidden md:flex flex-1 max-w-sm">
            <form onSubmit={handleSearchSubmit} className="w-full">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Find products, electronic gadgets..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchQuery.length > 1 && setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 300)}
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-10 pr-10 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950"
                />
                <div className="absolute right-3.5 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 text-[10px] font-mono text-slate-450 shadow-xs pointer-events-none dark:border-slate-800 dark:bg-slate-850 dark:text-slate-500 select-none">
                  /
                </div>
              </div>
            </form>

            {/* Live Search Popup Overlay */}
            {showResults && (searchResults.products.length > 0 || searchResults.blogs.length > 0) && (
              <div className="absolute top-11 left-0 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in duration-200 max-h-[400px] overflow-y-auto">
                {searchResults.products.length > 0 && (
                  <div className="mb-3">
                    <h5 className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Products</h5>
                    <div className="space-y-1">
                      {searchResults.products.slice(0, 10).map(p => (
                        <button
                          key={p._id}
                          onClick={() => handleResultClick('product-detail', p.slug)}
                          className="w-full flex items-center justify-between text-left rounded-xl p-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                        >
                          <div className="truncate pr-4">
                            <p className="text-xs font-semibold truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{p.brand || 'Store Selection'}</p>
                          </div>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono shrink-0">₹{p.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {searchResults.blogs.length > 0 && (
                  <div>
                    <h5 className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Blog Posts</h5>
                    <div className="space-y-1">
                      {searchResults.blogs.map(b => (
                        <button
                          key={b._id}
                          onClick={() => handleResultClick('blog-detail', b.slug)}
                          className="w-full flex items-center justify-between text-left rounded-xl p-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                        >
                          <p className="text-xs font-semibold truncate">{b.title}</p>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0 font-mono">{b.category}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Header Icons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-650 shadow-sm hover:bg-slate-50 hover:text-indigo-650 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-[#1b365d]" />
              )}
            </button>

            {/* Wishlist Link - Desktop */}
            {isAuthenticated && (
              <button
                onClick={() => onNavigate('profile')}
                aria-label="Your bookmarks"
                className="hidden sm:flex relative h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-indigo-650 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Your bookmarks"
              >
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-rose-500 font-mono text-[8px] sm:text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                    {wishlist.length}
                  </span>
                )}
              </button>
            )}

            {/* Profile Menu tab */}
            <div className="relative">
              {isAuthenticated ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => onNavigate('admin')}
                      aria-label="Admin Dashboard"
                      className={`flex h-8 w-8 sm:h-auto sm:w-auto items-center justify-center sm:gap-1.5 rounded-full sm:px-3 sm:py-1.5 text-xs font-semibold cursor-pointer border ${currentView === 'admin' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                      title={isAdmin ? "Admin Dashboard" : undefined}
                    >
                      <LayoutDashboard className="h-4 w-4 sm:h-3.5 sm:w-3.5 animate-pulse" />
                      <span className="hidden sm:inline">Admin</span>
                    </button>
                  )}

                  <button
                    onClick={() => onNavigate('profile')}
                    className="flex h-8 w-8 sm:h-auto sm:w-auto items-center justify-center sm:gap-2 rounded-full border border-slate-100 bg-white sm:px-3 sm:py-1.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 cursor-pointer"
                  >
                    <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px] uppercase shrink-0">
                      {user?.name?.[0] || 'U'}
                    </div>
                    <span className="hidden sm:inline text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">{user?.name?.split('@')[0]?.split(' ')?.[0] || 'User'}</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    aria-label="Sign Out"
                    className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-slate-100 bg-white text-rose-500 shadow-sm hover:bg-rose-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 sm:px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

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
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setShowMobileMenu(false)}
            />
            
            {/* Left-aligned Side Drawer menu container */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white p-5 shadow-2xl dark:bg-slate-950 flex flex-col space-y-6"
            >
              
              {/* Drawer Header Brand & Close controller */}
              <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
                <div className="flex items-center">
                  <span className={`bg-gradient-to-r from-pink-500 via-rose-500 via-amber-400 via-emerald-400 via-teal-500 via-indigo-500 via-purple-600 to-pink-500 bg-clip-text text-transparent font-black text-lg tracking-tight ${getGradientClass(colorFlowDir)}`}>
                    gadgetsprohub
                  </span>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-850 dark:text-slate-350 cursor-pointer transition-colors"
                  title="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Search input wrapper */}
              <div className="relative">
                <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                  <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    placeholder="Find product catalog items..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => searchQuery.length > 1 && setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 300)}
                    className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-10 text-xs text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <div className="absolute right-3.5 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 text-[10px] font-mono text-slate-450 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-500 select-none">
                    /
                  </div>
                </form>

                {/* Mobile Search Live Popover Results */}
                {showResults && searchQuery.trim().length > 1 && (searchResults.products.length > 0 || searchResults.blogs.length > 0) && (
                  <div className="absolute top-11 left-0 z-[60] w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[220px] overflow-y-auto">
                    {searchResults.products.length > 0 && (
                      <div className="mb-3">
                        <h5 className="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Products</h5>
                        <div className="space-y-1">
                          {searchResults.products.slice(0, 10).map(p => (
                            <button
                              key={p._id}
                              onClick={() => {
                                handleResultClick('product-detail', p.slug);
                                setShowMobileMenu(false);
                              }}
                              className="w-full flex items-center justify-between text-left rounded-xl p-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                            >
                              <p className="text-[11px] font-semibold truncate pr-2">{p.name}</p>
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">₹{p.price}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {searchResults.blogs.length > 0 && (
                      <div>
                        <h5 className="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Blog Posts</h5>
                        <div className="space-y-1">
                          {searchResults.blogs.map(b => (
                            <button
                              key={b._id}
                              onClick={() => {
                                handleResultClick('blog-detail', b.slug);
                                setShowMobileMenu(false);
                              }}
                              className="w-full text-left rounded-xl p-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer transition-colors"
                            >
                              <p className="text-[11px] font-semibold truncate">{b.title}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Nav items */}
              <div className="flex flex-col gap-1 font-semibold flex-grow">
                <button 
                  onClick={() => { onNavigate('home'); setShowMobileMenu(false); }}
                  className={`text-left text-sm py-2 px-3 rounded-lg cursor-pointer transition-all ${currentView === 'home' ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                >
                  Home
                </button>
                <button 
                  onClick={() => { onNavigate('products'); setShowMobileMenu(false); }}
                  className={`text-left text-sm py-2 px-3 rounded-lg cursor-pointer transition-all ${currentView === 'products' ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                >
                  All Products
                </button>
                
                <button 
                  onClick={() => { onNavigate('blogs'); setShowMobileMenu(false); }}
                  className={`text-left text-sm py-2 px-3 rounded-lg cursor-pointer transition-all ${currentView === 'blogs' ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                >
                  Blog Reviews
                </button>
                <button 
                  onClick={() => { onNavigate('contact'); setShowMobileMenu(false); }}
                  className={`text-left text-sm py-2 px-3 rounded-lg cursor-pointer transition-all ${currentView === 'contact' ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                >
                  Contact Us
                </button>

                <button 
                  onClick={() => { setShowShortcutsModal(true); setShowMobileMenu(false); }}
                  className="flex items-center gap-2.5 text-left text-sm py-2 px-3 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-all"
                >
                  <Keyboard className="h-4 w-4 text-slate-500" />
                  <span className="flex-grow">Keyboard Shortcuts</span>
                  <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-slate-500 bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded">?</kbd>
                </button>

                {isAuthenticated && (
                  <div className="pt-2 mt-2 border-t dark:border-slate-800">
                    <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Account</p>
                    <button 
                      onClick={() => { onNavigate('profile'); setShowMobileMenu(false); }}
                      className={`flex items-center gap-3 w-full text-left text-sm py-2 px-3 rounded-lg cursor-pointer transition-all ${currentView === 'profile' ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                    >
                      <Heart className="h-4 w-4" />
                      <span>My Bookmarks</span>
                      {wishlist.length > 0 && (
                        <span className="ml-auto bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-bold">
                          {wishlist.length}
                        </span>
                      )}
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => { onNavigate('admin'); setShowMobileMenu(false); }}
                        className={`flex items-center gap-3 w-full text-left text-sm py-2 px-3 rounded-lg cursor-pointer transition-all ${currentView === 'admin' ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </button>
                    )}
                    <button 
                      onClick={() => { handleLogout(); setShowMobileMenu(false); }}
                      className="flex items-center gap-3 w-full text-left text-sm py-2 px-3 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Footer brand marker */}
              <div className="border-t pt-4 dark:border-slate-800 text-center">
                <p className="text-[10px] text-slate-400 font-mono">gadgetsprohub Product Directory</p>
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
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-100 z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-150 pb-4 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <Keyboard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold tracking-tight">Keyboard Shortcuts Guide</h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Boost your browsing speed & efficiency</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShortcutsModal(false)}
                  className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
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
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Navigation</p>
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-300">Go to Home</span>
                        <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-900 bg-slate-100 border border-slate-200 rounded-md shadow-xs dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800">H</kbd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-300">Go to Products</span>
                        <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-900 bg-slate-100 border border-slate-200 rounded-md shadow-xs dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800">P</kbd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-300">Go to Blog</span>
                        <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-900 bg-slate-100 border border-slate-200 rounded-md shadow-xs dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800">B</kbd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-300">Go to Contact</span>
                        <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-900 bg-slate-100 border border-slate-200 rounded-md shadow-xs dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800">C</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions Keys */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Actions</p>
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-300">Focus Search</span>
                        <kbd className="px-2.5 py-1 text-xs font-bold font-mono text-slate-900 bg-slate-100 border border-slate-200 rounded-md shadow-xs dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800">/</kbd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-300">Toggle Theme</span>
                        <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-900 bg-slate-100 border border-slate-200 rounded-md shadow-xs dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800">T</kbd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Bookmarks & History</span>
                        <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-900 bg-slate-100 border border-slate-200 rounded-md shadow-xs dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800">W</kbd>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-600 dark:text-slate-300">Admin Console</span>
                          <kbd className="px-2 py-1 text-xs font-bold font-mono text-slate-900 bg-slate-100 border border-slate-200 rounded-md shadow-xs dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800">A</kbd>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Shortcuts */}
                <div className="border-t border-slate-150 pt-4 flex items-center justify-between dark:border-slate-800/80">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-505">
                    <kbd className="px-1 py-0.5 text-[9px] font-bold font-mono bg-slate-50 border border-slate-150 rounded dark:bg-slate-900 dark:border-slate-800">ESC</kbd>
                    <span>to close or blur inputs</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-indigo-500 dark:text-indigo-400 font-mono">
                    <kbd className="px-1 py-0.5 text-[9px] font-bold font-mono bg-indigo-50 border border-indigo-150 rounded text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300">?</kbd>
                    <span>or</span>
                    <kbd className="px-1 py-0.5 text-[9px] font-bold font-mono bg-indigo-50 border border-indigo-150 rounded text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300">K</kbd>
                    <span>to toggle this guide</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
};
