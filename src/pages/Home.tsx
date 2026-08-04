import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BorderGlow } from '../components/BorderGlow';
import { GlareHover } from '../components/GlareHover';
import { safeGetItem, safeRemoveItem } from '../utils/localStorage';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';
import { AppView } from '../App';
import { ArrowRight, ShoppingBag, TrendingUp, Sparkles, X, History, Trash2, Cpu, Smartphone, Headphones, Laptop, Watch, Gamepad, Search } from 'lucide-react';
import { getShortProductTitle, formatINRPrice } from '../utils/productUtils';
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

  const { data: { products = [], categories = [] } = {}, isLoading } = useQuery({
    queryKey: ['home_catalog'],
    queryFn: async () => {
      const [pRes, cRes] = await Promise.all([
        apiFetch('/api/products?limit=12'),
        apiFetch('/api/categories')
      ]);
      const [pData, cData] = await Promise.all([
        pRes.ok ? pRes.json() : { data: [] },
        cRes.ok ? cRes.json() : { data: [] }
      ]);
      return { products: pData.data || [], categories: cData.data || [] };
    }
  });

  const renderProductCard = (p: Product) => {
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
        className="group block"
      >
        <BorderGlow className="h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col hover:-translate-y-1 transition-transform" borderRadius={12}>
          <div className="relative aspect-square p-4 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
            <img loading="lazy" src={p.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400'} alt={p.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
            {p.discount && p.discount > 0 ? (
              <div className="absolute top-3 right-3 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                -{p.discount}%
              </div>
            ) : null}
          </div>
          <div className="p-4 flex flex-col grow">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{p.brand}</span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 mb-3 leading-tight">{p.name}</h3>
            <div className="mt-auto flex items-end justify-between flex-wrap gap-2">
              <div className="flex flex-col">
                <div className="text-lg font-black text-zinc-900 dark:text-white dark:text-zinc-700 dark:text-slate-200 font-mono tracking-tight">{formatINRPrice(p.price)}</div>
                {p.originalPrice && p.originalPrice > p.price && (
                  <div className="text-[11px] text-slate-400 line-through font-mono">{formatINRPrice(p.originalPrice)}</div>
                )}
              </div>
              {p.rating && p.rating > 0 ? (
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <span className="text-amber-400">★</span>
                  <span>{p.rating}</span>
                  {p.reviewCount ? <span className="text-slate-400 font-normal">({p.reviewCount})</span> : null}
                </div>
              ) : null}
            </div>
          </div>
        </BorderGlow>
      </a>
    );
  };

  return (
    <div className="w-full flex flex-col bg-slate-50 dark:bg-black font-sans min-h-screen">
      {/* 1. HERO SECTION (Compressed) */}
      <section className="relative w-full min-h-[45vh] md:min-h-[55vh] flex items-center justify-center pt-16 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-slate-50 dark:from-indigo-950/20 dark:to-black z-0 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-400/10 dark:bg-zinc-900 dark:bg-white text-white dark:text-zinc-900/10 blur-[120px] rounded-full z-0 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 dark:bg-purple-600/10 blur-[120px] rounded-full z-0 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-6"
          >
            Find the right gadget. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              Without the marketing fluff.
            </span>
          </motion.h1>

          {/* Quick Categories Scroll Rail */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-3xl flex overflow-x-auto pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center gap-2 sm:gap-3 hide-scrollbar"
          >
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-zinc-900 dark:border-white hover:shadow-sm whitespace-nowrap shrink-0 transition-all cursor-pointer group"
              >
                <cat.icon size={16} className={`${cat.color} group-hover:scale-110 transition-transform`} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{cat.name}</span>
              </a>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 2. RECENTLY VIEWED (Only if exists) */}
      {recentlyViewed.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 py-8 border-b border-slate-200 dark:border-slate-800/50">
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
            {recentlyViewed.map(renderProductCard)}
          </div>
        </section>
      )}

      {/* 3. ALL PRODUCTS GRID */}
      <section className="w-full max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
              <TrendingUp className="h-7 w-7 text-zinc-900 dark:text-white" />
              All Products
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Browse the latest tech gear, compared and reviewed.</p>
          </div>
          <a
            href="/products"
            onClick={(e) => { e.preventDefault(); onNavigate('products'); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm"
          >
            <ShoppingBag size={16} />
            <span>View Catalog</span>
            <ArrowRight size={16} />
          </a>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map(renderProductCard)}
          </div>
        )}
      </section>

      {/* 4. EDITORIAL / DEALS BAND */}
      <section className="w-full bg-slate-50 dark:bg-slate-900 py-16 border-t border-slate-100 dark:border-slate-800">
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
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: 'Best Phones Under ₹30,000', icon: Smartphone },
              { title: 'Laptops for Students', icon: Laptop },
              { title: 'TWS Earbuds Guide', icon: Headphones },
              { title: 'Gaming Accessories', icon: Gamepad }
            ].map((guide, i) => (
              <a
                key={i}
                href="/blogs"
                onClick={(e) => { e.preventDefault(); onNavigate('blogs'); }}
                className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm dark:hover:shadow-none p-4 sm:p-6 rounded-xl transition-all cursor-pointer group"
              >
                <guide.icon className="h-8 w-8 text-zinc-700 dark:text-slate-300 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-snug">{guide.title}</h3>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
