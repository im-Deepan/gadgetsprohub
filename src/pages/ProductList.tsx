import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';
import { Product, Category } from '../types';
import { Search, Heart, SlidersHorizontal, ArrowUpDown, Grid, List, Star, X, CheckCheck, ShieldCheck, ShoppingBag, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from '../components/Helmet';
import { Breadcrumb } from '../components/Breadcrumb';
import { BorderGlow } from '../components/BorderGlow';
import { GlareHover } from '../components/GlareHover';
import { SearchAutocompleteInput } from '../components/SearchAutocompleteInput';

import { getCategoryName, filterCategoriesForUI } from '../utils/category';
import { getShortProductTitle, formatProductPrice, formatRating, hasValidDiscount } from '../utils/productUtils';
import { parseSpecificationsString } from '../utils/specParser';
import { getCleanAffiliateUrl } from '../utils/affiliate';
import { CategoryIcon } from '../components/CategoryIcon';

interface ProductListProps {
  initialFilter?: string | null;
  onNavigate: (view: string, slug?: string) => void;
  onPreload?: (view: any, slug?: string) => void;
}

const ProductCardSkeleton = () => (
  <div className="group flex flex-col rounded-xl border border-slate-50 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 overflow-hidden animate-pulse">
    <div className="h-48 bg-slate-100 dark:bg-slate-700 shrink-0"></div>
    <div className="p-4 flex flex-col flex-grow space-y-3">
      <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-700 rounded"></div>
      <div className="h-5 w-full bg-slate-100 dark:bg-slate-700 rounded"></div>
      <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded"></div>
      <div className="mt-auto pt-3 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
        <div className="h-5 w-16 bg-slate-100 dark:bg-slate-700 rounded"></div>
        <div className="h-7 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg"></div>
      </div>
    </div>
  </div>
);

const getCategoryEmoji = (categoryName: string | undefined | null) => {
  if (!categoryName) return '📦';
  const norm = categoryName.trim().toLowerCase();
  if (norm.includes('phone') || norm.includes('mobile') || norm.includes('smartphone') || norm.includes('tablet')) return '📱';
  if (norm.includes('audio') || norm.includes('headphone') || norm.includes('earphone') || norm.includes('speaker') || norm.includes('sound') || norm.includes('mic')) return '🎧';
  if (norm.includes('watch') || norm.includes('clock') || norm.includes('wearable') || norm.includes('smartwatch')) return '⌚';
  if (norm.includes('comput') || norm.includes('laptop') || norm.includes('desktop') || norm.includes('screen') || norm.includes('monitor')) return '💻';
  if (norm.includes('camera') || norm.includes('photo') || norm.includes('video') || norm.includes('lens')) return '📷';
  if (norm.includes('game') || norm.includes('gaming') || norm.includes('console') || norm.includes('play')) return '🎮';
  if (norm.includes('shoe') || norm.includes('footwear') || norm.includes('sneaker')) return '👟';
  if (norm.includes('electron') || norm.includes('tech') || norm.includes('gadget') || norm.includes('appliances') || norm.includes('power') || norm.includes('charger')) return '🔌';
  if (norm.includes('fashion') || norm.includes('cloth') || norm.includes('wear') || norm.includes('style') || norm.includes('bag') || norm.includes('backpack')) return '👕';
  if (norm.includes('home') || norm.includes('decor') || norm.includes('garden') || norm.includes('furniture') || norm.includes('kitchen')) return '🏠';
  if (norm.includes('sport') || norm.includes('fit') || norm.includes('gym') || norm.includes('athletic')) return '⚽';
  if (norm.includes('book') || norm.includes('educat') || norm.includes('read')) return '📚';
  if (norm.includes('health') || norm.includes('beauty') || norm.includes('care') || norm.includes('medical') || norm.includes('wellness')) return '🏥';
  return '📦';
};

export const ProductList: React.FC<ProductListProps> = ({ initialFilter, onNavigate, onPreload }) => {
  const { wishlist, toggleWishlist, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  
  // States
  const [specModalProduct, setSpecModalProduct] = useState<Product | null>(null);
  const [loadingSpec, setLoadingSpec] = useState(false);
  const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const hasActiveFilters = Boolean(search || selectedCategory || minPrice || maxPrice || minRating);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Categories loading via TanStack Query
  const { data: categoriesData = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async ({ signal }) => {
      const res = await apiFetch('/api/categories', { signal });
      if (!res.ok) throw new Error('Failed to load categories');
      return res.json();
    }
  });

  // Products loading via TanStack Query
  const { data: productsData, isLoading: productsLoading, isFetching: productsFetching } = useQuery({
    queryKey: ['products', debouncedSearch, selectedCategory, selectedSubcategory, minPrice, maxPrice, minRating, sortField, currentPage],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedSubcategory) params.append('subcategory', selectedSubcategory);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (minRating) params.append('rating', minRating);
      if (sortField) params.append('sort', sortField);
      
      params.append('page', String(currentPage));
      params.append('limit', '200');

      const res = await apiFetch(`/api/products?${params.toString()}`, { signal });
      if (!res.ok) throw new Error('Failed to load products');
      return res.json();
    },
    placeholderData: (previousData) => previousData
  });

  const [accumulatedProducts, setAccumulatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!productsData?.products) return;
    if (currentPage === 1) {
      setAccumulatedProducts(productsData.products);
    } else {
      setAccumulatedProducts(prev => {
        const existingIds = new Set(prev.map(p => String(p._id || p.id || p.asin)));
        const newUnique = productsData.products.filter(
          (p: Product) => !existingIds.has(String(p._id || p.id || p.asin))
        );
        return [...prev, ...newUnique];
      });
    }
  }, [productsData, currentPage]);

  const products = accumulatedProducts.length > 0 ? accumulatedProducts : (productsData?.products || []);
  const totalPages = productsData?.pages || 1;
  const loading = productsLoading || productsFetching;

  const categories = React.useMemo(() => {
    return filterCategoriesForUI(categoriesData, products, 1);
  }, [categoriesData, products]);

  // ESC key to close specs modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && specModalProduct) {
        setSpecModalProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [specModalProduct]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const classifiedSectionGroups = useMemo(() => {
    const groups: Record<string, Product[]> = {};

    // 1. Identify "Shoes" first vs other categories
    const shoes: Product[] = [];

    products.forEach((p: Product) => {
      // Find the normalized category name of this product
      const catName = getCategoryName(p.category, categories);

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

  // Parse initial filters from incoming routing params
  useEffect(() => {
    const controller = new AbortController();
    if (initialFilter) {
      if (initialFilter.startsWith('category-')) {
        const cat = initialFilter.replace('category-', '');
        const matched = categories.find(c => c.slug === cat || String(c._id) === cat);
        const catId = matched ? String(matched._id) : cat;
        setSelectedCategory(catId);
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
        apiFetch(`/api/products/${slug}`, { signal: controller.signal })
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('Product not found');
          })
          .then(data => { if (data) { setSpecModalProduct(data); } })
          .catch(err => {
            if (err.name !== 'AbortError') {
              console.warn('ProductList specification modal product fetch error:', err);
            }
          })
          .finally(() => {
            if (!controller.signal.aborted) {
              setLoadingSpec(false);
            }
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

    return () => {
      controller.abort();
    };
  }, [initialFilter, categories]);

  // Listener to reset all filter parameters dynamically on user action
  useEffect(() => {
    const handleReset = () => {
      setSelectedCategory('');
      setSearch('');
      setDebouncedSearch('');
      setSelectedSubcategory('');
      setMinPrice('');
      setMaxPrice('');
      setMinRating('');
      setCurrentPage(1);
    };
    window.addEventListener('reset-product-filters', handleReset);
    return () => window.removeEventListener('reset-product-filters', handleReset);
  }, []);

  const handleResetFilters = () => {
    const previousSearch = search;
    const previousSelectedCategory = selectedCategory;
    const previousSelectedSubcategory = selectedSubcategory;
    const previousMinPrice = minPrice;
    const previousMaxPrice = maxPrice;
    const previousMinRating = minRating;
    const previousSortField = sortField;
    const previousCurrentPage = currentPage;
    const previousExpandedSections = { ...expandedSections };

    setSearch('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setSortField('newest');
    setCurrentPage(1);
    setExpandedSections({});

    showToast(
      "All active filters have been cleared.",
      "info",
      5000,
      "User Action",
      () => {
        setSearch(previousSearch);
        setSelectedCategory(previousSelectedCategory);
        setSelectedSubcategory(previousSelectedSubcategory);
        setMinPrice(previousMinPrice);
        setMaxPrice(previousMaxPrice);
        setMinRating(previousMinRating);
        setSortField(previousSortField);
        setCurrentPage(previousCurrentPage);
        setExpandedSections(previousExpandedSections);
        showToast("Filters restored successfully.", "success", 3000, "User Action");
      }
    );
  };

  const handleClearSubcategoryFilter = () => {
    const previousSub = selectedSubcategory;
    const previousPage = currentPage;
    
    setSelectedSubcategory('');
    setCurrentPage(1);
    
    showToast(
      `Subcategory "${previousSub}" filter cleared.`,
      "info",
      5000,
      "User Action",
      () => {
        setSelectedSubcategory(previousSub);
        setCurrentPage(previousPage);
        showToast("Subcategory filter restored.", "success", 3000, "User Action");
      }
    );
  };

  const renderProductCard = (p: Product) => {
    const ratingObj = formatRating(p.rating, p.totalReviews || p.reviewsCount || p.reviewCount);
    const isDiscounted = hasValidDiscount(p.price, p.originalPrice, p.discount);
    const shortTitle = getShortProductTitle(p.name, p.brand, 55);

    return (
    <a
      key={p._id}
      href={`/product-detail/${p.slug}`}
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
          e.preventDefault();
          onNavigate('product-detail', p.slug);
        }
      }}
      onMouseEnter={() => {
        if (p.slug) onPreload?.('product-detail', p.slug);
      }}
      className="group block text-inherit no-underline h-full"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="h-full"
      >
        <BorderGlow
          className={`flex rounded-xl border border-slate-100/50 dark:border-slate-700/80 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
            viewStyle === 'grid'
              ? 'flex-col hover:shadow-zinc-400/10 hover:shadow-sm border border-slate-200 dark:border-slate-800 h-full'
              : 'flex-col sm:flex-row hover:shadow-zinc-400/10 hover:shadow-sm border border-slate-200 dark:border-slate-800'
          }`}
          borderRadius={12}
        >
          <GlareHover glareOpacity={0.15} glareSize={250} transitionDuration={700}>
          <div className={`flex w-full ${viewStyle === 'grid' ? 'flex-col h-full' : 'flex-col sm:flex-row'}`}>
            {/* Card Media Area */}
            <div className={`bg-slate-50 dark:bg-slate-950 overflow-hidden relative shrink-0 transition-all duration-300 ${
              viewStyle === 'grid'
                ? 'h-32 sm:h-44 w-full'
                : 'w-full sm:w-48 h-40'
            }`}>
              <img
                src={p.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500'}
                alt={shortTitle}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain p-2 bg-slate-50/50 dark:bg-slate-950/20 group-hover:scale-103 transition-transform duration-500 cursor-pointer"
              />
              
              {isDiscounted && (
                <span className="absolute top-2.5 left-2.5 bg-rose-500 rounded px-1.5 py-0.5 text-[8px] font-bold text-white font-mono uppercase tracking-wider shadow-xs">
                  -{p.discount}% OFF
                </span>
              )}

              {isAuthenticated && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(p._id, p.name); }}
                  className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 shadow-xs hover:text-rose-400 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <Heart className={`h-4 w-4 ${wishlist.includes(p._id) ? 'fill-rose-400 text-rose-400' : ''}`} />
                </button>
              )}

              {ratingObj.hasRating && (
                <div className="absolute bottom-2 left-2 bg-amber-400 text-slate-900 font-black font-mono text-[9px] rounded-md px-1.5 py-0.5 flex items-center gap-0.5 shadow-xs">
                  {ratingObj.text}
                </div>
              )}
            </div>

            {/* Card Content Area */}
            <div className={`flex flex-col flex-grow justify-between font-sans ${viewStyle === 'grid' ? 'p-3 sm:p-4' : 'p-4'}`}>
              <div>
                <div className="flex items-center justify-between gap-1 text-[9px] font-bold text-slate-400">
                  <span className="truncate flex-1">
                    {getCategoryName(p.category, categories)}
                  </span>
                  <span className="uppercase font-mono truncate shrink-0 max-w-[60px] text-right">{p.brand || 'Premium'}</span>
                </div>

                <h3 className={`font-bold text-slate-800 leading-snug mt-1.5 line-clamp-2 group-hover:text-zinc-900 dark:text-white transition-colors duration-300 ${
                  viewStyle === 'grid' ? 'text-xs sm:text-sm' : 'text-sm'
                }`}>
                  {shortTitle}
                </h3>
                
                {!ratingObj.hasRating && (
                  <span className="text-[10px] text-slate-400 italic block mt-0.5">
                    No reviews yet
                  </span>
                )}

                <p className={`text-slate-500 line-clamp-2 mt-1 dark:text-slate-300 leading-relaxed ${
                  viewStyle === 'grid' ? 'text-[10px] sm:text-[11px]' : 'text-xs'
                }`}>
                  {p.description}
                </p>
              </div>

              <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-black font-mono text-zinc-900 dark:text-white">
                    {formatProductPrice(p.price, p)}
                  </span>
                  {isDiscounted && (
                    <span className="text-[9px] sm:text-[10px] text-slate-400 line-through font-mono">
                      {formatProductPrice(p.originalPrice, p)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {viewStyle === 'list' && isAuthenticated && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(p._id, p.name); }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-400 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                    >
                      <Heart className={`h-3.5 w-3.5 ${wishlist.includes(p._id) ? 'fill-rose-400 text-rose-400' : ''}`} />
                    </span>
                  )}
                  <span
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSpecModalProduct(p); }}
                    className="rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 py-1 px-2 cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors duration-300 inline-block"
                  >
                    Specs
                  </span>
                  <span
                    className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-zinc-100 text-[10px] font-extrabold text-zinc-900 dark:text-white py-1 px-2 cursor-pointer dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-900 transition-colors duration-300 flex items-center gap-1"
                  >
                    <span>View Product</span>
                    <span>→</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          </GlareHover>
        </BorderGlow>
      </motion.div>
    </a>
  );
};

  const renderFilterControls = () => (
    <div className="space-y-6">
      {/* Search Keywords */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Search Keywords</h4>
        <SearchAutocompleteInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          onNavigate={onNavigate}
          variant="catalog"
          placeholder="Brand, product, feature..."
          inputClassName="w-full text-xs rounded-xl border border-slate-200/80 bg-white py-2 pl-9 pr-8 text-slate-800 outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          onClear={() => setSearch('')}
        />
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Classifications</h4>
        <div className="flex flex-col gap-1 overflow-hidden">
          <button
            onClick={() => { setSelectedCategory(''); setSelectedSubcategory(''); setCurrentPage(1); }}
            className={`w-full text-left rounded-lg text-xs py-2 px-3 transition-all duration-200 cursor-pointer flex items-center justify-between ${!selectedCategory ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'}`}
          >
            <span className="flex items-center gap-2">
              <CategoryIcon name="all" className="h-4 w-4" />
              <span>All Classifications</span>
            </span>
            {!selectedCategory && <span className="h-1.5 w-1.5 rounded-full bg-white block animate-pulse" />}
          </button>
          <button
            onClick={() => { setSearch(''); setSelectedCategory('trending'); setSelectedSubcategory(''); setCurrentPage(1); }}
            className={`w-full text-left rounded-lg text-xs py-2 px-3 transition-all duration-200 cursor-pointer flex items-center justify-between ${selectedCategory === 'trending' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'}`}
          >
            <span className="flex items-center gap-2">
              <CategoryIcon name="trending" className="h-4 w-4 text-amber-500" />
              <span>Trending Choices</span>
            </span>
            {selectedCategory === 'trending' && <span className="h-1.5 w-1.5 rounded-full bg-white block animate-pulse" />}
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => { setSearch(''); setSelectedCategory(c._id); setSelectedSubcategory(''); setCurrentPage(1); }}
              className={`w-full text-left rounded-lg text-xs py-2 px-3 transition-all duration-200 cursor-pointer flex items-center justify-between ${String(selectedCategory) === String(c._id) ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'}`}
            >
              <span className="truncate flex items-center gap-2">
                <CategoryIcon name={c.name} className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{c.name}</span>
              </span>
              {String(selectedCategory) === String(c._id) && <span className="h-1.5 w-1.5 rounded-full bg-white block animate-pulse" />}
            </button>
          ))}
        </div>
      </div>

      {/* Price Limits in INR (₹) */}
      <div className="space-y-2.5">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Price Brackets (₹)</h4>
        
        {/* Presets */}
        <div className="grid grid-cols-2 gap-1.5">
          {[1000, 5000, 15000].map((limitValue) => {
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
                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border text-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs font-bold dark:bg-white dark:border-white dark:text-zinc-900'
                    : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
                }`}
              >
                Under ₹{limitValue.toLocaleString('en-IN')}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              const isActive = minPrice === '15000' && maxPrice === '';
              if (isActive) {
                setMinPrice('');
              } else {
                setMinPrice('15000');
                setMaxPrice('');
              }
              setCurrentPage(1);
            }}
            className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border text-center transition-all duration-200 cursor-pointer ${
              minPrice === '15000' && maxPrice === ''
                ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs font-bold dark:bg-white dark:border-white dark:text-zinc-900'
                : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            ₹15,000+
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-xs text-slate-400 font-bold">₹</span>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); setCurrentPage(1); }}
            placeholder="Min"
            className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-center text-slate-800 outline-none focus:border-zinc-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <span className="text-slate-300">-</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); setCurrentPage(1); }}
            placeholder="Max"
            className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-center text-slate-800 outline-none focus:border-zinc-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Minimum Rating - Hidden until rating data exists */}
      <div className="hidden space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Minimum Rating</h4>
        <div className="flex flex-col gap-1 text-xs">
          {[4, 3, 2].map((stars) => (
            <button
              key={stars}
              onClick={() => { setMinRating(selected => selected === String(stars) ? '' : String(stars)); setCurrentPage(1); }}
              className={`flex items-center justify-between py-2 px-3 rounded-lg w-full text-left cursor-pointer transition-all duration-200 ${minRating === String(stars) ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'}`}
            >
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={`star-${stars}-${i}`} className={`h-3 w-3 ${i < stars ? 'fill-current' : 'text-slate-200 dark:text-slate-700'}`} />
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
          <h1 className="text-2xl font-black font-sans tracking-tight text-slate-800 dark:text-white">
            {selectedCategory === 'trending' 
              ? 'Top Recommendations & Trending Choices'
              : selectedCategory 
                ? (categories.find(c => String(c._id) === String(selectedCategory))?.name || 'Curated Pack')
                : 'Curated Directories'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Showing {products.length} {products.length === 1 ? 'product' : 'products'}
            {productsData?.total ? ` of ${productsData.total}` : ''}
          </p>
        </div>

        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Filter Minimizer Trigger (Mobile & Tablet only) */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`lg:hidden flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all duration-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${
              hasActiveFilters
                ? 'border-zinc-700 bg-slate-100 dark:bg-slate-800/50 text-zinc-900 dark:text-white dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200 font-black'
                : 'border-slate-100 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-300" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
            )}
          </button>

          {/* Layout Controls */}
          <div className="flex rounded-lg border border-slate-100 p-0.5 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 shrink-0">
            <button
              onClick={() => setViewStyle('grid')}
              className={`p-1.5 px-2.5 rounded-md hover:text-zinc-900 dark:text-white transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${viewStyle === 'grid' ? 'bg-white shadow-xs text-zinc-900 dark:text-white dark:bg-slate-700' : 'text-slate-300'}`}
              title="Grid show"
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" aria-hidden="true" />
              <span className="text-[10px] font-bold sm:hidden">Tiles</span>
            </button>
            <button
              onClick={() => setViewStyle('list')}
              className={`p-1.5 px-2.5 rounded-md hover:text-zinc-900 dark:text-white transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${viewStyle === 'list' ? 'bg-white shadow-xs text-zinc-900 dark:text-white dark:bg-slate-700' : 'text-slate-300'}`}
              title="List show"
              aria-label="List view"
            >
              <List className="h-4 w-4" aria-hidden="true" />
              <span className="text-[10px] font-bold sm:hidden">List</span>
            </button>
          </div>

          {/* Sort Controller */}
          <div className="relative flex items-center shrink-0">
            <ArrowUpDown className="absolute left-3.5 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
            <select
              value={sortField}
              onChange={(e) => { setSortField(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-100 bg-white py-1.5 pl-10 pr-4 text-xs font-semibold text-slate-600 outline-none focus:border-zinc-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 cursor-pointer transition-colors duration-300"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="price-asc">Sort: Price Low-High</option>
              <option value="price-desc">Sort: Price High-Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT WITH DOCKED DESKTOP SIDEBAR */}
      <div className="flex flex-col md:flex-row md:items-start md:gap-6 lg:gap-8 w-full md:px-4 relative">
        
        {/* PERMANENTLY DOCKED DESKTOP LEFT SIDEBAR (>=1024px) */}
        <aside className="hidden lg:block w-70 xl:w-72 shrink-0 sticky top-20 rounded-xl bg-white dark:bg-slate-900/60 p-5 border border-slate-200/80 dark:border-slate-800 space-y-5 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-xs uppercase tracking-wider dark:text-slate-100">
              <SlidersHorizontal className="h-4 w-4 text-zinc-900 dark:text-white" />
              <span>Filter Matrix</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[10px] font-bold text-zinc-900 dark:text-white hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
          {renderFilterControls()}
        </aside>

        {/* MAIN PRODUCTS COLUMN */}
        <div className="flex-1 min-w-0 space-y-6">
          
          {/* Subcategories Filter Tabs */}
          {(() => {
            const activeCategoryObj = categories.find(c => String(c._id) === String(selectedCategory));
            const activeSubcategories = activeCategoryObj?.subcategories || [];
            if (!selectedCategory || !activeCategoryObj || activeSubcategories.length === 0) return null;
            return (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 dark:bg-zinc-800/30 dark:border-slate-700/80">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-dashed border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                    Subcategories in {activeCategoryObj.name}
                  </span>
                  {selectedSubcategory && (
                    <button
                      type="button"
                      onClick={handleClearSubcategoryFilter}
                      className="text-[10px] font-black uppercase text-zinc-900 dark:text-white hover:text-zinc-900 dark:text-white dark:text-zinc-200 cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClearSubcategoryFilter}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                      !selectedSubcategory
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-white shadow-xs'
                        : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 dark:bg-zinc-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700'
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
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-white shadow-xs'
                          : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 dark:bg-zinc-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          
          {/* PRODUCT CARDS LIST / GRID AREA */}
          <div className="w-full space-y-8 min-h-0 h-auto">
            {loading && products.length === 0 ? (
              <div className={`grid gap-6 ${viewStyle === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3' : 'grid-cols-1'}`}>
                {[...Array(6)].map((_, i) => (
                  <ProductCardSkeleton key={`skeleton-prod-${i}`} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-3xl p-12 text-center dark:border-slate-700">
                <span className="text-3xl block">🔍</span>
                <h3 className="text-sm font-bold text-slate-700 mt-3 dark:text-white">No products found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">Try loosening your search filters or browse all classifications.</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-white font-bold text-xs hover:bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 transition-all cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              
              /* SECTIONS LAYOUT */
              <div className="space-y-10">
                {(Object.entries(classifiedSectionGroups) as [string, Product[]][]).map(([sectionName, sectionProds]) => {
                  if (sectionProds.length === 0) return null;
                  const isExpanded = Boolean(expandedSections[sectionName]);
                  const visibleProds = isExpanded ? sectionProds : sectionProds.slice(0, 12);
                  const hasMoreThan12 = sectionProds.length > 12;

                  return (
                    <div key={sectionName} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <CategoryIcon name={sectionName} className="h-5 w-5 text-zinc-900 dark:text-white" />
                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{sectionName}</h2>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 dark:bg-zinc-800/50 text-zinc-900 dark:text-white dark:text-zinc-200 rounded-full px-2 py-0.5">
                          {sectionProds.length} {sectionProds.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      <div className={viewStyle === 'grid' 
                        ? "grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-3" 
                        : "space-y-4"
                      }>
                        {visibleProds.map((p) => p ? renderProductCard(p) : null)}
                      </div>

                      {hasMoreThan12 && (
                        <div className="flex items-center justify-start pt-2">
                          <button
                            type="button"
                            onClick={() => setExpandedSections(prev => ({ ...prev, [sectionName]: !isExpanded }))}
                            className="px-5 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 hover:bg-zinc-800/50 text-zinc-900 dark:text-white dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all duration-300 cursor-pointer shadow-xs active:scale-95 uppercase tracking-wider flex items-center gap-2"
                          >
                            <span>{isExpanded ? 'See Less' : 'See More'}</span>
                            <span className="bg-zinc-100 dark:bg-zinc-100 text-zinc-900 dark:text-zinc-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              +{sectionProds.length - 12} More
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* SEE MORE / PAGINATION TRIGGERS */}
                {totalPages > 1 && (
                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center pb-8">
                    {loading ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white dark:text-zinc-200 animate-pulse">
                        <span className="h-4 w-4 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin"></span>
                        <span>Loading more items...</span>
                      </div>
                    ) : currentPage < totalPages ? (
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 hover:bg-zinc-800/50 text-zinc-900 dark:text-white dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all duration-300 cursor-pointer shadow-xs active:scale-95 uppercase tracking-wider"
                      >
                        See More
                      </button>
                    ) : (
                      <p className="text-xs font-bold uppercase text-zinc-900 dark:text-white tracking-wider bg-slate-100 dark:bg-slate-800 dark:bg-zinc-800/50 px-4 py-2 border border-slate-200 dark:border-slate-700 dark:border-zinc-700 rounded-full font-mono">
                        End of products
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Touch Floating Filter Widget (Mobile & Tablet ONLY) */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsFilterOpen(true)}
        className="md:hidden fixed bottom-20 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-white shadow-sm border border-slate-200 dark:border-slate-800 hover:bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 active:scale-95 transition-all duration-300 cursor-pointer"
        aria-label="Open Filter Drawer"
        title="Open Filter Drawer"
      >
        <SlidersHorizontal className="h-5 w-5" />
        {hasActiveFilters && (
          <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-rose-400 text-[8px] font-bold text-white ring-2 ring-white dark:ring-slate-950 animate-bounce">
            !
          </span>
        )}
      </motion.button>

      /* Dynamic Mobile Sliding Side Drawer Overlay */
      <AnimatePresence>
        {isFilterOpen && (
          <div className="lg:hidden">
            {/* Backdrop opacity sheet overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close Filters" 
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
            />

            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 w-72 sm:w-80 border-r border-slate-100 bg-white shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col dark:border-slate-800 dark:bg-slate-950 overflow-y-auto h-auto max-h-screen"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b p-4 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs uppercase tracking-wider dark:text-slate-100">
                  <SlidersHorizontal className="h-4 w-4 text-zinc-900 dark:text-white" />
                  <span>Filter Matrix</span>
                </div>
                <div className="flex items-center gap-3">
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="text-[10px] font-bold text-zinc-900 dark:text-white hover:text-zinc-900 dark:text-white dark:text-zinc-200 cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Filter Forms content */}
              <div className="p-5">
                {renderFilterControls()}
              </div>
              
              {/* Footer action bar (sticky to content bottom) */}
              <div className="border-t p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 flex gap-3 mt-auto shrink-0">
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="flex-1 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors cursor-pointer shadow-xs text-center dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-100"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
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
              className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-sm border border-slate-200 dark:border-slate-800 border border-slate-50 dark:border-slate-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="spec-modal-title"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-50 dark:border-slate-700 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-black tracking-wider text-zinc-900 dark:text-white bg-slate-100 dark:bg-slate-800 dark:bg-zinc-800/50 dark:text-zinc-200 px-2 py-0.5 rounded-full font-mono">
                      {specModalProduct.brand || 'Premium Brand'} Specs Sheet
                    </span>
                    <span className="text-[9px] font-mono text-slate-300 font-bold uppercase tracking-wider">{specModalProduct.sku || 'SKU-SPEC'}</span>
                  </div>
                  <h3 id="spec-modal-title" className="text-base font-black text-slate-800 dark:text-white leading-snug">
                    {specModalProduct.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSpecModalProduct(null)}
                  className="p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-300 hover:text-slate-700 dark:hover:text-slate-100 transition-colors duration-300 cursor-pointer"
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
                  <div className="relative h-44 sm:h-52 bg-slate-50 dark:bg-slate-950/15 rounded-xl border border-slate-50 dark:border-slate-700 p-4 flex items-center justify-center overflow-hidden">
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
                    <div className="absolute top-2.5 left-2.5 bg-amber-400 text-white font-extrabold font-mono text-[10px] rounded-lg px-2 py-0.5 flex items-center gap-0.5 shadow-sm z-10">
                      ★ {specModalProduct.rating && specModalProduct.rating > 0 ? specModalProduct.rating : 'N/A'}
                    </div>

                    {specModalProduct.discount && specModalProduct.discount > 0 && (
                      <div className="absolute top-2.5 right-2.5 bg-rose-400 text-white font-black font-mono text-[9px] rounded-lg px-2 py-0.5 uppercase tracking-wider">
                        -{specModalProduct.discount}% Off
                      </div>
                    )}
                  </div>

                  {/* Summary card info */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Expert Review Brief</span>
                      <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed font-sans">
                        {specModalProduct.description || 'Check out complete pricing information and review parameters for this gadget choice.'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-50/60 dark:border-slate-700/60 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-300 font-bold uppercase block">Deal price</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black text-slate-800 font-mono dark:text-white">{formatProductPrice(specModalProduct.price, specModalProduct)}</span>
                          {specModalProduct.originalPrice && (
                            <span className="text-xs text-slate-300 line-through font-mono">{formatProductPrice(specModalProduct.originalPrice, specModalProduct)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-slate-400 font-bold dark:text-slate-300 text-xs font-mono">
                        <ShieldCheck className="h-4 w-4 text-zinc-900" />
                        <span>Verified Price</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabular Specifications Map */}
                {(() => {
                  const modalSpecMap = parseSpecificationsString(specModalProduct?.specifications);
                  return (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 dark:text-slate-400">Technical Specifications</h4>
                      {modalSpecMap && Object.keys(modalSpecMap).length > 0 ? (
                        <div className="rounded-xl border border-slate-50 bg-white dark:bg-slate-950 overflow-hidden dark:border-slate-700">
                          <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse text-xs min-w-[340px] sm:min-w-0">
                              <thead className="bg-slate-50/50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                  <th className="py-2.5 px-3 font-bold text-slate-400 uppercase text-[9px] tracking-wider">Parameter</th>
                                  <th className="py-2.5 px-3 font-bold text-slate-400 uppercase text-[9px] tracking-wider">Specification Metric</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {Object.entries(modalSpecMap).map(([key, value]) => (
                                  <tr key={key} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors duration-300">
                                    <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-100">{key}</td>
                                    <td className="py-2 px-3 text-slate-500 dark:text-slate-300 font-mono text-[11px] leading-relaxed break-words">{String(value)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center">
                          <p className="text-slate-500 dark:text-slate-400 text-xs">Detailed specifications are currently unavailable for this item.</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Highlight Featured advantages */}
                {specModalProduct.features && specModalProduct.features.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300">Highlighted Advantages</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {specModalProduct.features.map((feat, idx) => (
                        <div key={`feature-${idx}`} className="flex items-center gap-2 text-slate-600 dark:text-slate-200">
                          <CheckCheck className="h-4 w-4 text-emerald-400 shrink-0" />
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
                      <div className="rounded-xl border border-emerald-50 bg-emerald-50/10 p-4 dark:border-emerald-800/20">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-300 block mb-2">✓ Pros</span>
                        <ul className="space-y-1 text-xs">
                          {specModalProduct.pros.slice(0, 4).map((p, i) => (
                            <li key={`pro-${i}`} className="text-slate-500 dark:text-slate-200 flex items-start gap-1">
                              <span className="text-emerald-405">●</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Cons */}
                    {specModalProduct.cons && specModalProduct.cons.length > 0 && (
                      <div className="rounded-xl border border-rose-50 bg-rose-50/10 p-4 dark:border-rose-800/20">
                        <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-300 block mb-2">✗ Cons</span>
                        <ul className="space-y-1 text-xs">
                          {specModalProduct.cons.slice(0, 4).map((c, i) => (
                            <li key={`con-${i}`} className="text-slate-500 dark:text-slate-200 flex items-start gap-1">
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
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-50 dark:border-slate-700/80 flex flex-col sm:flex-row gap-3">
                <a
                  href={`/product-detail/${specModalProduct?.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!specModalProduct) return;
                    const slug = specModalProduct.slug;
                    setSpecModalProduct(null);
                    onNavigate('product-detail', slug);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-100 py-3 text-xs font-bold transition-all duration-300 cursor-pointer shadow-xs"
                >
                  <Search size={14} />
                  <span>View Review & Full Details Page</span>
                </a>
                
                <button
                  type="button"
                  onClick={() => {
                    if (!specModalProduct) return;
                    // Track affiliate clicks as well
                    apiFetch(`/api/products/click/${specModalProduct.slug}`, {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'}
                    }).catch((err) => {
                      console.error('[ProductList click tracker]', err);
                    });
                    const targetUrl = getCleanAffiliateUrl(specModalProduct.affiliateLink, specModalProduct.asin, specModalProduct.affiliateCode);
                    if (targetUrl) {
                      window.open(targetUrl, '_blank', 'noreferrer,noopener');
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-white py-3 text-xs font-bold transition-all duration-300 cursor-pointer shadow-md"
                >
                  <ShoppingBag size={14} />
                  <span>Shop on {specModalProduct.seller || specModalProduct.marketplace || 'Store'}</span>
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
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl flex items-center gap-3.5 shadow-sm border border-slate-200 dark:border-slate-800 border border-slate-50 dark:border-slate-700 animate-pulse">
            <div className="h-5 w-5 rounded-full border-2 border-zinc-700 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-100">Loading Specification Sheet...</span>
          </div>
        </div>
      )}
    </div>
  );
};
