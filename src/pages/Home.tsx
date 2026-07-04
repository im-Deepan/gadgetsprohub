import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';
import { Product, Category } from '../types';
import { 
  Search, Heart, Flame, Trophy, Sparkles, 
  ArrowRight, Clock, History, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Helmet } from '../components/Helmet';
import { BorderGlow } from '../components/BorderGlow';
import { GlareHover } from '../components/GlareHover';
import { AdSenseBanner } from '../components/AdSenseBanner';
import { LazySection } from '../components/LazySection';
import { FeaturedCollections } from '../components/FeaturedCollections';
import { RecentViewedMarquee } from '../components/RecentViewedMarquee';
import { Breadcrumb } from '../components/Breadcrumb';
import { NewsletterSubscribe } from '../components/NewsletterSubscribe';

import { getCategoryId, getCategoryName } from '../utils/category';
import { safeSetItem, safeGetItem, safeRemoveItem } from '../utils/localStorage';

interface HomeProps {
  onNavigate: (view: string, slug?: string) => void;
  onPreload?: (view: any, slug?: string) => void;
}

const ProductCardSkeleton = () => (
  <div className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-800 overflow-hidden animate-pulse">
    <div className="h-32 sm:h-44 bg-slate-50 dark:bg-slate-800/50 shrink-0"></div>
    <div className="p-3 sm:p-5 flex flex-col flex-grow space-y-2.5">
      <div className="h-3.5 w-1/3 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
      <div className="h-5 w-full bg-slate-50 dark:bg-slate-800/50 rounded"></div>
      <div className="h-4 w-3/4 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
      <div className="mt-auto pt-3 border-t border-slate-105 dark:border-slate-700/80 flex items-center justify-between">
        <div className="h-5 w-16 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
        <div className="h-6 w-20 bg-slate-50 dark:bg-slate-800/50 rounded-lg"></div>
      </div>
    </div>
  </div>
);

