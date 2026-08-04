import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Clock, Trash2, X, ArrowUpRight, Tag, Sparkles, Package, BookOpen, Loader2 } from 'lucide-react';
import { formatProductPrice } from '../utils/productUtils';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { Product, Blog } from '../types';
import { apiFetch } from '../utils/apiClient';
import { 
  getRecentSearches, 
  addRecentSearch, 
  removeRecentSearch, 
  clearRecentSearches, 
  RECENT_SEARCHES_EVENT, 
  POPULAR_SEARCH_SUGGESTIONS 
} from '../utils/recentSearches';

interface SearchAutocompleteInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onNavigate: (view: string, slug?: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  variant?: 'navbar' | 'hero' | 'catalog' | 'blog';
  showBlogResults?: boolean;
  autoFocus?: boolean;
  onClear?: () => void;
}

// Motion variants for smooth dropdown stagger animation
const dropdownVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.05,
      delayChildren: 0.01,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1],
    },
  },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.03,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.18,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const SearchAutocompleteInput: React.FC<SearchAutocompleteInputProps> = ({
  value: externalValue,
  onChange: externalOnChange,
  onNavigate,
  placeholder = 'Search products, brands, tech items...',
  className = '',
  inputClassName = '',
  dropdownClassName = '',
  variant = 'hero',
  showBlogResults = true,
  autoFocus = false,
  onClear
}) => {
  const [internalValue, setInternalValue] = useState(externalValue || '');
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbResults, setDbResults] = useState<{
    products: Product[];
    blogs: Blog[];
    categories: string[];
    brands: string[];
  }>({
    products: [],
    blogs: [],
    categories: [],
    brands: []
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal value with external controlled value if provided
  useEffect(() => {
    if (externalValue !== undefined) {
      setInternalValue(externalValue);
    }
  }, [externalValue]);

  // Load and subscribe to recent searches changes
  useEffect(() => {
    setRecentSearches(getRecentSearches());

    const handleRecentUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail) {
        setRecentSearches(customEvent.detail);
      } else {
        setRecentSearches(getRecentSearches());
      }
    };

    window.addEventListener(RECENT_SEARCHES_EVENT, handleRecentUpdate);
    return () => {
      window.removeEventListener(RECENT_SEARCHES_EVENT, handleRecentUpdate);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce API fetch for database product autocomplete matching
  const currentQuery = externalValue !== undefined ? externalValue : internalValue;
  const trimmedQuery = currentQuery.trim();

  useEffect(() => {
    let isSubscribed = true;

    if (trimmedQuery.length >= 1) {
      const controller = new AbortController();
      setIsLoading(true);

      const timer = setTimeout(async () => {
        try {
          const res = await apiFetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
            signal: controller.signal
          });
          if (res.ok) {
            const data = await res.json();
            if (isSubscribed && !controller.signal.aborted) {
              setDbResults({
                products: data.products || [],
                blogs: data.blogs || [],
                categories: data.categories || [],
                brands: data.brands || []
              });
            }
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn('Search autocomplete fetch error:', err);
          }
        } finally {
          if (isSubscribed && !controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      }, 200);

      return () => {
        isSubscribed = false;
        clearTimeout(timer);
        controller.abort();
      };
    } else {
      setDbResults({ products: [], blogs: [], categories: [], brands: [] });
      setIsLoading(false);
    }
  }, [trimmedQuery]);

  // Handle global keyboard focus shortcut event
  useEffect(() => {
    const handleFocusEvent = () => {
      inputRef.current?.focus();
      setIsOpen(true);
    };
    window.addEventListener('focus-search-input', handleFocusEvent);
    return () => window.removeEventListener('focus-search-input', handleFocusEvent);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInternalValue(newVal);
    if (externalOnChange) {
      externalOnChange(newVal);
    }
    setIsOpen(true);
  };

  const handleSelectSearchQuery = (query: string) => {
    addRecentSearch(query);
    setInternalValue(query);
    if (externalOnChange) {
      externalOnChange(query);
    }
    setIsOpen(false);
    onNavigate('products', `search-${query}`);
  };

  const handleSelectProduct = (product: Product) => {
    if (product.name) {
      addRecentSearch(product.name);
    }
    setIsOpen(false);
    onNavigate('product-detail', product.slug);
  };

  const handleSelectBlog = (blog: Blog) => {
    setIsOpen(false);
    onNavigate('blog-detail', blog.slug);
  };

  const handleRemoveRecentItem = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    e.preventDefault();
    removeRecentSearch(query);
  };

  const handleClearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    clearRecentSearches();
  };

  const handleClearInput = () => {
    setInternalValue('');
    if (externalOnChange) {
      externalOnChange('');
    }
    if (onClear) {
      onClear();
    }
    inputRef.current?.focus();
    setIsOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmedQuery.length > 0) {
      addRecentSearch(trimmedQuery);
      setIsOpen(false);
      onNavigate('products', `search-${trimmedQuery}`);
    }
  };

  // Compute matching recent searches based on typed letters
  const matchingRecentSearches = trimmedQuery.length > 0
    ? recentSearches.filter(s => s.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : recentSearches;

  // Matching popular suggestions when typed or empty
  const matchingPopularSuggestions = trimmedQuery.length > 0
    ? POPULAR_SEARCH_SUGGESTIONS.filter(s => s.toLowerCase().includes(trimmedQuery.toLowerCase()) && !recentSearches.includes(s)).slice(0, 5)
    : POPULAR_SEARCH_SUGGESTIONS.filter(s => !recentSearches.includes(s)).slice(0, 6);

  const hasAnyResults = 
    matchingRecentSearches.length > 0 ||
    dbResults.products.length > 0 ||
    dbResults.categories.length > 0 ||
    dbResults.brands.length > 0 ||
    (showBlogResults && dbResults.blogs.length > 0) ||
    matchingPopularSuggestions.length > 0;

  // Helper to highlight typed query characters
  const renderHighlightedText = (text: string | null | undefined, highlight: string) => {
    if (!text) return <span></span>;
    if (!highlight || !highlight.trim()) return <span>{text}</span>;
    try {
      const parts = text.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
      return (
        <span>
          {parts.map((part, i) => (
            part.toLowerCase() === highlight.toLowerCase() ? (
              <span key={i} className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-0.5 rounded">
                {part}
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          ))}
        </span>
      );
    } catch (err) {
      return <span>{text}</span>;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleFormSubmit} className="relative w-full">
        <div className="relative flex items-center w-full">
          <Search className={`absolute left-3.5 h-4 w-4 pointer-events-none text-slate-400 transition-colors duration-300 ${isOpen ? 'text-indigo-500 dark:text-indigo-400' : ''}`} />
          
          <input
            ref={inputRef}
            type="text"
            value={currentQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={inputClassName || `w-full rounded-2xl border border-slate-200/80 bg-white/90 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-900`}
          />

          {isLoading ? (
            <div className="absolute right-3.5 flex items-center pointer-events-none">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            </div>
          ) : currentQuery ? (
            <button
              type="button"
              onClick={handleClearInput}
              aria-label="Clear search query"
              className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700/60 transition-all duration-300 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </form>

      {/* Dynamic Autocomplete Dropdown Popup with Motion Stagger Animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={dropdownVariants}
            className={`absolute z-50 left-0 right-0 mt-2 rounded-2xl border border-slate-200/90 bg-white/98 backdrop-blur-xl p-3 shadow-2xl dark:border-slate-700/90 dark:bg-slate-900/98 max-h-[480px] overflow-y-auto text-left ${dropdownClassName}`}
          >
            {!hasAnyResults && trimmedQuery.length > 0 && !isLoading && (
              <motion.div variants={itemVariants} className="p-6 text-center text-slate-400">
                <Package className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No product matches for "{trimmedQuery}"</p>
                <p className="text-[11px] text-slate-400 mt-1">Try checking for typos or searching a broader term like "laptop" or "headphones".</p>
              </motion.div>
            )}

            {/* SECTION 1: Matching Recent Searches */}
            {matchingRecentSearches.length > 0 && (
              <motion.div variants={sectionVariants} className="mb-3">
                <div className="flex items-center justify-between px-2 py-1 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                    <Clock className="h-3 w-3 text-indigo-500 shrink-0" />
                    {trimmedQuery ? 'Matched Recent Searches' : 'Recent Searches'}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllRecent}
                    className="text-[10px] font-bold uppercase text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1 transition-colors duration-300 cursor-pointer bg-transparent border-none p-0"
                    title="Clear all recent searches"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                </div>

                <div className="space-y-0.5">
                  {matchingRecentSearches.map((item, idx) => (
                    <motion.div
                      key={`recent-${item}-${idx}`}
                      variants={itemVariants}
                      onClick={() => handleSelectSearchQuery(item)}
                      className="group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-all duration-300 cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Clock className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors duration-300 shrink-0" />
                        <span className="truncate">{renderHighlightedText(item, trimmedQuery)}</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleRemoveRecentItem(e, item)}
                        title="Delete search from recent list"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all duration-300 cursor-pointer border-none bg-transparent"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SECTION 2: Database Product Matches */}
            {dbResults.products.length > 0 && (
              <motion.div variants={sectionVariants} className="mb-3">
                <div className="flex items-center justify-between px-2 py-1 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                    <Package className="h-3 w-3 text-emerald-500 shrink-0" />
                    Database Product Matches ({dbResults.products.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">In Stock</span>
                </div>

                <div className="space-y-1">
                  {dbResults.products.map((product) => {
                    const img = product.images?.[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=150&q=80';
                    return (
                      <motion.div
                        key={`db-product-${product._id}`}
                        variants={itemVariants}
                        onClick={() => handleSelectProduct(product)}
                        className="group flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                      >
                        <img
                          src={img}
                          alt={product.name}
                          className="h-10 w-10 object-contain rounded-lg bg-white dark:bg-slate-800 p-1 border border-slate-100 dark:border-slate-700 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {renderHighlightedText(product.name, trimmedQuery)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {product.brand && (
                              <span className="text-[10px] text-slate-400 font-medium truncate">
                                {product.brand}
                              </span>
                            )}
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${product.inStock ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                              {product.inStock ? 'Available' : 'Out of Stock'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                            {formatProductPrice(product.price, product)}
                          </span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-500 ml-auto mt-0.5 transition-colors duration-300" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* SECTION 3: Matching Categories & Brands */}
            {(dbResults.categories.length > 0 || dbResults.brands.length > 0) && (
              <motion.div variants={sectionVariants} className="mb-3">
                <div className="px-2 py-1 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                    <Tag className="h-3 w-3 text-amber-500 shrink-0" />
                    Matching Categories & Brands
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-1">
                  {dbResults.categories.map((cat, idx) => (
                    <motion.button
                      key={`cat-${cat}-${idx}`}
                      variants={itemVariants}
                      type="button"
                      onClick={() => handleSelectSearchQuery(cat)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60 transition-all duration-300 cursor-pointer"
                    >
                      <Tag className="h-3 w-3 text-amber-500" />
                      <span>{renderHighlightedText(cat, trimmedQuery)}</span>
                    </motion.button>
                  ))}
                  {dbResults.brands.map((brand, idx) => (
                    <motion.button
                      key={`brand-${brand}-${idx}`}
                      variants={itemVariants}
                      type="button"
                      onClick={() => handleSelectSearchQuery(brand)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 transition-all duration-300 cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3 text-indigo-500" />
                      <span>{renderHighlightedText(brand, trimmedQuery)}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SECTION 4: Matching Blog Articles */}
            {showBlogResults && dbResults.blogs.length > 0 && (
              <motion.div variants={sectionVariants} className="mb-3">
                <div className="px-2 py-1 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                    <BookOpen className="h-3 w-3 text-indigo-500 shrink-0" />
                    Buying Guides & Reviews
                  </span>
                </div>
                <div className="space-y-1">
                  {dbResults.blogs.map((blog) => (
                    <motion.div
                      key={`blog-${blog._id}`}
                      variants={itemVariants}
                      onClick={() => handleSelectBlog(blog)}
                      className="group flex items-center justify-between p-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all duration-300 cursor-pointer"
                    >
                      <span className="truncate pr-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {renderHighlightedText(blog.title, trimmedQuery)}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 shrink-0 font-mono">
                        {blog.category || 'Article'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SECTION 5: Popular / Trending Suggestions */}
            {matchingPopularSuggestions.length > 0 && (
              <motion.div variants={sectionVariants}>
                <div className="px-2 py-1 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                    <Sparkles className="h-3 w-3 text-indigo-500 shrink-0" />
                    Popular Tech Searches
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-1">
                  {matchingPopularSuggestions.map((term, idx) => (
                    <motion.button
                      key={`popular-${term}-${idx}`}
                      variants={itemVariants}
                      type="button"
                      onClick={() => handleSelectSearchQuery(term)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200/60 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 transition-all duration-300 cursor-pointer"
                    >
                      <Search className="h-3 w-3 text-slate-400" />
                      <span>{renderHighlightedText(term, trimmedQuery)}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Direct Form Submit Action Footer */}
            {trimmedQuery && (
              <motion.div variants={itemVariants} className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => handleSelectSearchQuery(trimmedQuery)}
                  className="w-full py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Search all results for "{trimmedQuery}"</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
