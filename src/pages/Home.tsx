import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from '../components/Helmet';
import { BorderGlow } from '../components/BorderGlow';
import { GlareHover } from '../components/GlareHover';
import { safeGetItem, safeRemoveItem } from '../utils/localStorage';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';
import { AppView } from '../App';
import { ArrowRight, ShoppingBag, TrendingUp, Sparkles, X, History, Trash2, Cpu, Smartphone, Headphones, Laptop, Watch, Gamepad, Search } from 'lucide-react';
import { getShortProductTitle, formatProductPrice, getValidatedPricing } from '../utils/productUtils';
import type { Product, Category } from '../types';

interface HomeProps {
  onNavigate: (view: AppView, slug?: string) => void;
  onPreload?: (view: AppView, slug?: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate, onPreload }) => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const storedSearches = safeGetItem('aff_recent_searches');
      if (storedSearches) {
        setRecentSearches(JSON.parse(storedSearches).slice(0, 5));
      }
      
      const storedViews = safeGetItem('aff_recent_views');
      if (storedViews) {
        const parsedViews = JSON.parse(storedViews);
        if (Array.isArray(parsedViews) && parsedViews.length > 0) {
          apiFetch(`/api/products/batch?ids=${parsedViews.slice(0, 4).join(',')}`)
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) setRecentlyViewed(data);
            })
            .catch(() => {});
        }
      }
    } catch (e) {}
  }, []);

  const { data: { products = [], categories = [] } = {}, isLoading, refetch } = useQuery({
    queryKey: ['home_catalog'],
    queryFn: async () => {
      let rawProds: Product[] = [];
      let rawCats: Category[] = [];

      try {
        const [pRes, cRes] = await Promise.all([
          apiFetch('/api/products?limit=12'),
          apiFetch('/api/categories')
        ]);

        const [pData, cData] = await Promise.all([
          pRes.ok ? pRes.json().catch(() => ({ products: [] })) : { products: [] },
          cRes.ok ? cRes.json().catch(() => ({ categories: [] })) : { categories: [] }
        ]);

        rawProds = pData.products || pData.data || (Array.isArray(pData) ? pData : []);
        rawCats = cData.categories || cData.data || (Array.isArray(cData) ? cData : []);

        if (!Array.isArray(rawProds) || rawProds.length === 0) {
          const fallbackRes = await apiFetch('/api/products');
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json().catch(() => ({ products: [] }));
            rawProds = fallbackData.products || fallbackData.data || (Array.isArray(fallbackData) ? fallbackData : []);
          }
        }
      } catch (err) {
        console.warn('Home page product fetch error:', err);
      }

      return { products: rawProds, categories: rawCats };
    }
  });

  const renderProductCard = (p: Product, index = 0) => {
    const pricing = getValidatedPricing(p);
    const isPriority = index < 4;
    return (
      <motion.div
        key={p._id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.32, 
          delay: Math.min(index * 0.035, 0.28), 
          ease: [0.22, 1, 0.36, 1] 
        }}
        className="h-full"
      >
        <a
          href={`/product-detail/${p.slug}`}
          onClick={(e) => {
            if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
              e.preventDefault();
              onNavigate('product-detail', p.slug);
            }
          }}
          className="group block h-full"
        >
          <BorderGlow className="h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col hover:-translate-y-1 transition-transform" borderRadius={12}>
            <div className="relative aspect-square p-3 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
              <img 
                loading={isPriority ? "eager" : "lazy"} 
                fetchPriority={index < 2 ? "high" : "auto"}
                decoding="async"
                src={p.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400'} 
                alt={p.name} 
                width="400" 
                height="400" 
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" 
              />
              {pricing.isDiscounted ? (
                <div className="absolute top-2.5 right-2.5 bg-rose-500 text-white font-sans font-semibold text-[11px] tracking-wide uppercase px-2 py-0.5 rounded shadow-xs">
                  -{pricing.discount}%
                </div>
              ) : null}
            </div>
            <div className="p-4 flex flex-col grow">
              <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-wider mb-1">{p.brand || 'Gadget'}</span>
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-3 leading-snug">{getShortProductTitle(p.name, p.brand)}</h3>
              <div className="mt-auto flex items-end justify-between flex-wrap gap-2">
                <div className="flex flex-col">
                  <div className="text-base sm:text-lg font-sans font-bold tabular-nums text-zinc-900 dark:text-white">{formatProductPrice(pricing.price, p)}</div>
                  {pricing.isDiscounted && pricing.originalPrice && (
                    <div className="text-[11px] font-sans text-slate-400 line-through tabular-nums">{formatProductPrice(pricing.originalPrice, p)}</div>
                  )}
                </div>
                {p.rating && p.rating > 0 ? (
                  <div className="flex items-center gap-1 text-[11px] font-sans font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded">
                    <span className="text-amber-400">★</span>
                    <span className="font-bold">{p.rating}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </BorderGlow>
        </a>
      </motion.div>
    );
  };

  return (
    <div className="w-full flex flex-col bg-slate-50 dark:bg-black font-sans min-h-screen">
      <Helmet>
        <title>gadgetsprohub | Compare Specs, Honest Reviews & Best Gadget Deals</title>
        <meta name="description" content="Discover, compare and explore in-depth gadget specifications, hardware benchmarks, transparent pros & cons, and verified tech product deals on gadgetsprohub." />
        <meta name="keywords" content="gadgets, smartphones, laptops, audio gear, smartwatches, electronics comparison, tech reviews, specs, gadgetsprohub" />
        <link rel="canonical" href="https://gadgetsprohub.onrender.com/" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://gadgetsprohub.onrender.com/" />
        <meta property="og:title" content="gadgetsprohub | Compare Specs, Honest Reviews & Best Gadget Deals" />
        <meta property="og:description" content="Discover, compare and explore in-depth gadget specifications, hardware benchmarks, transparent pros & cons, and verified tech product deals on gadgetsprohub." />
        <meta property="og:site_name" content="gadgetsprohub" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="gadgetsprohub | Compare Specs, Honest Reviews & Best Gadget Deals" />
        <meta name="twitter:description" content="Discover, compare and explore in-depth gadget specifications, hardware benchmarks, transparent pros & cons, and verified tech product deals." />
        
        {/* JSON-LD Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                "@id": "https://gadgetsprohub.onrender.com/#website",
                "url": "https://gadgetsprohub.onrender.com/",
                "name": "gadgetsprohub",
                "description": "Premium Electronics & Smart Gear Specs, Reviews & Directory",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://gadgetsprohub.onrender.com/search?q={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              },
              {
                "@type": "Organization",
                "@id": "https://gadgetsprohub.onrender.com/#organization",
                "name": "gadgetsprohub",
                "url": "https://gadgetsprohub.onrender.com/",
                "logo": "https://gadgetsprohub.onrender.com/logo.png"
              }
            ]
          })}
        </script>
      </Helmet>

      {/* 1. HERO SECTION (Compact Sizing & Centered) */}
      <section className="relative w-full py-4 md:py-6 px-4 overflow-hidden border-b border-slate-100 dark:border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-slate-50 dark:from-indigo-950/20 dark:to-black z-0 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-2"
          >
            Find the right gadget. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              Without the marketing fluff.
            </span>
          </motion.h1>

          {/* Category Chip Scroll Rail with right fade mask and snap scroll */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative w-full max-w-3xl mt-1.5 px-4 sm:px-0"
          >
            <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center gap-2.5 pb-2.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {[
                { id: 'smartphones', name: 'Smartphones', icon: Smartphone, color: 'text-blue-500' },
                { id: 'laptops', name: 'Laptops', icon: Laptop, color: 'text-zinc-900 dark:text-white' },
                { id: 'audio', name: 'Audio', icon: Headphones, color: 'text-purple-500' },
                { id: 'wearables', name: 'Wearables', icon: Watch, color: 'text-emerald-500' }
              ].map((cat) => (
                <a
                  key={cat.id}
                  href={`/products/category-${cat.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('products', `category-${cat.id}`);
                  }}
                  className="snap-center flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-slate-700 hover:shadow-sm whitespace-nowrap shrink-0 transition-all cursor-pointer group text-xs min-h-[44px]"
                >
                  <cat.icon size={15} className={`${cat.color} group-hover:scale-110 transition-transform`} />
                  <span className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{cat.name}</span>
                </a>
              ))}
            </div>
            {/* Elegant right-edge fade mask for horizontal scroll on mobile */}
            <div className="sm:hidden absolute top-0 right-0 bottom-2.5 w-10 bg-gradient-to-l from-slate-50 dark:from-black pointer-events-none" />
            <div className="sm:hidden absolute top-0 left-0 bottom-2.5 w-10 bg-gradient-to-r from-slate-50 dark:from-black pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* 2. ALL PRODUCTS GRID (Primary Above-the-Fold Content to prevent CLS) */}
      <motion.section 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
              <TrendingUp className="h-7 w-7 text-zinc-900 dark:text-white shrink-0" />
              Trending Now
            </h2>
          </div>
          <a
            href="/products"
            onClick={(e) => { e.preventDefault(); onNavigate('products'); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-indigo-700 text-sm font-semibold transition-colors cursor-pointer shadow-sm shrink-0 min-h-[44px]"
          >
            <ShoppingBag size={16} />
            <span>View Catalog</span>
            <ArrowRight size={16} />
          </a>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
                <div className="relative aspect-square p-3 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                  <div className="w-3/4 h-3/4 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                </div>
                <div className="p-4 flex flex-col grow">
                  <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded mb-2 animate-pulse" />
                  <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded mb-1.5 animate-pulse" />
                  <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded mb-4 animate-pulse" />
                  <div className="mt-auto flex items-end justify-between">
                    <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-4 w-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p, idx) => renderProductCard(p, idx))}
          </div>
        ) : (
          <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/30">
            <ShoppingBag className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">We're refreshing prices — back in a few minutes</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Our catalog is currently compiling real-time specifications and deal tracking. Please explore our buying guides below.</p>
          </div>
        )}
      </motion.section>

      {/* 3. RECENTLY VIEWED (Rendered beneath catalog to eliminate CLS) */}
      {recentlyViewed.length > 0 && (
        <motion.section 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-7xl mx-auto px-4 py-8 border-t border-slate-200 dark:border-slate-800/50"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-zinc-900 dark:text-white" />
              Recently Viewed
            </h2>
            <button 
              onClick={() => {
                setRecentlyViewed([]);
                safeRemoveItem('aff_recent_views');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-rose-500 flex items-center gap-1 cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recentlyViewed.map((p, idx) => renderProductCard(p, idx))}
          </div>
        </motion.section>
      )}

      {/* 4. EDITORIAL / DEALS BAND */}
      <motion.section 
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full bg-slate-50 dark:bg-slate-900 py-16 border-t border-slate-100 dark:border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider mb-2 block">Buying Guides</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 leading-tight text-slate-900 dark:text-white">Not sure what to buy? Read our tech guides.</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md leading-relaxed text-sm md:text-base">
              Our experts break down the specs that actually matter. Compare processors, camera sensors, and battery tech before you make a decision.
            </p>
            <a
              href="/blogs"
              onClick={(e) => { e.preventDefault(); onNavigate('blogs'); }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-900 text-white hover:bg-slate-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-100 font-bold transition-colors cursor-pointer"
            >
              Read Guides
              <ArrowRight size={16} />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[
              { title: 'Best Phones Under ₹30,000', icon: Smartphone },
              { title: 'Laptops for Students', icon: Laptop },
              { title: 'TWS Earbuds Guide', icon: Headphones },
              { title: 'Gaming Accessories', icon: Gamepad }
            ].map((guide, i) => (
              <motion.a
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                href="/blogs"
                onClick={(e) => { e.preventDefault(); onNavigate('blogs'); }}
                className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm dark:hover:shadow-none p-4 sm:p-6 rounded-xl transition-all cursor-pointer group"
              >
                <guide.icon className="h-8 w-8 text-zinc-700 dark:text-slate-300 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-snug">{guide.title}</h3>
              </motion.a>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  );
};