export const Home: React.FC<HomeProps> = ({ onNavigate, onPreload }) => {
  const { wishlist, toggleWishlist, isAuthenticated, user } = useAuth();
  const { showToast } = useToast();

  const [pickLeftModalProd, setPickLeftModalProd] = useState<Product | null>(null);
  const [pickLeftEmail, setPickLeftEmail] = useState(safeGetItem('pick_left_subscribed_email') || '');
  const [isSubmittingPickLeft, setIsSubmittingPickLeft] = useState(false);
  
  // 1. Trending Queries via TanStack Query
  const { data: trendingData = [] } = useQuery<Product[]>({
    queryKey: ['trending'],
    queryFn: async ({ signal }) => {
      const res = await apiFetch('/api/trending', { signal });
      if (!res.ok) throw new Error('Failed to load trending products');
      return res.json();
    }
  });
  const trending = trendingData;

  // 2. Categories Queries via TanStack Query
  const { data: categoriesData = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async ({ signal }) => {
      const res = await apiFetch('/api/categories', { signal });
      if (!res.ok) throw new Error('Failed to load categories');
      return res.json();
    }
  });
  const categories = categoriesData;

  // 3. Products Queries via TanStack Query
  const { data: homeProductsData } = useQuery({
    queryKey: ['homeProducts'],
    queryFn: async ({ signal }) => {
      const res = await apiFetch('/api/products?limit=100', { signal });
      if (!res.ok) throw new Error('Failed to load products');
      return res.json();
    }
  });
  const allProducts = homeProductsData?.products || [];

  const loading = !homeProductsData || categories.length === 0;

  const [homeSearch, setHomeSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(6);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentViewed, setRecentViewed] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  const handlePickLeftClick = (product: Product) => {
    const catName = typeof product.category === 'object' && product.category 
      ? (product.category as any).name 
      : (categories.find(c => c._id === product.category || c.slug === product.category)?.name || 'Electronics');

    if (user && user.email) {
      // Auto-register interest for logged in user
      apiFetch('/api/products/pick-left-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product._id, email: user.email, categoryName: catName })
      })
      .then(async (res) => {
        if (res.ok) {
          showToast(`🔔 Direct alerts enabled! We'll email you at ${user.email} when new ${catName} products arrive.`, 'success', 5000);
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn('Pick-left interest error:', errData.error);
        }
      })
      .catch(e => console.warn('Interest tracking error:', e));

      // Navigate to product page
      if (product.slug) onNavigate('product-detail', product.slug);
    } else {
      // Set state to open the popup modal
      setPickLeftModalProd(product);
    }
  };

  const handlePickLeftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickLeftModalProd) return;

    if (!pickLeftEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pickLeftEmail)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    setIsSubmittingPickLeft(true);
    const catName = typeof pickLeftModalProd.category === 'object' && pickLeftModalProd.category 
      ? (pickLeftModalProd.category as any).name 
      : (categories.find(c => c._id === pickLeftModalProd.category || c.slug === pickLeftModalProd.category)?.name || 'Electronics');

    try {
      const res = await apiFetch('/api/products/pick-left-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: pickLeftModalProd._id, email: pickLeftEmail, categoryName: catName })
      });

      if (res.ok) {
        safeSetItem('pick_left_subscribed_email', pickLeftEmail);
        showToast(`📬 Newsletter alert registered! We'll email you at ${pickLeftEmail} when new ${catName} items are added.`, 'success', 5000);
        
        // Navigate
        const slug = pickLeftModalProd.slug;
        setPickLeftModalProd(null);
        if (slug) onNavigate('product-detail', slug);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to subscribe to category alerts.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error occurred.', 'error');
    } finally {
      setIsSubmittingPickLeft(false);
    }
  };

  // Load recent searches on client side
  useEffect(() => {
    try {
      const stored = safeGetItem('aff_recent_searches');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed);
          }
        } catch (e) {
          setRecentSearches([]);
        }
      }
      const viewedStored = safeGetItem('aff_recent_viewed');
      if (viewedStored) {
        let parsed: Product[] = [];
        try {
          parsed = JSON.parse(viewedStored);
        } catch (e) {
          parsed = [];
        }
        if (Array.isArray(parsed)) {
          // Deduplicate based on id & _id
          const seen = new Set<string>();
          const uniques: Product[] = [];
          for (const item of parsed) {
            if (!item) continue;
            const itemId = String(item._id || item.id || '');
            if (itemId && !seen.has(itemId)) {
              seen.add(itemId);
              uniques.push(item);
            }
          }
          setRecentViewed(uniques);
        }
      }
    } catch (e) {
      console.warn('Home loaded recently viewed warning:', e);
    }
  }, []);

  // Listen to clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Listener to reset home filters/search when requested (e.g. clicking Home Hub)
  useEffect(() => {
    const handleReset = () => {
      setHomeSearch('');
      setActiveCategory('all');
      setVisibleCount(6);
    };
    window.addEventListener('reset-home-filters', handleReset);
    return () => window.removeEventListener('reset-home-filters', handleReset);
  }, []);

  const saveSearchToLocal = (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length > 1) {
      try {
        const stored = safeGetItem('aff_recent_searches');
        let current: string[] = [];
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            current = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            current = [];
          }
        }
        const filtered = current.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
        const updated = [trimmed, ...filtered].slice(0, 5);
        safeSetItem('aff_recent_searches', JSON.stringify(updated));
        setRecentSearches(updated);
      } catch (err) {
        console.warn('Home save search warning:', err);
      }
    }
  };

  const handleRemoveRecentSearch = (e: React.MouseEvent, queryToRemove: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== queryToRemove);
    setRecentSearches(updated);
    safeSetItem('aff_recent_searches', JSON.stringify(updated));
  };

  const handleClearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      safeRemoveItem('aff_recent_searches');
    } catch (err) {
      console.warn('Home clear search warning:', err);
    }
  };

  // Synchronize and log searches & filter criteria to MongoDB accordingly
  useEffect(() => {
    if (homeSearch.trim() !== '' || activeCategory !== 'all') {
      const handler = setTimeout(() => {
        const selectedCat = categories.find(c => c._id === activeCategory);
        apiFetch('/api/analytics/filters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchQuery: homeSearch || undefined,
            categoryId: activeCategory !== 'all' ? activeCategory : undefined,
            categorySlug: selectedCat ? selectedCat.slug : undefined
          })
        }).catch(err => {
          console.error('[Home filters tracking]', err);
        });
      }, 700);
      return () => clearTimeout(handler);
    }
    return;
  }, [homeSearch, activeCategory, categories]);

  useEffect(() => {
    if (allProducts.length > 0) {
      setRecentViewed(current => {
        const cleared = safeGetItem('aff_history_cleared') === 'true';
        if (cleared) {
          return [];
        }
        if (current.length === 0) {
          const selected: Product[] = [];
          const seenBrands = new Set<string>();
          const seenIds = new Set<string>();
          for (const p of allProducts) {
            const pId = String(p._id || p.id || '');
            if (!seenBrands.has(p.brand || '') && p.brand && pId && !seenIds.has(pId) && selected.length < 5) {
              seenBrands.add(p.brand);
              seenIds.add(pId);
              selected.push({
                _id: p._id,
                name: p.name,
                slug: p.slug,
                price: p.price,
                originalPrice: p.originalPrice,
                discount: p.discount,
                images: p.images,
                brand: p.brand,
                category: p.category,
                description: p.description,
                rating: p.rating
              } as Product);
            }
          }
          if (selected.length < 5) {
            for (const p of allProducts) {
              const pId = String(p._id || p.id || '');
              if (pId && !seenIds.has(pId) && selected.length < 5) {
                seenIds.add(pId);
                selected.push({
                  _id: p._id,
                  name: p.name,
                  slug: p.slug,
                  price: p.price,
                  originalPrice: p.originalPrice,
                  discount: p.discount,
                  images: p.images,
                  brand: p.brand,
                  category: p.category,
                  description: p.description,
                  rating: p.rating
                } as Product);
              }
            }
          }
          return selected;
        }
        return current;
      });
    }
  }, [allProducts]);

  // Filter products in real-time based on the hero search query and active category filter
  const filteredProducts = React.useMemo(() => {
    return allProducts.filter((prod: Product) => {
      const matchesSearch = 
        prod.name.toLowerCase().includes(homeSearch.toLowerCase()) ||
        (prod.brand && prod.brand.toLowerCase().includes(homeSearch.toLowerCase())) ||
        prod.description.toLowerCase().includes(homeSearch.toLowerCase());
      
      if (activeCategory === 'all') {
        return matchesSearch;
      } else if (activeCategory === 'trending') {
        return matchesSearch && Boolean(prod.trending);
      } else {
        const prodCatId = getCategoryId(prod.category);
        return matchesSearch && String(prodCatId) === String(activeCategory);
      }
    });
  }, [allProducts, homeSearch, activeCategory]);

  // Sort filtered products by latest added/updated
  const latestProductsToShow = React.useMemo(() => {
    const parsedTimes = new Map<string, number>();
    filteredProducts.forEach((p: Product) => {
      const time = p.createdAt ? new Date(p.createdAt).getTime() : 0;
      parsedTimes.set(p._id, time);
    });

    return [...filteredProducts].sort((a, b) => {
      const aTime = parsedTimes.get(a._id) ?? 0;
      const bTime = parsedTimes.get(b._id) ?? 0;
      if (bTime !== aTime) return bTime - aTime;
      return String(b._id).localeCompare(String(a._id));
    });
  }, [filteredProducts]);

  // Dynamically group products into collections/categories with their latest 4 product images
  const collectionsData = React.useMemo(() => {
    const list: { category: Category, products: Product[], latestFour: Product[] }[] = [];

    // Filter standard categories based on activeCategory
    const filteredCats = activeCategory === 'all' 
      ? categories 
      : categories.filter(c => String(c._id) === String(activeCategory));

    const standardCols = filteredCats.map(cat => {
      let catProducts = allProducts.filter((prod: Product) => {
        const prodCatId = getCategoryId(prod.category);
        return String(prodCatId) === String(cat._id);
      });

      // Filter by search query if user typed in the hero search bar
      if (homeSearch.trim()) {
        const query = homeSearch.toLowerCase();
        catProducts = catProducts.filter((prod: Product) => 
          prod.name.toLowerCase().includes(query) ||
          (prod.brand && prod.brand.toLowerCase().includes(query)) ||
          prod.description.toLowerCase().includes(query)
        );
      }

      // Sort standard categories by latest added/updated
      const timestamps = new Map<string, number>();
      const sorted = [...catProducts].sort((a, b) => {
        let aTime = timestamps.get(a._id);
        if (aTime === undefined) {
          aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          if (isNaN(aTime)) aTime = 0;
          timestamps.set(a._id, aTime);
        }
        let bTime = timestamps.get(b._id);
        if (bTime === undefined) {
          bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (isNaN(bTime)) bTime = 0;
          timestamps.set(b._id, bTime);
        }
        if (bTime !== aTime) return bTime - aTime;
        return String(b._id).localeCompare(String(a._id));
      });

      return {
        category: cat,
        products: sorted,
        latestFour: sorted.slice(0, 4)
      };
    }).filter((col: any) => col.products.length > 0);

    return [...list, ...standardCols];
  }, [categories, allProducts, activeCategory, homeSearch]);

  const handleHomeSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = homeSearch.trim();
    if (!query) return;

    saveSearchToLocal(query);
    onNavigate('products', `search-${query}`);
  };

  return (
    <div className="space-y-16 pb-20 bg-slate-50 dark:bg-black transition-colors duration-300 text-slate-800 dark:text-slate-50">
      <Helmet>
        <title>gadgetsprohub | Premium Electronics & Smart Gear Directory</title>
        <meta name="description" content="Discover trending, premium electronics and detailed specifications. Find honest reviews and the best deals on smartphones, laptops, audio gear, and wearables at gadgetsprohub." />
        <meta name="keywords" content="electronics, smart gear, gadget directory, smartphones, laptops, audio gear, smartwatches, tech reviews, budget gadgets, gadgetsprohub" />
        <link rel="canonical" href="https://gadgetsprohub.com" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://gadgetsprohub.com" />
        <meta property="og:title" content="gadgetsprohub | Premium Electronics & Smart Gear Directory" />
        <meta property="og:description" content="Discover trending, premium electronics, detailed specifications, honest specifications reviews, and the best current tech deals." />
        <meta property="og:image" content="/favicon.png" />
        <meta property="og:site_name" content="gadgetsprohub" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://gadgetsprohub.com" />
        <meta name="twitter:title" content="gadgetsprohub | Premium Electronics & Smart Gear Directory" />
        <meta name="twitter:description" content="Discover trending, premium electronics, detailed specifications, honest specifications reviews, and the best current tech deals." />
        <meta name="twitter:image" content="/favicon.png" />
        <meta name="twitter:label1" content="Directory Size" />
        <meta name="twitter:data1" content="Thousands of Premium Gadgets" />

        <meta name="robots" content="index, follow" />
      </Helmet>

      {/* BREADCRUMB */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 -mb-12 relative z-20">
        <Breadcrumb 
          items={[
            { label: 'Home', onClick: () => { setActiveCategory('all'); setHomeSearch(''); }, isCurrentPage: activeCategory === 'all' && !homeSearch },
            ...(activeCategory !== 'all' ? [{
              label: activeCategory === 'trending' ? 'Trending' : (categories.find(c => String(c._id) === String(activeCategory))?.name || 'Category'),
              onClick: () => { setHomeSearch(''); },
              isCurrentPage: !homeSearch
            }] : []),
            ...(homeSearch ? [{
              label: `Search: ${homeSearch}`,
              isCurrentPage: true
            }] : [])
          ]}
        />
      </div>

      <section className="relative overflow-hidden py-24 sm:py-32 border-b border-slate-100/50 dark:border-slate-700/50 text-center flex flex-col justify-center items-center isolate">
        {/* Decorative background gradients */}
        <div className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[-20rem] dark:hidden">
          <div className="relative left-1/2 -z-10 aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-40rem)] sm:w-[72.1875rem]" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}></div>
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-50 bg-indigo-50/80 backdrop-blur-md px-5 py-2 text-xs font-bold text-indigo-800 shadow-sm dark:bg-indigo-950/30 dark:border-indigo-700/50 dark:text-indigo-200"
          >
            <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
            <span className="tracking-wide uppercase">Carefully Checked Products & Direct Safe Links</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="mt-8 text-4xl font-black tracking-tighter text-slate-800 sm:text-6xl lg:text-7xl dark:text-white leading-[1.1]"
          >
            Discover the Best <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 dark:bg-gradient-to-r dark:from-slate-50 dark:to-slate-200">
              Products Before You Buy
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="mt-6 text-base sm:text-lg text-slate-500 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed"
          >
            Search thousands of curated gadgets, deep technical specifications, and verify reviews instantly.
          </motion.p>

          {/* Large Focused Dynamic Action Search Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
            className="mt-10 mx-auto max-w-2xl relative" 
            ref={searchContainerRef}
          >
            <form onSubmit={handleHomeSearchSubmit} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 to-purple-500 dark:from-slate-700 dark:to-slate-705 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
                  <Search className="h-5 w-5 text-indigo-400 dark:text-indigo-300" />
                </span>
                <input
                  type="text"
                  value={homeSearch}
                  onChange={(e) => setHomeSearch(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search products, brands, tech items..."
                  className="w-full rounded-[1.75rem] border border-slate-100/50 bg-white/90 backdrop-blur-md py-4 pl-14 pr-16 text-base text-slate-800 shadow-xl outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 dark:border-slate-600/50 dark:bg-slate-800/90 dark:text-white"
                />
                {homeSearch && (
                  <button 
                    type="button"
                    aria-label="Clear search" onClick={() => setHomeSearch('')}
                    className="absolute inset-y-0 right-4 flex items-center p-2 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Premium Interactive Recent Searches Dropdown */}
            {showDropdown && recentSearches.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800 text-left animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-50 dark:border-slate-700/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
                    <Clock className="h-3 w-3 text-slate-300 shrink-0" />
                    Recent Searches
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllRecentSearches}
                    className="text-[10px] font-bold uppercase text-rose-400 hover:text-rose-500 transition-colors cursor-pointer border-none bg-transparent p-0"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((query, index) => (
                    <div
                      key={`recent-search-${query}-${index}`}
                      onClick={() => {
                        setHomeSearch(query);
                        saveSearchToLocal(query);
                        setShowDropdown(false);
                        onNavigate('products', `search-${query}`);
                      }}
                      className="group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <History className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                        <span className="truncate">{query}</span>
                      </span>
                      <button
                        type="button"
                        aria-label="Remove recent search" onClick={(e) => handleRemoveRecentSearch(e, query)}
                        className="rounded-md p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-300 hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-200 transition-all cursor-pointer border-none bg-transparent"
                        title="Remove Search"
                      >
                        <X className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Quick Categories Filter (Max 5) */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            <button
              onClick={() => {
                setActiveCategory('all');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all border shadow-sm cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-indigo-500 text-white border-indigo-500 dark:bg-indigo-400 dark:border-indigo-300'
                  : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600'
              }`}
            >
              All Collections
            </button>
            <button
              onClick={() => {
                setActiveCategory('trending');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all border shadow-sm cursor-pointer flex items-center gap-1 ${
                activeCategory === 'trending'
                  ? 'bg-indigo-500 text-white border-indigo-500 dark:bg-indigo-400 dark:border-indigo-300'
                  : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600'
              }`}
            >
              <Flame className="h-3 w-3 text-slate-400 dark:text-slate-300" />
              <span>Trending Choices</span>
            </button>
            {categories.slice(0, 5).map(cat => (
              <button
                key={cat._id}
                onClick={() => {
                  setActiveCategory(activeCategory === cat._id ? 'all' : cat._id);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all border shadow-sm cursor-pointer ${
                  activeCategory === cat._id
                    ? 'bg-indigo-500 text-white border-indigo-500 dark:bg-indigo-400 dark:border-indigo-300'
                    : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* Pick where you left off */}
      {recentViewed.length > 0 && activeCategory === 'all' && (
        <RecentViewedMarquee
          recentViewed={recentViewed}
          onNavigate={onNavigate}
          onPickLeftClick={handlePickLeftClick}
          onClear={() => {
            setRecentViewed([]);
            safeRemoveItem('aff_recent_viewed');
            safeSetItem('aff_history_cleared', 'true');
          }}
        />
      )}

      {/* FEATURED SPOTLIGHTS BENTO BANNER */}
      {!loading && allProducts.length > 0 && (
        <FeaturedCollections
          onNavigate={onNavigate}
          allProducts={allProducts}
          categories={categories}
        />
      )}

      {/* 2. CURATED COLLECTIONS BOARD */}
      <LazySection placeholder={
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-6 w-48 bg-slate-100/50 dark:bg-slate-700 rounded animate-pulse mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="h-72 bg-gradient-to-br from-slate-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-950/50 rounded-3xl animate-pulse"></div>
            <div className="h-72 bg-gradient-to-br from-slate-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-950/50 rounded-3xl animate-pulse hidden md:block"></div>
            <div className="h-72 bg-gradient-to-br from-slate-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-950/50 rounded-3xl animate-pulse hidden lg:block"></div>
          </div>
        </div>
      }>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-8 border-b border-slate-100/60 pb-3 dark:border-slate-700">
          <Trophy className="h-5 w-5 text-slate-500 dark:text-slate-300" />
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-800 dark:text-white font-sans">
            Curated Collections
          </h2>
          <span className="ml-2 rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800/80 dark:text-slate-200 font-mono">
            Latest Curation
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={`skeleton-trend-${i}`} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 animate-pulse space-y-4">
                <div className="h-6 w-1/3 bg-slate-50 rounded"></div>
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="aspect-square bg-slate-105/50 rounded-xl"></div>
                  ))}
                </div>
                <div className="h-10 w-full bg-slate-50 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : collectionsData.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-slate-100 dark:border-slate-700 p-8">
            <p className="text-sm font-semibold text-slate-400 dark:text-slate-300">Sorry, no collections or products match your search/filters right now.</p>
            <button 
              onClick={() => { setHomeSearch(''); setActiveCategory('all'); }}
              className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-300 hover:underline cursor-pointer bg-transparent border-none"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collectionsData.map(({ category, latestFour }) => (
              <div 
                key={category._id}
                className="group flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-100/80 dark:border-slate-700 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all p-5 hover:translate-y-[-4px] duration-250 cursor-default"
              >
                {/* Collection Info Header */}
                <div className="mb-4">
                  <h3 className="text-md font-black text-slate-800 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors uppercase tracking-tight font-sans">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-[11px] text-slate-300 dark:text-slate-400 line-clamp-1 mt-1 font-sans font-medium">
                      {category.description}
                    </p>
                  )}
                </div>

                {/* Grid with exactly up to 4 latest images of the collection */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-50/60 dark:border-slate-800 min-h-[220px] items-center justify-center">
                  {latestFour.map((prod: any) => (
                    <div className="group" key={prod._id}>
                      <BorderGlow
                        className="relative aspect-square bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100/50 dark:border-slate-800/80 flex flex-col items-center justify-between cursor-pointer hover:border-indigo-400/40 dark:hover:border-slate-600 hover:scale-[1.03] active:scale-[0.98] transition-all shadow-2xs"
                        borderRadius={16}
                      >
                      <GlareHover glareOpacity={0.15} glareSize={250} transitionDuration={700}>
                      <div 
                        onClick={() => {
                          if (prod.slug) onNavigate('product-detail', prod.slug);
                        }}
                        onMouseEnter={() => {
                          if (prod.slug) onPreload?.('product-detail', prod.slug);
                        }}
                        className="w-full h-full p-2 flex flex-col items-center justify-between group/item"
                        title={`View ${prod.name}`}
                      >
                        {/* Rating Badge at the Top - Colorless style */}
                        <div className="absolute top-1.5 left-1.5 bg-white/95 text-slate-800 dark:bg-slate-800/95 dark:text-white font-extrabold font-mono text-[8px] sm:text-[9.5px] rounded-md px-1.5 py-0.5 flex items-center gap-0.5 shadow-sm z-10 border border-slate-100 dark:border-slate-700">
                          ★ {prod.rating || '4.8'}
                        </div>

                        <div className="flex-grow flex items-center justify-center w-full min-h-0 pt-4">
                          <img loading="lazy" 
                            src={prod.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100'} 
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="max-h-full max-w-full object-contain p-1 group-hover/item:scale-105 transition-transform duration-300"
                          />
                        </div>
                        
                        {/* Clean theme-adaptive text under the image */}
                        <div className="w-full text-center mt-1.5 shrink-0 z-10">
                          <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-950 dark:text-white truncate px-0.5 font-sans">
                            {prod.name}
                          </p>
                        </div>
                      </div>
                      </GlareHover>
                      </BorderGlow>
                    </div>
                  ))}
                  {/* Fill in empty slots if under 4 products */}
                  {latestFour.length < 4 && [...Array(4 - latestFour.length)].map((_, i) => (
                    <div 
                      key={`empty-${i}`}
                      className="aspect-square bg-slate-50/40 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-100 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-200 dark:text-slate-600 font-mono"
                    >
                      Empty
                    </div>
                  ))}
                </div>

                {/* Clean "See More" link instead of descriptions or details (Colorless style) */}
                <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-700">
                  <button
                    onClick={() => onNavigate('products', `category-${category._id}`)}
                    className="w-full text-center bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none"
                  >
                    <span>See More</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      </LazySection>

      {/* Dynamic AdSense Placement Unit */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AdSenseBanner slot="6223881151" />
      </div>

      {/* 3. COMPREHENSIVE PRODUCT CATALOG LISTING MATCHING USER INTENT */}
      <LazySection placeholder={
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-6 w-52 bg-slate-100/50 dark:bg-slate-700 rounded animate-pulse mb-6"></div>
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            <div className="h-96 bg-gradient-to-br from-slate-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-950/50 rounded-2xl animate-pulse"></div>
            <div className="h-96 bg-gradient-to-br from-slate-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-950/50 rounded-2xl animate-pulse"></div>
            <div className="h-96 bg-gradient-to-br from-slate-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-950/50 rounded-2xl animate-pulse hidden lg:block"></div>
          </div>
        </div>
      }>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 border-b border-slate-100/60 pb-3 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-800 dark:text-white font-sans">
              All Available Products
            </h2>
          </div>
          {homeSearch && (
            <span className="bg-amber-50 text-amber-700 text-[10px] font-bold rounded px-2 py-0.5 dark:bg-amber-950/40 dark:text-amber-200 font-mono">
              Matched: {latestProductsToShow.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 animate-in fade-in duration-300">
            {[...Array(6)].map((_, i) => (
              <ProductCardSkeleton key={`skeleton-prod-${i}`} />
            ))}
          </div>
        ) : latestProductsToShow.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-slate-100 dark:border-slate-700 p-8">
            <p className="text-sm font-semibold text-slate-400 dark:text-slate-300">Sorry, no products match your search or filters at this time.</p>
            <button 
              onClick={() => { setHomeSearch(''); setActiveCategory('all'); }}
              className="mt-3 text-xs font-bold text-indigo-500 dark:text-indigo-300 hover:underline cursor-pointer bg-transparent border-none"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {latestProductsToShow.slice(0, visibleCount).map((prod) => (
                  <motion.div
                    key={prod._id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    transition={{ type: 'spring', damping: 25, stiffness: 180 }}
                    onClick={() => {
                      if (prod.slug) onNavigate('product-detail', prod.slug);
                    }}
                    onMouseEnter={() => {
                      if (prod.slug) onPreload?.('product-detail', prod.slug);
                    }}
                    className="group"
                  >
                    <BorderGlow
                      className="flex flex-col rounded-2xl border border-slate-100/50 bg-white hover:border-indigo-400/40 dark:border-slate-700/80 dark:bg-slate-800 transition-all duration-200 overflow-hidden cursor-pointer shadow-xs"
                      borderRadius={16}
                    >
                      <GlareHover glareOpacity={0.15} glareSize={250} transitionDuration={700}>
                      <div className="flex flex-col w-full h-full">
                    {/* Image Area with Badge & Top Actions */}
                    <div className="relative h-32 sm:h-48 bg-slate-50 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-2">
                      <img
                        src={prod.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=310'}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain p-2 bg-slate-50/40 dark:bg-slate-950/20 group-hover:scale-103 transition-transform duration-300"
                      />
                      {prod.discount && prod.discount > 0 && (
                        <span className="absolute top-2 left-2 bg-rose-400 rounded px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold text-white uppercase tracking-wider font-mono shadow-xs">
                          -{prod.discount}%
                        </span>
                      )}
                      
                      {isAuthenticated && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleWishlist(prod._id, prod.name); }}
                          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-xs hover:text-rose-400 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:text-rose-400 transition-colors cursor-pointer border-none"
                          title="Bookmark product" aria-label="Bookmark product"
                        >
                          <Heart className={`h-3.5 w-3.5 ${wishlist.includes(prod._id) ? 'fill-rose-400 text-rose-400' : ''}`} />
                        </button>
                      )}

                      <div
                        className="absolute bottom-2 left-2 bg-amber-400 text-white font-extrabold font-mono text-[9px] rounded-lg px-2 py-1 flex items-center gap-1 shadow-md z-10 border-none select-none"
                        title="Rating"
                      >
                        ★ {prod.rating || '4.8'}
                      </div>
                    </div>

                    {/* Product Metadata & Info */}
                    <div className="p-3 sm:p-4 flex flex-col flex-grow font-sans">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-300 dark:text-slate-400 uppercase tracking-wider truncate max-w-[80px]">
                          {prod.brand || 'Premium'}
                        </span>
                        <span className="text-[8.5px] px-1.5 py-0.2 bg-slate-50 border border-slate-50 rounded text-slate-400 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-300 font-bold font-mono truncate max-w-[90px]">
                          {getCategoryName(prod.category, categories)}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-500 dark:text-white dark:group-hover:text-indigo-300 transition-colors leading-tight font-sans">
                        {prod.name}
                      </h3>

                      <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-2 mt-1 leading-normal dark:text-slate-300 font-sans">
                        {prod.description}
                      </p>

                      {/* Pricing Tag and Details Trigger */}
                      <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-50 dark:border-slate-700/80">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs sm:text-sm font-black text-indigo-500 dark:text-indigo-300 font-mono">₹{prod.price}</span>
                          {prod.originalPrice && (
                            <span className="text-[9px] sm:text-[10px] text-slate-300 line-through font-mono translate-y-[-0.5px]">₹{prod.originalPrice}</span>
                          )}
                        </div>

                        <div className="rounded bg-indigo-50/80 hover:bg-indigo-50 text-indigo-600 py-1 px-2.5 text-[9px] sm:text-[10px] font-bold dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-800/60 cursor-pointer transition-colors border border-indigo-50/40 dark:border-indigo-800/30">
                          Details
                        </div>
                      </div>
                    </div>
                    </div>
                    </GlareHover>
                    </BorderGlow>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Show More Actions & Redirects */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 pb-4">
              {latestProductsToShow.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount(prev => prev + 6)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-100 hover:border-indigo-200 bg-white hover:bg-slate-50 text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800 dark:text-indigo-200 px-6 py-2.5 text-xs font-bold shadow-xs cursor-pointer transition-all border-solid"
                >
                  Load More Products
                </button>
              )}
              <button
                onClick={() => onNavigate('products')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-none bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 text-xs font-bold shadow-sm hover:shadow-md cursor-pointer transition-all"
              >
                <span>See All Products</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>
      </LazySection>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12 mb-8" id="home-newsletter-subscribe-section">
        <NewsletterSubscribe variant="inline" />
      </div>

      {/* "Pick Where You Left Off" Subscription Modal */}
      <AnimatePresence>
        {pickLeftModalProd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPickLeftModalProd(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setPickLeftModalProd(null)}
                className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                {/* Visual Icon */}
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-400">
                  <Sparkles className="h-7 w-7" />
                </div>

                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  📬 Direct Curation Alerts
                </h3>
                
                <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Would you like to receive a direct email alert whenever we add brand new premium curation products in the{' '}
                  <span className="font-extrabold text-indigo-500">
                    "{typeof pickLeftModalProd.category === 'object' && pickLeftModalProd.category
                      ? (pickLeftModalProd.category as any).name
                      : (categories.find(c => c._id === pickLeftModalProd.category || c.slug === pickLeftModalProd.category)?.name || 'Electronics')}"
                  </span>{' '}
                  category?
                </p>

                <form onSubmit={handlePickLeftSubmit} className="mt-6 w-full space-y-3">
                  <div>
                    <label htmlFor="pick-left-email-input" className="sr-only">
                      Gmail Address
                    </label>
                    <input
                      id="pick-left-email-input"
                      type="email"
                      required
                      placeholder="Enter your Gmail address..."
                      value={pickLeftEmail}
                      onChange={(e) => setPickLeftEmail(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950/50 dark:text-white dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-950"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingPickLeft}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-98 text-white py-3 px-4 text-xs font-extrabold tracking-wider uppercase shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingPickLeft ? (
                      <span>Enabling Alert...</span>
                    ) : (
                      <>
                        <span>Enable Alert & View Product</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    const slug = pickLeftModalProd.slug;
                    setPickLeftModalProd(null);
                    if (slug) onNavigate('product-detail', slug);
                  }}
                  className="mt-3 w-full rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 active:scale-98 text-slate-500 py-3 px-4 text-xs font-bold transition-all cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/50 dark:text-slate-400"
                >
                  No thanks, just view product
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
