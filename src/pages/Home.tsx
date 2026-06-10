import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { 
  Search, Star, Heart, Flame, ShieldCheck, Trophy, Sparkles, 
  ArrowRight, Landmark, Users, CheckCircle, Smartphone,
  Clock, History, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import { AdSenseBanner } from '../components/AdSenseBanner';

interface HomeProps {
  onNavigate: (view: string, slug?: string) => void;
}

const ProductCardSkeleton = () => (
  <div className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0c1224] overflow-hidden animate-pulse">
    <div className="h-32 sm:h-44 bg-slate-100 dark:bg-slate-900/50 shrink-0"></div>
    <div className="p-3 sm:p-5 flex flex-col flex-grow space-y-2.5">
      <div className="h-3.5 w-1/3 bg-slate-100 dark:bg-slate-900/50 rounded"></div>
      <div className="h-5 w-full bg-slate-100 dark:bg-slate-900/50 rounded"></div>
      <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-900/50 rounded"></div>
      <div className="mt-auto pt-3 border-t border-slate-105 dark:border-slate-800/80 flex items-center justify-between">
        <div className="h-5 w-16 bg-slate-100 dark:bg-slate-900/50 rounded"></div>
        <div className="h-6 w-20 bg-slate-100 dark:bg-slate-900/50 rounded-lg"></div>
      </div>
    </div>
  </div>
);

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { wishlist, toggleWishlist, isAuthenticated } = useAuth();
  const [trending, setTrending] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeSearch, setHomeSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(6);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentViewed, setRecentViewed] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasClickedFilter, setHasClickedFilter] = useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  // Load recent searches on client side
  useEffect(() => {
    try {
      const stored = localStorage.getItem('aff_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
      const viewedStored = localStorage.getItem('aff_recent_viewed');
      if (viewedStored) {
        setRecentViewed(JSON.parse(viewedStored));
      }
    } catch (e) {
      console.warn('Failed to load recent local data:', e);
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

  const saveSearchToLocal = (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length > 1) {
      try {
        const stored = localStorage.getItem('aff_recent_searches');
        let current: string[] = stored ? JSON.parse(stored) : [];
        const filtered = current.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
        const updated = [trimmed, ...filtered].slice(0, 5);
        localStorage.setItem('aff_recent_searches', JSON.stringify(updated));
        setRecentSearches(updated);
      } catch (err) {
        console.warn('Failed to save search:', err);
      }
    }
  };

  const handleRemoveRecentSearch = (e: React.MouseEvent, queryToRemove: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== queryToRemove);
    setRecentSearches(updated);
    try {
      localStorage.setItem('aff_recent_searches', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to remove recent search:', err);
    }
  };

  const handleClearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('aff_recent_searches');
    } catch (err) {
      console.warn('Failed to clear recent searches:', err);
    }
  };

  // Synchronize and log searches & filter criteria to MongoDB accordingly
  useEffect(() => {
    if (homeSearch.trim() !== '' || activeCategory !== 'all') {
      const handler = setTimeout(() => {
        const selectedCat = categories.find(c => c._id === activeCategory);
        fetch('/api/analytics/filters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchQuery: homeSearch || undefined,
            categoryId: activeCategory !== 'all' ? activeCategory : undefined,
            categorySlug: selectedCat ? selectedCat.slug : undefined
          })
        }).catch(err => console.warn('Filter interaction logging error:', err));
      }, 700);
      return () => clearTimeout(handler);
    }
  }, [homeSearch, activeCategory, categories]);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [trendRes, catRes, prodRes] = await Promise.all([
          fetch('/api/trending'),
          fetch('/api/categories'),
          fetch('/api/products?limit=100')
        ]);
        
        if (trendRes.ok) {
          const tData = await trendRes.json();
          setTrending(tData || []);
        }
        if (catRes.ok) {
          const cData = await catRes.json();
          setCategories(cData || []);
        }
        if (prodRes.ok) {
          const pData = await prodRes.json();
          const pList = pData.products || [];
          setAllProducts(pList);
          
          setRecentViewed(current => {
            const cleared = localStorage.getItem('aff_history_cleared') === 'true';
            if (cleared) {
              return [];
            }
            if (current.length === 0 && pList.length > 0) {
              const selected: any[] = [];
              const seenBrands = new Set<string>();
              for (const p of pList) {
                if (!seenBrands.has(p.brand || '') && p.brand && selected.length < 5) {
                  seenBrands.add(p.brand);
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
                  });
                }
              }
              if (selected.length < 4) {
                for (const p of pList) {
                  if (selected.length < 5 && !selected.some(item => item._id === p._id)) {
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
                    });
                  }
                }
              }
              return selected;
            }
            return current;
          });
        }
      } catch (err) {
        console.warn('Failing to assemble home aggregates data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  // Filter products in real-time based on the hero search query and active category filter
  const filteredProducts = allProducts.filter(prod => {
    const matchesSearch = 
      prod.name.toLowerCase().includes(homeSearch.toLowerCase()) ||
      (prod.brand && prod.brand.toLowerCase().includes(homeSearch.toLowerCase())) ||
      prod.description.toLowerCase().includes(homeSearch.toLowerCase());
    
    if (activeCategory === 'all') {
      return matchesSearch;
    } else {
      const prodCatId = (prod.category && typeof prod.category === 'object') ? prod.category._id : prod.category;
      return matchesSearch && prodCatId === activeCategory;
    }
  });

  // Identify products listed under "Top Recommendations & Trending Choices" section (first 8 trending/products)
  const trendingToShow = (trending.length > 0 ? trending : allProducts).slice(0, 8);

  // General products are filtered products
  const generalProducts = homeSearch 
    ? filteredProducts 
    : filteredProducts.filter(prod => !trendingToShow.some(t => t._id === prod._id));

  // Sort filtered products by latest added/updated
  const latestProductsToShow = React.useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return String(b._id).localeCompare(String(a._id));
    });
  }, [filteredProducts]);

  // Dynamically group products into collections/categories with their latest 4 product images
  const collectionsData = React.useMemo(() => {
    const list: any[] = [];

    // Add Trending Choices as a special curated collection if general/trending is active
    if (activeCategory === 'all' || activeCategory === 'trending') {
      let trendingProducts = allProducts.filter(p => p.trending);

      // Filter by search query if user typed in the hero search bar
      if (homeSearch.trim()) {
        const query = homeSearch.toLowerCase();
        trendingProducts = trendingProducts.filter(prod => 
          prod.name.toLowerCase().includes(query) ||
          (prod.brand && prod.brand.toLowerCase().includes(query)) ||
          prod.description.toLowerCase().includes(query)
        );
      }

      // Sort by latest added/updated
      const sortedTrending = [...trendingProducts].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        return String(b._id).localeCompare(String(a._id));
      });

      if (sortedTrending.length > 0) {
        list.push({
          category: {
            _id: 'trending',
            name: 'Top Recommendations & Trending Choices',
            description: 'Curated premium performance gear and trending choice recommendations updated in real-time.',
            slug: 'trending'
          },
          products: sortedTrending,
          latestFour: sortedTrending.slice(0, 4)
        });
      }
    }

    // Filter standard categories based on activeCategory
    const filteredCats = activeCategory === 'all' 
      ? categories 
      : categories.filter(c => String(c._id) === String(activeCategory));

    const standardCols = filteredCats.map(cat => {
      let catProducts = allProducts.filter(prod => {
        const prodCatId = (prod.category && typeof prod.category === 'object') ? prod.category._id : prod.category;
        return String(prodCatId) === String(cat._id);
      });

      // Filter by search query if user typed in the hero search bar
      if (homeSearch.trim()) {
        const query = homeSearch.toLowerCase();
        catProducts = catProducts.filter(prod => 
          prod.name.toLowerCase().includes(query) ||
          (prod.brand && prod.brand.toLowerCase().includes(query)) ||
          prod.description.toLowerCase().includes(query)
        );
      }

      // Sort standard categories by latest added/updated
      const sorted = [...catProducts].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        return String(b._id).localeCompare(String(a._id));
      });

      return {
        category: cat,
        products: sorted,
        latestFour: sorted.slice(0, 4)
      };
    }).filter(col => col.products.length > 0);

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
    <div className="space-y-16 pb-20 dark:bg-[#070a14] transition-colors duration-300 text-slate-900 dark:text-slate-100">
      <Helmet>
        <title>gadgetsprohub | Premium Electronics & Smart Gear Directory</title>
        <meta name="description" content="Discover trending, premium electronics and detailed specifications. Find honest reviews and the best deals on smartphones, laptops, audio gear, and wearables at gadgetsprohub." />
        <link rel="canonical" href="https://gadgetsprohub.com" />
      </Helmet>

      {/* 1. HERO & ACCESSIBLE PRODUCT SEARCH BAR SECTION */}
      <section className="bg-transparent py-14 border-b border-slate-200/50 dark:border-slate-800/50 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/50 px-4 py-1.5 text-xs font-bold text-indigo-900 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-300">
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
            <span>Carefully Checked Products & Direct Safe Links</span>
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight text-[#1b365d] sm:text-5xl dark:text-white leading-tight">
            <span className="text-indigo-650 dark:text-indigo-400">Discover the Best Products Before You Buy</span>
          </h1>

          {/* Large Focused Dynamic Action Search Bar */}
          <div className="mt-8 mx-auto max-w-2xl relative" ref={searchContainerRef}>
            <form onSubmit={handleHomeSearchSubmit} className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </span>
              <input
                type="text"
                value={homeSearch}
                onChange={(e) => setHomeSearch(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search products, brands, cameras, or tech items..."
                className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3.5 pl-13 pr-4 text-sm sm:text-base text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-600 dark:border-slate-800 dark:bg-[#070a14] dark:text-white focus:ring-0"
              />
              {homeSearch && (
                <button 
                  type="button"
                  onClick={() => setHomeSearch('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 font-bold text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </form>

            {/* Premium Interactive Recent Searches Dropdown */}
            {showDropdown && recentSearches.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-2 rounded-2xl border border-slate-250 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#0c1224] text-left animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                    <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                    Recent Searches
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllRecentSearches}
                    className="text-[10px] font-bold uppercase text-rose-500 hover:text-rose-605 transition-colors cursor-pointer border-none bg-transparent p-0"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((query, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setHomeSearch(query);
                        saveSearchToLocal(query);
                        setShowDropdown(false);
                        onNavigate('products', `search-${query}`);
                      }}
                      className="group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <History className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-550 transition-colors shrink-0" />
                        <span className="truncate">{query}</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveRecentSearch(e, query)}
                        className="rounded-md p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all cursor-pointer border-none bg-transparent"
                        title="Remove Search"
                      >
                        <X className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Categories Filter (Max 5) */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            <button
              onClick={() => {
                setActiveCategory('all');
                setHasClickedFilter(true);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all border shadow-sm cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-400'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700'
              }`}
            >
              All Collections
            </button>
            <button
              onClick={() => {
                setActiveCategory('trending');
                setHasClickedFilter(true);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all border shadow-sm cursor-pointer flex items-center gap-1 ${
                activeCategory === 'trending'
                  ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-400'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Flame className="h-3 w-3 text-slate-500 dark:text-slate-400" />
              <span>Trending Choices</span>
            </button>
            {categories.slice(0, 5).map(cat => (
              <button
                key={cat._id}
                onClick={() => {
                  setActiveCategory(activeCategory === cat._id ? 'all' : cat._id);
                  setHasClickedFilter(true);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all border shadow-sm cursor-pointer ${
                  activeCategory === cat._id
                    ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-400'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700'
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
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200/60 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Pick where you left
              </h2>
            </div>
            <button 
              onClick={() => {
                setRecentViewed([]);
                localStorage.removeItem('aff_recent_viewed');
                localStorage.setItem('aff_history_cleared', 'true');
              }}
              className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              Clear history
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {recentViewed.slice(0, 8).map(prod => (
              <div 
                key={prod._id}
                onClick={() => onNavigate('product-detail', prod.slug)}
                className="w-48 sm:w-56 shrink-0 snap-start flex flex-col rounded-2xl border border-slate-200 bg-white hover:border-indigo-400 dark:border-slate-800 dark:bg-[#0c1224] transition-all cursor-pointer shadow-xs group"
              >
                <div className="h-32 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 overflow-hidden rounded-t-2xl relative">
                  <img
                    src={prod.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300'}
                    alt={prod.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('products', `spec-${prod.slug}`);
                    }}
                    className="absolute bottom-2 left-2 bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all text-white font-extrabold font-mono text-[9px] rounded-lg px-2 py-1 flex items-center gap-1 shadow-md z-15 cursor-pointer border-none"
                    title="View Technical Specifications"
                  >
                    ★ {prod.rating || '4.8'}
                  </button>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 font-mono truncate">{prod.brand || 'Item'}</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {prod.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}      {/* 2. CURATED COLLECTIONS BOARD */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-8 border-b border-slate-200/60 pb-3 dark:border-slate-800">
          <Trophy className="h-5 w-5 text-slate-600 dark:text-slate-450" />
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
            Curated Collections
          </h2>
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700 dark:bg-slate-900/80 dark:text-slate-300 font-mono">
            Latest Curation
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#0c1224] rounded-3xl border border-slate-200 dark:border-slate-855 p-5 animate-pulse space-y-4">
                <div className="h-6 w-1/3 bg-slate-100 rounded"></div>
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="aspect-square bg-slate-105/50 rounded-xl"></div>
                  ))}
                </div>
                <div className="h-10 w-full bg-slate-100 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : collectionsData.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Sorry, no collections or products match your search/filters right now.</p>
            <button 
              onClick={() => { setHomeSearch(''); setActiveCategory('all'); }}
              className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer bg-transparent border-none"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collectionsData.map(({ category, latestFour }) => (
              <div 
                key={category._id}
                className="group flex flex-col bg-white dark:bg-[#0c1224] rounded-3xl border border-slate-200/80 dark:border-slate-850 shadow-xs hover:border-slate-400 dark:hover:border-slate-700 transition-all p-5 hover:translate-y-[-4px] duration-250 cursor-default"
              >
                {/* Collection Info Header */}
                <div className="mb-4">
                  <h3 className="text-md font-black text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-350 transition-colors uppercase tracking-tight font-sans">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-1 font-sans font-medium">
                      {category.description}
                    </p>
                  )}
                </div>

                {/* Grid with exactly up to 4 latest images of the collection */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100/60 dark:border-slate-900 min-h-[220px] items-center justify-center">
                  {latestFour.map(prod => (
                    <div 
                      key={prod._id}
                      onClick={() => onNavigate('product-detail', prod.slug)}
                      className="relative aspect-square bg-slate-900 dark:bg-[#030712] rounded-2xl overflow-hidden border border-slate-800 dark:border-slate-900 p-2 flex flex-col items-center justify-between cursor-pointer hover:border-slate-600 dark:hover:border-slate-750 hover:scale-[1.03] active:scale-[0.98] transition-all group/item shadow-2xs"
                      title={`View ${prod.name}`}
                    >
                      {/* Rating Badge at the Top - Colorless style */}
                      <div className="absolute top-1.5 left-1.5 bg-white/95 text-slate-900 dark:bg-slate-900/95 dark:text-white font-extrabold font-mono text-[8px] sm:text-[9.5px] rounded-md px-1.5 py-0.5 flex items-center gap-0.5 shadow-sm z-10 border border-slate-200 dark:border-slate-800">
                        ★ {prod.rating || '4.8'}
                      </div>

                      <div className="flex-grow flex items-center justify-center w-full min-h-0 pt-4">
                        <img 
                          src={prod.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=150'} 
                          alt={prod.name}
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain p-1 group-hover/item:scale-105 transition-transform duration-300"
                        />
                      </div>
                      
                      {/* Clean white text under the image without a black capsule, directly on the dark-styled parent container */}
                      <div className="w-full text-center mt-1.5 shrink-0 z-10">
                        <p className="text-[9px] sm:text-[10px] font-extrabold text-white truncate px-0.5 font-sans">
                          {prod.name}
                        </p>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/20 via-transparent to-transparent h-1/2 rounded-b-2xl pointer-events-none" />
                    </div>
                  ))}
                  {/* Fill in empty slots if under 4 products */}
                  {latestFour.length < 4 && [...Array(4 - latestFour.length)].map((_, i) => (
                    <div 
                      key={`empty-${i}`}
                      className="aspect-square bg-slate-100/40 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-300 dark:text-slate-700 font-mono"
                    >
                      Empty
                    </div>
                  ))}
                </div>

                {/* Clean "See More" link instead of descriptions or details (Colorless style) */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => onNavigate('products', `category-${category._id}`)}
                    className="w-full text-center bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none"
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

      {/* Dynamic AdSense Placement Unit */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AdSenseBanner slot="6223881151" />
      </div>

      {/* 3. COMPREHENSIVE PRODUCT CATALOG LISTING MATCHING USER INTENT */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 border-b border-slate-200/60 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
              All Available Products
            </h2>
          </div>
          {homeSearch && (
            <span className="bg-amber-50 text-amber-850 text-[10px] font-bold rounded px-2 py-0.5 dark:bg-amber-950/40 dark:text-amber-300 font-mono">
              Matched: {latestProductsToShow.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 animate-in fade-in duration-300">
            {[...Array(6)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : latestProductsToShow.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Sorry, no products match your search or filters at this time.</p>
            <button 
              onClick={() => { setHomeSearch(''); setActiveCategory('all'); }}
              className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer bg-transparent border-none"
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
                    onClick={() => onNavigate('product-detail', prod.slug)}
                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white hover:border-indigo-500/40 dark:border-slate-850 dark:bg-[#0c1224] transition-all duration-200 overflow-hidden cursor-pointer shadow-xs"
                  >
                    {/* Image Area with Badge & Top Actions */}
                    <div className="relative h-32 sm:h-48 bg-slate-100 dark:bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center p-2">
                      <img
                        src={prod.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=310'}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain p-2 bg-slate-150/40 dark:bg-slate-950/20 group-hover:scale-103 transition-transform duration-300"
                      />
                      {prod.discount && prod.discount > 0 && (
                        <span className="absolute top-2 left-2 bg-rose-500 rounded px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold text-white uppercase tracking-wider font-mono shadow-xs">
                          -{prod.discount}%
                        </span>
                      )}
                      
                      {isAuthenticated && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleWishlist(prod._id); }}
                          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-xs hover:text-rose-500 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:text-rose-500 transition-colors cursor-pointer border-none"
                          title="Bookmark product"
                        >
                          <Heart className={`h-3.5 w-3.5 ${wishlist.includes(prod._id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('products', `spec-${prod.slug}`);
                        }}
                        className="absolute bottom-2 left-2 bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all text-white font-extrabold font-mono text-[9px] rounded-lg px-2 py-1 flex items-center gap-1 shadow-md z-10 cursor-pointer border-none"
                        title="View Technical Specifications"
                      >
                        ★ {prod.rating || '4.8'}
                      </button>
                    </div>

                    {/* Product Metadata & Info */}
                    <div className="p-3 sm:p-4 flex flex-col flex-grow font-sans">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate max-w-[80px]">
                          {prod.brand || 'Premium'}
                        </span>
                        <span className="text-[8.5px] px-1.5 py-0.2 bg-slate-50 border border-slate-150 rounded text-slate-500 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-400 font-bold font-mono truncate max-w-[90px]">
                          {(() => {
                            if (!prod.category) return 'Item';
                            if (typeof prod.category === 'object' && prod.category) {
                              if (prod.category.name) return prod.category.name;
                              const catId = prod.category._id || '';
                              return categories.find(c => String(c._id) === String(catId))?.name || 'Item';
                            }
                            return categories.find(c => String(c._id) === String(prod.category))?.name || 'Item';
                          })()}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors leading-tight font-sans">
                        {prod.name}
                      </h3>

                      <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-2 mt-1 leading-normal dark:text-slate-400 font-sans">
                        {prod.description}
                      </p>

                      {/* Pricing Tag and Details Trigger */}
                      <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs sm:text-sm font-black text-indigo-650 dark:text-indigo-455 font-mono">₹{prod.price}</span>
                          {prod.originalPrice && (
                            <span className="text-[9px] sm:text-[10px] text-slate-400 line-through font-mono translate-y-[-0.5px]">₹{prod.originalPrice}</span>
                          )}
                        </div>

                        <div className="rounded bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 py-1 px-2.5 text-[9px] sm:text-[10px] font-bold dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 cursor-pointer transition-colors border border-indigo-100/40 dark:border-indigo-900/30">
                          Details
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Show More Actions & Redirects */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 pb-4">
              {latestProductsToShow.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount(prev => prev + 6)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 hover:border-indigo-300 bg-white hover:bg-slate-50 text-indigo-700 dark:border-slate-800 dark:bg-[#0c1224] dark:hover:bg-slate-900 dark:text-indigo-300 px-6 py-2.5 text-xs font-bold shadow-xs cursor-pointer transition-all border-solid"
                >
                  Load More Products
                </button>
              )}
              <button
                onClick={() => onNavigate('products')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-none bg-indigo-650 hover:bg-indigo-700 text-white px-6 py-2.5 text-xs font-bold shadow-sm hover:shadow-md cursor-pointer transition-all"
              >
                <span>See All Products</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. BRAND ABOUT US MISSION - ACCESSIBLE COHESIVE BOX */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-12 dark:border-slate-850 dark:bg-[#0c1224] space-y-6">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
              <Landmark className="h-4 w-4" />
              ABOUT US & INTEGRITY PROMISE
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              We Build Simple & Honest Product Directories
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Established in 2026, gadgetsprohub is an independent database platform created by developers and technology advocates who are deeply frustrated by crowded commercial search loops and duplicate, sponsored listings. 
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Experienced Review Team</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Our reviews are developed through rigorous comparative hands-on tests. We extract raw benchmark values and metric data points directly.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Zero Clickbait Algorithms</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                We believe in layout readability. We do not insert intrusive autoplay popups, artificial urgency indicators, or misleading marketing widgets to rush you.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Authorized Partner Networks</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Links automatically connect to certified store interfaces, securing your safety against third-party mock sellers or unauthenticated gray-market listings.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Data Transparency & Privacy</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                We request user data (via Google Sign-In) solely to enable secure profile saving and personalized product Wishlists. You are never required to log in to browse products. For details, please review our <button onClick={() => onNavigate('privacy-policy')} className="text-indigo-600 hover:underline dark:text-indigo-400 bg-transparent border-none p-0 cursor-pointer font-semibold inline">Privacy Policy</button>.
              </p>
            </div>
          </div>

          <div className="pt-4 text-center">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 italic flex items-center justify-center gap-1">
              <span>"</span>
              <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 bg-clip-text text-transparent font-black">gadgetsprohub</span>
              <span>: Hand-analyzing everyday gear, leaving no room for marketing fluff."</span>
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
