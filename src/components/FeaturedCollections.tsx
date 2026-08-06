import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles, Flame, Laptop, Smartphone, Headphones, Watch, ArrowRight, Grid, Plus } from 'lucide-react';
import { Product, Category } from '../types';
import { getCategoryId } from '../utils/category';
import { formatProductPrice } from '../utils/productUtils';

interface FeaturedCollectionsProps {
  onNavigate: (view: string, id?: string) => void;
  allProducts: Product[];
  categories: Category[];
}

interface CollectionItem {
  _id: string;
  name: string;
  description: string;
  slug: string;
  products: Product[];
  icon?: React.ReactNode;
}

export const FeaturedCollections: React.FC<FeaturedCollectionsProps> = ({
  onNavigate,
  allProducts,
  categories
}) => {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  // Indices of collections currently assigned to the 3 grid slots (Large, Medium 1, Medium 2)
  const [slotIndices, setSlotIndices] = useState<number[]>([0, 1, 2]);

  // Parse and assemble collections when products and categories are loaded
  useEffect(() => {
    if (!allProducts.length) return;

    const list: CollectionItem[] = [];

    // 1. Trending Choices
    const trendingProducts = allProducts.filter(p => p.trending);
    if (trendingProducts.length > 0) {
      list.push({
        _id: 'trending',
        name: 'Trending',
        description: 'Elite real-time selection of top-performing items.',
        slug: 'trending',
        products: trendingProducts,
        icon: <Flame className="h-4 w-4 text-amber-400" />
      });
    }

    // Map other categories from categories list
    categories.forEach((cat) => {
      const catProducts = allProducts.filter(p => {
        const prodCatId = getCategoryId(p.category);
        return String(prodCatId) === String(cat._id);
      });

      if (catProducts.length > 0) {
        // Choose appropriate icon depending on category name
        let icon = <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />;
        const cleanName = cat.name.toLowerCase();
        if (cleanName.includes('smart') || cleanName.includes('phone')) {
          icon = <Smartphone className="h-4 w-4 text-blue-400" />;
        } else if (cleanName.includes('laptop') || cleanName.includes('computer')) {
          icon = <Laptop className="h-4 w-4 text-emerald-400" />;
        } else if (cleanName.includes('audio') || cleanName.includes('headphone') || cleanName.includes('speaker')) {
          icon = <Headphones className="h-4 w-4 text-indigo-400" />;
        } else if (cleanName.includes('wear') || cleanName.includes('watch')) {
          icon = <Watch className="h-4 w-4 text-rose-400" />;
        }

        list.push({
          _id: cat._id,
          name: cat.name,
          description: cat.description || `Verified premium selection of ${cat.name.toLowerCase()} technology.`,
          slug: cat.slug,
          products: catProducts,
          icon
        });
      }
    });

    setCollections(list);

    // Set initial slot indices if list matches
    if (list.length >= 3) {
      setSlotIndices([0, 1, 2]);
    } else if (list.length === 2) {
      setSlotIndices([0, 1, 0]); // Fallback safely
    } else if (list.length === 1) {
      setSlotIndices([0, 0, 0]);
    }
  }, [allProducts, categories]);

  // Auto-rotate the collections mapped to the grid slots every 14 seconds
  useEffect(() => {
    if (collections.length <= 3) return;

    const interval = setInterval(() => {
      setSlotIndices((prev) => {
        return prev.map((idx) => (idx + 1) % collections.length);
      });
    }, 14000);

    return () => clearInterval(interval);
  }, [collections]);

  if (collections.length === 0) return null;

  // Render bento layout with 3 slots for desktop:
  // Slot 0 matches the premium highlight (spans 2 columns on desktop)
  // Slot 1 and Slot 2 are secondary side selections
  const primaryCollection = collections[slotIndices[0] % collections.length];
  const secCollection1 = collections[slotIndices[1] % collections.length];
  const secCollection2 = collections[slotIndices[2] % collections.length];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Editorial Title Header */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-6 pb-3 border-b border-slate-100/60 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Grid className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-800 dark:text-white font-sans uppercase">
            Signature Spotlights
          </h2>
          <span className="ml-2 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-200 font-mono uppercase tracking-wide">
            Featured
          </span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-300 font-sans mt-1 md:mt-0">
          Auto-rotating highlights. Swipe or tap arrows to browse active specifications and collections.
        </p>
      </div>

      {/* 1. DESKTOP/TABLET BENTO VIEW (md and up) */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Slot 0: Primary Highlight Card (Spans col-span-2 on large screens) */}
        {primaryCollection && (
          <div className="md:col-span-2">
            <DesktopCollectionCard
              collection={primaryCollection}
              isLarge={true}
              onNavigate={onNavigate}
            />
          </div>
        )}

        {/* Slot 1: Secondary Card (Single column) */}
        {secCollection1 && (
          <div className="col-span-1">
            <DesktopCollectionCard
              collection={secCollection1}
              isLarge={false}
              onNavigate={onNavigate}
            />
          </div>
        )}

        {/* Slot 2: Full-screen bottom spotlight banner */}
        {secCollection2 && (
          <div className="md:col-span-2 lg:col-span-3">
            <DesktopCollectionCard
              collection={secCollection2}
              isLarge={false}
              onNavigate={onNavigate}
              horizontalOnLarge={true}
            />
          </div>
        )}
      </div>

      {/* 2. MOBILE FEED VIEW (grid-cols-2, styled exactly like Amazon card showcase) */}
      <div className="grid md:hidden grid-cols-2 gap-3.5">
        {collections.slice(0, 4).map((col) => (
          <MobileCollectionCard
            key={col._id}
            collection={col}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
};

/* =========================================================================
   COMPACT MOBILE CARD COMPONENT (Matches screenshot exactly, 100% responsive)
   ========================================================================= */
interface MobileCollectionCardProps {
  collection: CollectionItem;
  onNavigate: (view: string, id?: string) => void;
}

const MobileCollectionCard: React.FC<MobileCollectionCardProps> = ({
  collection,
  onNavigate
}) => {
  const [productIndex, setProductIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const products = collection.products || [];
  const currentProduct = products[productIndex % products.length];

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDirection('right');
      setProductIndex((prev) => (prev + 1) % products.length);
    }, 4500);
  }, [products.length]);

  useEffect(() => {
    if (products.length > 1) {
      resetTimer();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [products.length, resetTimer]);

  useEffect(() => {
    setProductIndex(0);
  }, [collection]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (products.length <= 1) return;
    setDirection('left');
    setProductIndex((prev) => (prev - 1 + products.length) % products.length);
    resetTimer();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (products.length <= 1) return;
    setDirection('right');
    setProductIndex((prev) => (prev + 1) % products.length);
    resetTimer();
  };

  if (!currentProduct) return null;

  const handleCardClick = () => {
    if (currentProduct.slug) {
      onNavigate('product-detail', currentProduct.slug);
    }
  };

  const slideVariants = {
    initial: (dir: 'left' | 'right') => ({
      opacity: 0,
      x: dir === 'right' ? 40 : -40
    }),
    active: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.35, ease: 'easeOut' as const }
    },
    exit: (dir: 'left' | 'right') => ({
      opacity: 0,
      x: dir === 'right' ? -40 : 40,
      transition: { duration: 0.25, ease: 'easeIn' as const }
    })
  };

  // Safe checks for discount
  const productDiscount = typeof currentProduct.discount === 'number' && !isNaN(currentProduct.discount) && currentProduct.discount > 0 ? currentProduct.discount : 0;

  return (
    <div
      onClick={handleCardClick}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100/80 dark:border-slate-700 p-2.5 flex flex-col justify-between shadow-xs transition-transform duration-300 active:scale-[0.99] w-full min-h-[295px] overflow-hidden group"
    >
      <div className="flex flex-col w-full">
        {/* Aspect square image stage */}
        <div className="relative aspect-square w-full rounded-xl bg-slate-50/70 dark:bg-slate-950/40 p-2 overflow-hidden flex items-center justify-center">
          
          {/* Rating tag overlay inside image stage (as requested) */}
          {typeof currentProduct.rating === 'number' && currentProduct.rating > 0 && (
            <div className="absolute top-1.5 left-1.5 bg-slate-800/70 backdrop-blur-md text-white font-black text-[9px] px-1.5 py-0.5 rounded-md z-15 select-none scale-90 origin-top-left">
              ★ {currentProduct.rating.toFixed(1)}
            </div>
          )}

          {/* Collection tag category badge overlay inside image stage */}
          <div className="absolute top-1.5 right-1.5 z-15 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-xs border border-slate-100/60 dark:border-slate-700 scale-90 origin-top-right">
            {collection.icon || <Sparkles className="h-3 w-3 text-indigo-400" />}
            <span className="text-[8px] font-black tracking-wide uppercase text-slate-600 dark:text-slate-200">
              {collection.name}
            </span>
          </div>

          {/* Sliding Product Image stage */}
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={currentProduct._id}
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="active"
                exit="exit"
                className="w-full h-full flex items-center justify-center absolute"
              >
                <img
                  src={currentProduct.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300'}
                  alt={currentProduct.name}
                  referrerPolicy="no-referrer"
                  className="max-h-[85%] max-w-[85%] object-contain select-none transform transition-transform duration-300 group-hover:scale-102 inline-block shadow-xs"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Left/Right controls (stand out, highly visible on touch, never clipped) */}
          {products.length > 1 && (
            <div className="absolute inset-x-2.5 flex items-center justify-between z-30 pointer-events-none">
              <button
                onClick={handlePrev}
                type="button"
                className="pointer-events-auto h-7.5 w-7.5 rounded-full bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-50 shadow-md hover:scale-105 active:scale-90 flex items-center justify-center cursor-pointer border-none z-30 transition-all duration-300"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              </button>
              <button
                onClick={handleNext}
                type="button"
                className="pointer-events-auto h-7.5 w-7.5 rounded-full bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-50 shadow-md hover:scale-105 active:scale-90 flex items-center justify-center cursor-pointer border-none z-30 transition-all duration-300"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Floating quick action button at bottom-right of the image stage container */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="absolute bottom-1.5 right-1.5 w-7.5 h-7.5 rounded-full bg-indigo-600 active:scale-90 text-white flex items-center justify-center hover:bg-indigo-700 transition-all duration-300 shadow-md z-25 cursor-pointer border-none"
            aria-label="View product details"
            title="View product details"
          >
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Product Title (1-2 lines height strictly in flow, no overlap) */}
        <div className="px-0.5">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-100 line-clamp-2 leading-tight tracking-tight min-h-[32px]">
            {currentProduct.name}
          </h3>
        </div>
      </div>

      {/* Cost lines, Discount tags and deal indicators */}
      <div className="mt-1.5 px-0.5 space-y-1">
        {/* Pricing line: Red/pink percentage discount and primary price, original price strikes */}
        <div className="flex items-center flex-wrap gap-1">
          {productDiscount > 0 && (
            <span className="text-[9px] font-black text-white bg-rose-500 px-1 py-0.5 rounded leading-none">
              -{productDiscount}%
            </span>
          )}
          <span className="text-xs font-black text-slate-800 dark:text-white">
            {formatProductPrice(currentProduct.price)}
          </span>
          {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price && (
            <span className="text-[10px] text-slate-300 line-through dark:text-slate-500 font-medium">
              {formatProductPrice(currentProduct.originalPrice)}
            </span>
          )}
        </div>

        {/* Dynamic subtag deal line */}
        <div className="text-[9px] font-bold text-indigo-500 dark:text-indigo-300 font-mono tracking-tight flex items-center gap-0.5">
          <span>Specs Verified</span>
          <span className="text-slate-200 dark:text-slate-600">•</span>
          <span className="text-amber-500 dark:text-amber-300">Deal Choice</span>
        </div>
      </div>
    </div>
  );
};


/* =========================================================================
   LARGE SCREEN CARD COMPONENT (Bento-grid styled magazine banners)
   ========================================================================= */
interface DesktopCollectionCardProps {
  collection: CollectionItem;
  isLarge: boolean;
  onNavigate: (view: string, id?: string) => void;
  horizontalOnLarge?: boolean;
}

const DesktopCollectionCard: React.FC<DesktopCollectionCardProps> = ({
  collection,
  isLarge,
  onNavigate,
  horizontalOnLarge = false
}) => {
  const [productIndex, setProductIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const products = collection.products || [];
  const currentProduct = products[productIndex % products.length];

  // Auto-rotate current product inside the collection card every 5 seconds
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDirection('right');
      setProductIndex((prev) => (prev + 1) % products.length);
    }, 5000);
  }, [products.length]);

  useEffect(() => {
    if (products.length > 1) {
      resetTimer();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [products.length, resetTimer]);

  // Reset product index to 0 whenever the collection changes so that we do not array-bound-error
  useEffect(() => {
    setProductIndex(0);
  }, [collection]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (products.length <= 1) return;
    setDirection('left');
    setProductIndex((prev) => (prev - 1 + products.length) % products.length);
    resetTimer();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (products.length <= 1) return;
    setDirection('right');
    setProductIndex((prev) => (prev + 1) % products.length);
    resetTimer();
  };

  if (!currentProduct) return null;

  // Direct safe product details redirection
  const handleCardClick = () => {
    if (currentProduct.slug) {
      onNavigate('product-detail', currentProduct.slug);
    }
  };

  // Framer motion animation configurations (Directional sliding)
  const slideVariants = {
    initial: (dir: 'left' | 'right') => ({
      opacity: 0,
      x: dir === 'right' ? 60 : -60,
      scale: 0.95
    }),
    active: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.45, ease: 'easeOut' as const }
    },
    exit: (dir: 'left' | 'right') => ({
      opacity: 0,
      x: dir === 'right' ? -60 : 60,
      scale: 0.95,
      transition: { duration: 0.35, ease: 'easeIn' as const }
    })
  };

  const isWide = isLarge || horizontalOnLarge;
  const productDiscount = typeof currentProduct.discount === 'number' && !isNaN(currentProduct.discount) && currentProduct.discount > 0 ? currentProduct.discount : 0;

  return (
    <div
      onClick={handleCardClick}
      className={`group relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800 transition-all duration-300 hover:shadow-xl hover:border-slate-200 dark:hover:border-slate-600 cursor-pointer flex flex-col ${
        isWide ? 'h-[360px] md:h-[380px]' : 'h-[360px] md:h-[380px]'
      } ${horizontalOnLarge ? 'md:flex-row' : ''}`}
    >
      {/* Background radial gradient bloom lighting accents */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-gradient-to-br from-slate-400/5 to-slate-300/5 dark:from-slate-700/10 dark:to-slate-800/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />

      {/* Product Image Stage Container */}
      <div
        className={`relative bg-slate-50/50 dark:bg-slate-950/45 border-b border-slate-50 dark:border-slate-800 group-hover:bg-slate-50/20 dark:group-hover:bg-slate-950/20 transition-colors duration-300 shrink-0 flex items-center justify-center p-6 ${
          horizontalOnLarge ? 'w-full md:w-1/2 h-44 md:h-full border-b md:border-b-0 md:border-r' : 'h-48 sm:h-52 md:h-56'
        }`}
      >
        {/* Floating Category Indicator Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-sm border border-slate-100/60 dark:bg-slate-800/95 dark:border-slate-700">
          {collection.icon || <Sparkles className="h-3.5 w-3.5 text-indigo-400" />}
          <span className="text-[10px] font-black tracking-wider uppercase text-slate-700 dark:text-slate-100">
            {collection.name} Spotlights
          </span>
        </div>

        {/* Rating Badge */}
        {typeof currentProduct.rating === 'number' && currentProduct.rating > 0 && (
          <div className="absolute top-4 right-4 z-20 bg-amber-400 text-white font-extrabold font-mono text-[10px] px-2 py-0.5 rounded-lg shadow-sm">
            ★ {currentProduct.rating.toFixed(1)}
          </div>
        )}

        {/* Slideshow image with AnimatePresence */}
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={currentProduct._id}
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="active"
              exit="exit"
              className="w-full h-full flex items-center justify-center absolute"
            >
              <img
                loading="lazy"
                src={currentProduct.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400'}
                alt={currentProduct.name}
                referrerPolicy="no-referrer"
                className="max-h-[85%] max-w-[85%] object-contain drop-shadow-md select-none transform transition-transform duration-500 group-hover:scale-105"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Slider manual arrows */}
        {products.length > 1 && (
          <div className="absolute inset-x-4 flex items-center justify-between z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <button
              onClick={handlePrev}
              type="button"
              className="pointer-events-auto h-8 w-8 rounded-full border border-slate-100/85 bg-white/95 text-slate-600 shadow-md hover:scale-105 active:scale-95 hover:bg-slate-50 transition-all duration-300 flex items-center justify-center cursor-pointer dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-100 dark:hover:bg-slate-700"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
            <button
              onClick={handleNext}
              type="button"
              className="pointer-events-auto h-8 w-8 rounded-full border border-slate-100/85 bg-white/95 text-slate-600 shadow-md hover:scale-105 active:scale-95 hover:bg-slate-50 transition-all duration-300 flex items-center justify-center cursor-pointer dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-100 dark:hover:bg-slate-700"
              aria-label="Next image"
            >
              <ChevronRight className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Slideshow Indicator Dots */}
        {products.length > 1 && (
          <div className="absolute bottom-3 flex gap-1 z-20">
            {products.slice(0, 8).map((p, idx) => (
              <span
                key={p._id || idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === productIndex % products.length 
                    ? 'w-4 bg-indigo-500 dark:bg-indigo-300' 
                    : 'w-1.5 bg-slate-200 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Information Details Meta */}
      <div className={`p-5 flex flex-col justify-between flex-grow ${
        horizontalOnLarge ? 'md:w-1/2 md:p-6' : ''
      }`}>
        <div className="space-y-2">
          {/* Brand/Model details */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-indigo-500 dark:text-indigo-300">
              {currentProduct.brand || (typeof currentProduct.category === 'object' ? currentProduct.category?.name : currentProduct.category) || 'Gadget'}
            </span>
            {productDiscount > 0 && (
              <span className="text-[10px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 px-1.5 py-0.5 rounded-md font-mono">
                -{productDiscount}% OFF
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-extrabold text-slate-800 group-hover:text-indigo-500 dark:text-white dark:group-hover:text-indigo-300 line-clamp-1 transition-colors duration-300 leading-snug">
            {currentProduct.name}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {currentProduct.description || 'Verified direct links, updated specs sheets, and expert product comparisons.'}
          </p>
        </div>

        {/* Lower Specs CTA (Price is integrated dynamically in spotlights) */}
        <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/80 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-300 dark:text-slate-400 uppercase font-mono leading-none mb-1">
              Spotlight Deal
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-slate-800 dark:text-white">
                {formatProductPrice(currentProduct.price)}
              </span>
              {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price && (
                <span className="text-[10px] text-slate-300 line-through dark:text-slate-500">
                  {formatProductPrice(currentProduct.originalPrice)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            type="button"
            className="px-3.5 py-2 sm:px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-xs font-bold leading-none flex items-center gap-1 border-none cursor-pointer"
          >
            <span>Learn Specs</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
