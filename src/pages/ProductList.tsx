import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Category } from '../types';
import { Search, Heart, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, Grid, List, Star, X, CheckCheck, ShieldCheck, ShoppingBag, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { Breadcrumb } from '../components/Breadcrumb';
import { BorderGlow } from '../components/BorderGlow';
import { GlareHover } from '../components/GlareHover';

interface ProductListProps {
  initialFilter?: string | null;
  onNavigate: (view: string, slug?: string) => void;
}

const ProductCardSkeleton = () => (
  <div className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden animate-pulse">
    <div className="h-48 bg-slate-200 dark:bg-slate-800 shrink-0"></div>
    <div className="p-4 flex flex-col flex-grow space-y-3">
      <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-5 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="mt-auto pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      </div>
    </div>
  </div>
);

const getCategoryEmoji = (categoryName: string) => {
  const norm = categoryName.toLowerCase();
  if (norm.includes('phone') || norm.includes('mobile') || norm.includes('audio') || norm.includes('headphone') || norm.includes('earphone') || norm.includes('speaker') || norm.includes('sound')) return '🎧';
  if (norm.includes('watch') || norm.includes('clock') || norm.includes('wearable') || norm.includes('smartwatch')) return '⌚';
  if (norm.includes('comput') || norm.includes('laptop') || norm.includes('desktop') || norm.includes('screen') || norm.includes('monitor')) return '💻';
  if (norm.includes('camera') || norm.includes('photo') || norm.includes('video') || norm.includes('lens')) return '📷';
  if (norm.includes('game') || norm.includes('gaming') || norm.includes('console') || norm.includes('play')) return '🎮';
  if (norm.includes('shoe') || norm.includes('footwear') || norm.includes('sneaker')) return '👟';
  if (norm.includes('electron') || norm.includes('tech') || norm.includes('gadget') || norm.includes('appliances') || norm.includes('power')) return '🔌';
  if (norm.includes('fashion') || norm.includes('cloth') || norm.includes('wear') || norm.includes('style') || norm.includes('bag') || norm.includes('backpack')) return '👕';
  if (norm.includes('home') || norm.includes('decor') || norm.includes('garden') || norm.includes('furniture') || norm.includes('kitchen')) return '🏠';
  if (norm.includes('sport') || norm.includes('fit') || norm.includes('gym')) return '⚽';
  if (norm.includes('book') || norm.includes('educat') || norm.includes('read')) return '📚';
  if (norm.includes('health') || norm.includes('beauty') || norm.includes('care') || norm.includes('medical')) return '🏥';
  return '📦';
};

export const ProductList: React.FC<ProductListProps> = ({ initialFilter, onNavigate }) => {
  const { wishlist, toggleWishlist, isAuthenticated } = useAuth();
  
  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [specModalProduct, setSpecModalProduct] = useState<Product | null>(null);
  const [loadingSpec, setLoadingSpec] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Ref for bottom observer loading sentinel
  const loaderRef = useRef<HTMLDivElement>(null);
  
  // Filter variables
  const [search, setSearch] = useState(() => {
    if (initialFilter && initialFilter.startsWith('search-')) {
      return initialFilter.replace('search-', '');
    }
    return '';
  });
  const [debouncedSearch, setDebouncedSearch] = useState(() => {
    if (initialFilter && initialFilter.startsWith('search-')) {
      return initialFilter.replace('search-', '');
    }
    return '';
  });
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (initialFilter && initialFilter.startsWith('category-')) {
      return initialFilter.replace('category-', '');
    }
    return '';
  });
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortField, setSortField] = useState('newest');
  const [isFilterOpen, setIsFilterOpen] = useState(() => {
    if (initialFilter && initialFilter.startsWith('search-')) {
      return false;
    }
    return true;
  });
  
  const hasActiveFilters = Boolean(search || selectedCategory || minPrice || maxPrice || minRating);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Helper to group products when a category is selected and no specific subcategory is selected
  const groupedProducts = useMemo<Record<string, Product[]> | null>(() => {
    if (!selectedCategory || selectedSubcategory) return null;
    const activeCategoryObj = categories.find(c => String(c._id) === String(selectedCategory));
    if (!activeCategoryObj) return null;
    
    const subcats = activeCategoryObj.subcategories || [];
    const groups: Record<string, Product[]> = {};
    
    // Initialize groups for current category's subcategories
    subcats.forEach(sub => {
      groups[sub] = [];
    });
    groups['Other Curations'] = [];
    
    products.forEach(p => {
      const sub = p.subcategory;
      if (sub) {
        const matchedSub = subcats.find(s => s.toLowerCase().trim() === sub.toLowerCase().trim());
        if (matchedSub) {
          groups[matchedSub].push(p);
        } else {
          groups['Other Curations'].push(p);
        }
      } else {
        groups['Other Curations'].push(p);
      }
    });

    // Clean up empty 'Other Curations' to keep the aesthetic pristine
    if (groups['Other Curations'].length === 0) {
      delete groups['Other Curations'];
    }
    
    return groups;
  }, [products, selectedCategory, selectedSubcategory, categories]);

  const classifiedSectionGroups = useMemo(() => {
    const groups: Record<string, Product[]> = {};

    // 1. Identify "Shoes" first vs other categories
    const shoes: Product[] = [];

    products.forEach(p => {
      // Find the normalized category name of this product
      let catName = 'Curated';
      if (p.category) {
        if (typeof p.category === 'object' && p.category) {
          if ((p.category as any).name) {
            catName = (p.category as any).name;
          } else {
            const catId = p.category._id || '';
            const found = categories.find(c => String(c._id) === String(catId));
            if (found) catName = found.name;
          }
        } else {
          const found = categories.find(c => String(c._id) === String(p.category));
          if (found) {
            catName = found.name;
          } else {
            const foundByName = categories.find(c => c.name.toLowerCase() === String(p.category).toLowerCase());
            if (foundByName) {
              catName = foundByName.name;
            } else {
              catName = String(p.category);
            }
          }
        }
      }

      // Clean category formatting (e.g., lowercase "home & garden" to title case "Home & Garden")
      if (catName && catName !== 'Curated') {
        catName = catName.charAt(0).toUpperCase() + catName.slice(1);
      }

      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const subcat = (p.subcategory || '').toLowerCase();
      const catLower = catName.toLowerCase();

      // Ensure precise matching of shoe-related terms; avoid general matches like 'show' or 'shower'
      const isShoe = catLower.includes('shoe') || catLower.includes('footwear') ||
                     name.includes('shoe') || name.includes('footwear') || name.includes('sneaker') || name.includes('sandal') || name.includes('boot') || name.includes('slipper') || name.includes('clog') ||
                     desc.includes('shoe') || desc.includes('footwear') || desc.includes('sneaker') || desc.includes('sandal') || desc.includes('boot') || desc.includes('slipper') || desc.includes('clog') ||
                     brand.includes('shoe') || brand.includes('footwear') || brand.includes('sneaker') || brand.includes('bata') || brand.includes('nike') || brand.includes('adidas') || brand.includes('puma') || brand.includes('crocs') ||
                     subcat.includes('shoe') || subcat.includes('footwear') || subcat.includes('sneaker') || subcat.includes('sandal') || subcat.includes('boot') || subcat.includes('slipper') || subcat.includes('clog');

      if (isShoe) {
        shoes.push(p);
      } else {
        if (!groups[catName]) {
          groups[catName] = [];
        }
        groups[catName].push(p);
      }
    });

    if (shoes.length > 0) {
      groups['Shoes'] = shoes;
    }

    return groups;
  }, [products, categories]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Similar products states for when search is active
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [similarPage, setSimilarPage] = useState(1);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [hasMoreSimilar, setHasMoreSimilar] = useState(true);
  const [similarEndReached, setSimilarEndReached] = useState(false);

  // Recent Searches using localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('aff_recent_searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save search query to recent searches with debounced effect
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length > 1) {
      const timer = setTimeout(() => {
        setRecentSearches(prev => {
          const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
          const updated = [trimmed, ...filtered].slice(0, 5);
          localStorage.setItem('aff_recent_searches', JSON.stringify(updated));
          return updated;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [search]);

  const handleRemoveRecentSearch = (e: React.MouseEvent, queryToRemove: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== queryToRemove);
    setRecentSearches(updated);
    try {
      localStorage.setItem('aff_recent_searches', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to update recent searches:', err);
    }
  };

  const handleClearAllRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('aff_recent_searches');
    } catch (err) {
      console.warn('Failed to clear recent searches:', err);
    }
  };

  // Parse initial filters from incoming routing params
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.startsWith('category-')) {
        const cat = initialFilter.replace('category-', '');
        setSelectedCategory(cat);
        setSearch('');
        setDebouncedSearch('');
        setSelectedSubcategory('');
        setMinPrice('');
        setMaxPrice('');
        setMinRating('');
        setCurrentPage(1);
      } else if (initialFilter.startsWith('search-')) {
        const q = initialFilter.replace('search-', '');
        setSearch(q);
        setDebouncedSearch(q);
        setSelectedCategory('');
        setSelectedSubcategory('');
        setMinPrice('');
        setMaxPrice('');
        setMinRating('');
        setCurrentPage(1);
        setIsFilterOpen(false); // Directly close filters for home page query search!
      } else if (initialFilter.startsWith('spec-')) {
        const slug = initialFilter.replace('spec-', '');
        setLoadingSpec(true);
        // Clear previous overlays, set loading state, and fetch individual product details
        fetch(`/api/products/${slug}`)
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('Product not found');
          })
          .then(data => {
            if (data) {
              setSpecModalProduct(data);
            }
          })
          .catch(err => {
            console.warn('Failed to load product spec:', err);
          })
          .finally(() => {
            setLoadingSpec(false);
          });
      }
    } else {
      setSelectedCategory('');
      setSearch('');
      setDebouncedSearch('');
      setSelectedSubcategory('');
      setMinPrice('');
      setMaxPrice('');
      setMinRating('');
      setCurrentPage(1);
    }
  }, [initialFilter]);

  // Load categories
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(e => console.warn('Categories retrieval fail:', e));
  }, []);

  // Similar Products Fetcher logic for Search matching
  const fetchSimilarProducts = async (pageVal: number, initialReset: boolean = false, activeProducts: Product[] = []) => {
    if (initialReset) {
      setSimilarProducts([]);
      setSimilarPage(1);
      setHasMoreSimilar(true);
      setSimilarEndReached(false);
    }
    
    setLoadingSimilar(true);
    try {
      const currentProds = activeProducts.length > 0 ? activeProducts : products;
      // Get category of matching products to suggest relevant similar ones
      let catId = '';
      if (currentProds.length > 0) {
        const firstProd = currentProds[0];
        catId = firstProd ? (typeof firstProd.category === 'object' && firstProd.category ? firstProd.category._id : String(firstProd.category)) : '';
      }
      
      const params = new URLSearchParams();
      if (catId) {
        params.append('category', catId);
      } else if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      // Exclude already loaded main keyword-matched products
      const excludeIds = currentProds.map(p => p._id).filter(Boolean).join(',');
      if (excludeIds) {
        params.append('exclude', excludeIds);
      }

      params.append('page', String(pageVal));
      params.append('limit', '12');

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const incoming = data.products || [];
        
        // Filter out products already present in active matching products
        const mainIds = new Set(currentProds.map(p => p._id));
        const filteredIncoming = incoming.filter((p: any) => !mainIds.has(p._id));
        
        if (filteredIncoming.length === 0) {
          setHasMoreSimilar(false);
          setSimilarEndReached(true);
        } else {
          setSimilarProducts(prev => {
            const existingIds = new Set(prev.map(p => p._id));
            const uniqueIncoming = filteredIncoming.filter((p: any) => !existingIds.has(p._id));
            if (initialReset) return uniqueIncoming;
            return [...prev, ...uniqueIncoming];
          });
          if (incoming.length < 12) {
            setHasMoreSimilar(false);
          }
        }
      } else {
        setHasMoreSimilar(false);
        setSimilarEndReached(true);
      }
    } catch (err) {
      console.warn("Failing to load similar products:", err);
      setHasMoreSimilar(false);
      setSimilarEndReached(true);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleSeeMoreSimilar = () => {
    const nextPage = similarPage + 1;
    setSimilarPage(nextPage);
    fetchSimilarProducts(nextPage, false);
  };

  // Sync and fetch products from endpoints
  const fetchProductsList = async (pageToFetch: number) => {
    setLoading(true);
    if (pageToFetch === 1) {
      setProducts([]);
    }
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedSubcategory) params.append('subcategory', selectedSubcategory);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (minRating) params.append('rating', minRating);
      if (sortField) params.append('sort', sortField);
      
      const limitVal = '200';
      params.append('page', String(pageToFetch));
      params.append('limit', limitVal);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const incomingProducts = data.products || [];
        if (pageToFetch === 1) {
          setProducts(incomingProducts);
          if (debouncedSearch) {
            fetchSimilarProducts(1, true, incomingProducts);
          }
        } else {
          setProducts(prev => {
            const existingIds = new Set(prev.map(p => p._id));
            const uniqueIncoming = incomingProducts.filter((p: any) => !existingIds.has(p._id));
            return [...prev, ...uniqueIncoming];
          });
        }
        setTotalPages(data.pages || 1);
        setTotalItems(data.total || 0);
      }
    } catch (e) {
      console.warn("Failing to connect to product API catalog:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsList(currentPage);
  }, [debouncedSearch, selectedCategory, selectedSubcategory, minPrice, maxPrice, minRating, sortField, currentPage]);



  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setSortField('newest');
    setCurrentPage(1);
    setExpandedSections({});
  };

  const renderProductCard = (p: Product) => (
    <motion.div
      key={p._id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={() => onNavigate('product-detail', p.slug)}
      className="group"
    >
      <BorderGlow
        className={`flex rounded-2xl border border-slate-100/50 dark:border-slate-800/80 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
          viewStyle === 'grid'
            ? 'flex-col hover:shadow-indigo-500/10 hover:shadow-2xl'
            : 'flex-col sm:flex-row hover:shadow-indigo-500/10 hover:shadow-xl'
        }`}
        borderRadius={16}
        glowColor="99, 102, 241"
      >
        <GlareHover glareOpacity={0.15} glareSize={250} transitionDuration={700}>
        <div className={`flex w-full ${viewStyle === 'grid' ? 'flex-col' : 'flex-col sm:flex-row'}`}>
          {/* Card Media Area */}
          <div className={`bg-slate-100 dark:bg-slate-950 overflow-hidden relative shrink-0 transition-all duration-300 ${
            viewStyle === 'grid'
              ? 'h-32 sm:h-48 w-full'
              : 'w-full sm:w-48 h-40'
          }`}>
            <img
          src={p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'}
          alt={p.name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain p-2 bg-slate-100/50 dark:bg-slate-950/20 group-hover:scale-103 transition-transform duration-500 cursor-pointer"
        />
        
        {p.discount && p.discount > 0 && (
          <span className="absolute top-2.5 left-2.5 bg-rose-500 rounded px-1.5 py-0.5 text-[8px] font-bold text-white font-mono uppercase tracking-wider shadow-sm">
            -{p.discount}% OFF
          </span>
        )}

        {isAuthenticated && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleWishlist(p._id); }}
            className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:text-rose-500 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
          >
            <Heart className={`h-4 w-4 ${wishlist.includes(p._id) ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        )}
      </div>

      {/* Card Content Area */}
      <div className="p-4 flex flex-col flex-grow justify-between">
        <div>
          <div className="flex items-center justify-between gap-1 text-[9px] font-bold text-slate-400">
            <span>
              {(() => {
                if (!p.category) return 'Curated';
                if (typeof p.category === 'object' && p.category) {
                  if (p.category.name) return p.category.name;
                  const catId = p.category._id || '';
                  return categories.find(c => String(c._id) === String(catId))?.name || 'Curated';
                }
                return categories.find(c => String(c._id) === String(p.category))?.name || 'Curated';
              })()}
            </span>
            <span className="uppercase font-mono">{p.brand || 'Premium'}</span>
          </div>

          <h3 className={`font-bold text-slate-800 leading-snug mt-2 line-clamp-1 group-hover:text-indigo-600 dark:text-white transition-colors-300 ${
            viewStyle === 'grid' ? 'text-[10px] sm:text-sm' : 'text-sm'
          }`}>
            {p.name}
          </h3>
          
          <p className={`text-slate-550 line-clamp-2 mt-1.5 dark:text-slate-400 leading-normal ${
            viewStyle === 'grid' ? 'text-[11px]' : 'text-xs'
          }`}>
            {p.description}
          </p>
        </div>

        <div className="pt-3 mt-3 border-t border-slate-50 dark:border-slate-850 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xs sm:text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">₹{p.price}</span>
            {p.originalPrice && (
              <span className="text-[10px] text-slate-400 line-through font-mono">₹{p.originalPrice}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {viewStyle === 'list' && isAuthenticated && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleWishlist(p._id); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-500 hover:text-rose-500 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
              >
                <Heart className={`h-4 w-4 ${wishlist.includes(p._id) ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            )}
            <button
              className="hidden md:block rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-[10px] font-bold text-indigo-700 py-1.5 px-2.5 cursor-pointer dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-300 transition-colors"
            >
              See Details
            </button>
          </div>
        </div>
        </div>
        </div>
        </GlareHover>
      </BorderGlow>
    </motion.div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 transition-colors duration-300">
      <Helmet>
        <title>Explore Premium Tech & Electronics | gadgetsprohub</title>
        <meta name="description" content="Browse our extensive directory of trending smartphones, laptops, wearables, audio gear, and smarter gadgets. Find full specifications, ratings, and best tech specifications reviews." />
        <meta name="keywords" content="phone specifications, laptop reviews, smartwatches, audio devices, smart gear, compared specs, gadgetsprohub directory" />
        <link rel="canonical" href="https://gadgetsprohub.com/products" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://gadgetsprohub.com/products" />
        <meta property="og:title" content="Explore Premium Tech & Electronics Specs | gadgetsprohub" />
        <meta property="og:description" content="Browse our extensive directory of trending smartphones, laptops, wearables, audio gear, and smarter gadgets. Find full specifications and tech specs reviews." />
        <meta property="og:image" content="/favicon.png" />
        <meta property="og:site_name" content="gadgetsprohub" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://gadgetsprohub.com/products" />
        <meta name="twitter:title" content="Explore Premium Tech & Electronics | gadgetsprohub" />
        <meta name="twitter:description" content="Browse our extensive directory of trending smartphones, laptops, wearables, and tech gear at gadgetsprohub." />
        <meta name="twitter:image" content="/favicon.png" />

        <meta name="robots" content="index, follow" />
      </Helmet>
      
      {/* BREADCRUMB */}
      <div className="md:px-4">
        <Breadcrumb 
          className="mb-8"
          items={[
          { label: 'Home', onClick: () => onNavigate('home') },
          { label: 'Products', onClick: () => onNavigate('products'), isCurrentPage: !selectedCategory && !search },
          ...(selectedCategory ? [{ 
            label: selectedCategory === 'trending' ? 'Trending' : (categories.find(c => String(c._id) === String(selectedCategory))?.name || 'Category'), 
            isCurrentPage: !search 
          }] : []),
          ...(search ? [{ label: `Search: ${search}`, isCurrentPage: true }] : [])
        ]} />
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 md:px-4">
        <div>
          <h1 className="text-2xl font-black font-sans tracking-tight text-slate-900 dark:text-white">
            {selectedCategory === 'trending' 
              ? 'Top Recommendations & Trending Choices'
              : selectedCategory 
                ? (categories.find(c => String(c._id) === String(selectedCategory))?.name || 'Curated Pack')
                : 'Curated Directories'}
          </h1>
        </div>

        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Filter Minimizer Trigger */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${
              hasActiveFilters
                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-950/25 dark:text-indigo-400 font-black'
                : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          {/* Layout Controls */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 shrink-0">
            <button
              onClick={() => setViewStyle('grid')}
              className={`p-1.5 px-2.5 rounded-md hover:text-indigo-600 transition-all cursor-pointer flex items-center gap-1.5 ${viewStyle === 'grid' ? 'bg-white shadow-xs text-indigo-600 dark:bg-slate-800' : 'text-slate-400'}`}
              title="Grid show"
            >
              <Grid className="h-4 w-4" />
              <span className="text-[10px] font-bold sm:hidden">Tiles</span>
            </button>
            <button
              onClick={() => setViewStyle('list')}
              className={`p-1.5 px-2.5 rounded-md hover:text-indigo-600 transition-all cursor-pointer flex items-center gap-1.5 ${viewStyle === 'list' ? 'bg-white shadow-xs text-indigo-600 dark:bg-slate-800' : 'text-slate-400'}`}
              title="List show"
            >
              <List className="h-4 w-4" />
              <span className="text-[10px] font-bold sm:hidden">List</span>
            </button>
          </div>

          {/* Sort Controller */}
          <div className="relative flex items-center shrink-0">
            <ArrowUpDown className="absolute left-3.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={sortField}
              onChange={(e) => { setSortField(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-200 bg-white py-1.5 pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="price-asc">Sort: Price Low-High</option>
              <option value="price-desc">Sort: Price High-Low</option>
              <option value="rating">Sort: Top Rated</option>
            </select>
          </div>
        </div>
      </div>

      <div className="w-full md:px-4">
        
        {/* Subcategories Filter Tabs */}
        {(() => {
          const activeCategoryObj = categories.find(c => String(c._id) === String(selectedCategory));
          const activeSubcategories = activeCategoryObj?.subcategories || [];
          if (!selectedCategory || !activeCategoryObj || activeSubcategories.length === 0) return null;
          return (
            <div className="mb-6 bg-slate-50 border border-slate-100/80 rounded-2xl p-4 dark:bg-zinc-900/30 dark:border-slate-800/80">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-dashed border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550 flex items-center gap-1.5">
                  <span className="font-sans text-xs">📂</span> Filter by {activeCategoryObj.name} Subcategories
                </span>
                {selectedSubcategory && (
                  <button
                    type="button"
                    onClick={() => { setSelectedSubcategory(''); setCurrentPage(1); }}
                    className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setSelectedSubcategory(''); setCurrentPage(1); }}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                    !selectedSubcategory
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-zinc-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  All {activeCategoryObj.name}
                </button>
                {activeSubcategories.map(sub => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => { setSelectedSubcategory(sub); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                      selectedSubcategory === sub
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                        : 'bg-white border border-slate-200 text-slate-705 hover:bg-slate-50 dark:bg-zinc-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
        
        {/* 1. PRODUCT CARDS LIST / GRID AREA */}
        <div className="w-full space-y-8">
              {loading && products.length === 0 ? (
            <div className={`grid gap-6 ${viewStyle === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-3xl p-12 min-h-[350px] text-center dark:border-slate-800">
              <span className="text-4xl block">🔍</span>
              <h3 className="text-sm font-bold text-slate-800 mt-4 dark:text-white">End of products</h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">No products matched the active filters.</p>
            </div>
          ) : (
            
            /* DYNAMIC SECTIONS LAYOUT AS REQUESTED BY USER */
            <div className="space-y-12">
              {(Object.entries(classifiedSectionGroups) as [string, Product[]][]).map(([sectionName, sectionProds]) => {
                if (sectionProds.length === 0) return null;
                const emoji = getCategoryEmoji(sectionName);
                const isExpanded = !!expandedSections[sectionName];
                const visibleProds = isExpanded ? sectionProds : sectionProds.slice(0, 12);
                const hasMoreThan12 = sectionProds.length > 12;

                return (
                  <div key={sectionName} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xl">{emoji}</span>
                      <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">{sectionName}</h2>
                      <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full px-2.5 py-0.5" id={`section-badge-${sectionName.toLowerCase().replace(/\s+/g, '-')}`}>
                        {sectionProds.length} {sectionProds.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div className={viewStyle === 'grid' 
                      ? "grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4" 
                      : "space-y-4"
                    }>
                      {visibleProds.map((p) => p ? renderProductCard(p) : null)}
                    </div>

                    {hasMoreThan12 && (
                      <div className="flex items-center justify-start pt-2">
                        <button
                          type="button"
                          onClick={() => setExpandedSections(prev => ({ ...prev, [sectionName]: !isExpanded }))}
                          className="px-5 py-2 rounded-full border border-indigo-100 hover:border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/55 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 uppercase tracking-wider flex items-center gap-2"
                        >
                          <span>{isExpanded ? 'See Less' : 'See More'}</span>
                          <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            +{sectionProds.length - 12} More
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* SEE MORE & END OF PRODUCTS PAGINATION TRIGGERS */}
              {totalPages > 1 && (
                <div className="mt-8 pt-6 border-t border-slate-150 dark:border-slate-800 flex flex-col items-center justify-center min-h-[60px] pb-8">
                  {loading ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-650 dark:text-indigo-400 animate-pulse">
                      <span className="h-4 w-4 rounded-full border-2 border-indigo-600/40 border-t-indigo-600 animate-spin"></span>
                      <span>Loading more items...</span>
                    </div>
                  ) : currentPage < totalPages ? (
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="px-6 py-2.5 rounded-full border border-indigo-100 hover:border-indigo-200 bg-indigo-50/50 hover:bg-indigo-150/10 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 uppercase tracking-wider"
                    >
                      See More
                    </button>
                  ) : (
                    <p className="text-xs font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 dark:bg-indigo-950/20 px-5 py-2.5 border border-indigo-100 dark:border-indigo-900/30 rounded-full font-mono">
                      End of products
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Persistent Touch Floating Filter Widget (FAB) */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsFilterOpen(true)}
        className="fixed bottom-20 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl hover:bg-slate-900 active:scale-95 transition-all cursor-pointer"
        title="Open Filter Matrix Parameters"
      >
        <SlidersHorizontal className="h-5 w-5" />
        {hasActiveFilters && (
          <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-white dark:ring-slate-950 animate-bounce">
            !
          </span>
        )}
      </motion.button>

      {/* Dynamic Pop-up Sliding Side Drawer Filters Overlay */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            {/* Backdrop opacity sheet overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close Filters" onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
            />

            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 w-72 sm:w-80 border-r border-slate-200 bg-white shadow-2xl flex flex-col dark:border-slate-800 dark:bg-slate-950"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b p-5 dark:border-slate-800">
                <div className="flex items-center gap-2.5 font-bold text-slate-800 text-xs uppercase tracking-wider dark:text-slate-200">
                  <SlidersHorizontal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Filter Matrix
                </div>
                <div className="flex items-center gap-4">
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Filter Forms content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* Search Keywords */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Search Keywords</h4>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => { 
                          setSearch(e.target.value); 
                          setSelectedCategory('');
                          setSelectedSubcategory('');
                          setMinPrice('');
                          setMaxPrice('');
                          setMinRating('');
                          setSortField('newest');
                          setCurrentPage(1); 
                        }}
                        placeholder="Brand, feature, tags..."
                        className="w-full text-xs rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-slate-900 outline-none focus:border-indigo-505 dark:border-slate-800 dark:bg-[#0c1224] dark:text-white"
                      />
                      {search && (
                        <button
                          onClick={() => { setSearch(''); setCurrentPage(1); }}
                          className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title="Clear input" aria-label="Clear input"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {recentSearches.length > 0 && (
                    <div className="space-y-2 pt-0.5">
                      <div className="flex items-center justify-between text-[10px] font-semibold">
                        <span className="text-slate-400 dark:text-slate-550 uppercase tracking-wider font-bold">Recent Searches</span>
                        <button
                          onClick={handleClearAllRecentSearches}
                          className="text-indigo-650 dark:text-indigo-400 hover:underline font-bold text-[9px] uppercase tracking-wider cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((query, index) => (
                          <div
                            key={index}
                            onClick={() => { setSearch(query); setCurrentPage(1); }}
                            className="group flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-50 border border-slate-100 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-all"
                          >
                            <span className="truncate max-w-[120px]">{query}</span>
                            <button
                              onClick={(e) => handleRemoveRecentSearch(e, query)}
                              className="text-slate-400 hover:text-rose-500 rounded-full transition-colors cursor-pointer"
                              title="Remove search" aria-label="Remove search"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Classifications Hierarchy</h4>
                  <div className="flex flex-col gap-1.5 overflow-hidden">
                    <button
                      onClick={() => { setSelectedCategory(''); setSelectedSubcategory(''); setCurrentPage(1); }}
                      className={`w-full text-left rounded-lg text-xs py-2 px-3 transition-all duration-200 cursor-pointer flex items-center justify-between ${!selectedCategory ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-slate-650 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
                    >
                      <span className="flex items-center gap-1.5">📁 All Classifications</span>
                      {!selectedCategory && <span className="h-1.5 w-1.5 rounded-full bg-white block animate-pulse" />}
                    </button>
                    <button
                      onClick={() => { setSearch(''); setSelectedCategory('trending'); setSelectedSubcategory(''); setCurrentPage(1); }}
                      className={`w-full text-left rounded-lg text-xs py-2 px-3 transition-all duration-200 cursor-pointer flex items-center justify-between ${selectedCategory === 'trending' ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-slate-650 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
                    >
                      <span className="flex items-center gap-1.5">🔥 Trending Choices</span>
                      {selectedCategory === 'trending' && <span className="h-1.5 w-1.5 rounded-full bg-white block animate-pulse" />}
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c._id}
                        onClick={() => { setSearch(''); setSelectedCategory(c._id); setSelectedSubcategory(''); setCurrentPage(1); }}
                        className={`w-full text-left rounded-lg text-xs py-2 px-3 transition-all duration-200 cursor-pointer flex items-center justify-between ${selectedCategory === c._id ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-slate-655 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
                      >
                        <span className="truncate flex items-center">
                          <span className="mr-2 text-sm">{c.icon || '📦'}</span>
                          <span>{c.name}</span>
                        </span>
                        {selectedCategory === c._id && <span className="h-1.5 w-1.5 rounded-full bg-white block animate-pulse" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price limit Spectrum */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pricing Limits (₹)</h4>
                  
                  {/* Preset Pricing buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[200, 500, 1000].map((limitValue) => {
                      const isActive = maxPrice === String(limitValue) && minPrice === '';
                      return (
                        <button
                          key={limitValue}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setMaxPrice('');
                            } else {
                              setMinPrice('');
                              setMaxPrice(String(limitValue));
                            }
                            setCurrentPage(1);
                          }}
                          className={`py-2 px-1 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800'
                          }`}
                        >
                          Under ₹{limitValue}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2.5 items-center">
                    <span className="text-xs text-slate-400 font-bold font-mono">₹</span>
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => { setMinPrice(e.target.value); setCurrentPage(1); }}
                      placeholder="Min"
                      className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-center text-slate-900 outline-none font-mono focus:border-indigo-500 dark:border-slate-800 dark:bg-[#0c1224] dark:text-white"
                    />
                    <span className="text-slate-300">-</span>
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => { setMaxPrice(e.target.value); setCurrentPage(1); }}
                      placeholder="Max"
                      className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-center text-slate-900 outline-none font-mono focus:border-indigo-500 dark:border-slate-800 dark:bg-[#0c1224] dark:text-white"
                    />
                  </div>
                </div>

                {/* Rating parameters */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Minimum User Rating</h4>
                  <div className="flex flex-col gap-1 text-xs">
                    {[4, 3, 2].map((stars) => (
                      <button
                        key={stars}
                        onClick={() => { setMinRating(selected => selected === String(stars) ? '' : String(stars)); setCurrentPage(1); }}
                        className={`flex items-center justify-between py-2 px-3 rounded-lg w-full text-left cursor-pointer transition-all duration-200 ${minRating === String(stars) ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className={`flex gap-0.5 ${minRating === String(stars) ? 'text-amber-300' : 'text-amber-400'}`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < stars ? 'fill-current' : 'text-slate-200'}`} />
                            ))}
                          </div>
                          <span>{stars}.0+ Stars</span>
                        </div>
                        {minRating === String(stars) && <span className="h-1.5 w-1.5 rounded-full bg-white block animate-pulse" />}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
              
              {/* Reset/Apply bar at footer */}
              <div className="border-t p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 flex gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="flex-1 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                  >
                    Reset Limits
                  </button>
                )}
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm text-center"
                >
                  Apply Filters
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3. Specifications Overlay Modal */}
      <AnimatePresence>
        {specModalProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSpecModalProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-black tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-955/35 dark:text-indigo-400 px-2 py-0.5 rounded-full font-mono">
                      {specModalProduct.brand || 'Premium Brand'} Specs Sheet
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">{specModalProduct.sku || 'SKU-SPEC'}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                    {specModalProduct.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSpecModalProduct(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-750 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Close Specifications" aria-label="Close Specifications"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable specs items */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
                {/* Intro & Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  {/* Photo area */}
                  <div className="relative h-44 sm:h-52 bg-slate-50 dark:bg-slate-955/15 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-center overflow-hidden">
                    <img
                      src={specModalProduct.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=310'}
                      alt={specModalProduct.name}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain cursor-zoom-in"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-lightbox', {
                          detail: {
                            src: specModalProduct.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=310',
                            images: specModalProduct.images || [],
                            currentIndex: 0,
                            alt: specModalProduct.name
                          }
                        }));
                      }}
                    />
                    
                    {/* Floating Rating overlay */}
                    <div className="absolute top-2.5 left-2.5 bg-amber-500 text-white font-extrabold font-mono text-[10px] rounded-lg px-2 py-0.5 flex items-center gap-0.5 shadow-sm z-10">
                      ★ {specModalProduct.rating || '4.8'}
                    </div>

                    {specModalProduct.discount && specModalProduct.discount > 0 && (
                      <div className="absolute top-2.5 right-2.5 bg-rose-500 text-white font-black font-mono text-[9px] rounded-lg px-2 py-0.5 uppercaseType">
                        -{specModalProduct.discount}% Off
                      </div>
                    )}
                  </div>

                  {/* Summary card info */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Expert Review Brief</span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                        {specModalProduct.description || 'Check out complete pricing information and review parameters for this gadget choice.'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-100/60 dark:border-slate-800/60 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Deal price</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black text-slate-900 font-mono dark:text-white">₹{specModalProduct.price}</span>
                          {specModalProduct.originalPrice && (
                            <span className="text-xs text-slate-400 line-through font-mono">₹{specModalProduct.originalPrice}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold dark:text-slate-400 text-xs font-mono">
                        <ShieldCheck className="h-4 w-4 text-indigo-500" />
                        <span>Verified Price</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabular Specifications Map */}
                {specModalProduct.specifications && Object.keys(specModalProduct.specifications).length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Technical Specifications</h4>
                    <div className="rounded-xl border border-slate-150 bg-white dark:bg-slate-950 overflow-hidden dark:border-slate-850">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse text-xs min-w-[340px] sm:min-w-0">
                          <thead className="bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3 font-bold text-slate-500 uppercase text-[9px] tracking-wider">Parameter</th>
                              <th className="py-2.5 px-3 font-bold text-slate-500 uppercase text-[9px] tracking-wider">Specification Metric</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {Object.entries(specModalProduct.specifications).map(([key, value]) => (
                              <tr key={key} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors">
                                <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{key}</td>
                                <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px] leading-relaxed break-words">{String(value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Technical Specifications</h4>
                    <p className="text-xs text-slate-400 italic">No specific technical parameter metrics registered yet for this item category. See expert overview for highlight claims.</p>
                  </div>
                )}

                {/* Highlight Featured advantages */}
                {specModalProduct.features && specModalProduct.features.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Highlighted Advantages</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {specModalProduct.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-705 dark:text-slate-300">
                          <CheckCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pros and Cons Split Matrix */}
                {((specModalProduct.pros && specModalProduct.pros.length > 0) || (specModalProduct.cons && specModalProduct.cons.length > 0)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pros */}
                    {specModalProduct.pros && specModalProduct.pros.length > 0 && (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/10 p-4 dark:border-emerald-900/20">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block mb-2">✓ Pros</span>
                        <ul className="space-y-1 text-xs">
                          {specModalProduct.pros.slice(0, 4).map((p, i) => (
                            <li key={i} className="text-slate-600 dark:text-slate-300 flex items-start gap-1">
                              <span className="text-emerald-405">●</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Cons */}
                    {specModalProduct.cons && specModalProduct.cons.length > 0 && (
                      <div className="rounded-xl border border-rose-100 bg-rose-50/10 p-4 dark:border-rose-900/20">
                        <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block mb-2">✗ Cons</span>
                        <ul className="space-y-1 text-xs">
                          {specModalProduct.cons.slice(0, 4).map((c, i) => (
                            <li key={i} className="text-slate-600 dark:text-slate-300 flex items-start gap-1">
                              <span className="text-rose-405">■</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Footer banner */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-150 dark:border-slate-800/80 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSpecModalProduct(null);
                    onNavigate('product-detail', specModalProduct.slug);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-200 py-3 text-xs font-bold transition-all cursor-pointer shadow-3xs"
                >
                  <Search size={14} />
                  <span>View Review & Full Details Page</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    // Track affiliate clicks as well
                    fetch(`/api/products/click/${specModalProduct.slug}`, {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'}
                    }).catch(() => {});
                    window.open(specModalProduct.affiliateLink, '_blank', 'noreferrer,noopener');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  <ShoppingBag size={14} />
                  <span>Shop on Amazon</span>
                  <ExternalLink size={11} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Specs sheet modal */}
      {loadingSpec && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-55 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl flex items-center gap-3.5 shadow-xl border border-slate-100 dark:border-slate-800 animate-pulse">
            <div className="h-5 w-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Loading Specification Sheet...</span>
          </div>
        </div>
      )}
    </div>
  );
};
