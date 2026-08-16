import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { 
  Compass, 
  Home, 
  ShoppingBag, 
  BookOpen, 
  Smartphone, 
  Headphones, 
  Laptop, 
  Watch, 
  Gamepad2, 
  Tv, 
  Sparkles, 
  ArrowRight, 
  Shuffle, 
  LifeBuoy, 
  Copy, 
  Check, 
  Star,
  Zap
} from 'lucide-react';
import { Helmet } from '../components/Helmet';
import { SearchAutocompleteInput } from '../components/SearchAutocompleteInput';
import { apiFetch } from '../utils/apiClient';
import { useToast } from '../context/ToastContext';
import { formatProductPrice, getShortProductTitle, getThumbnailUrl } from '../utils/productUtils';
import type { Product } from '../types';

interface NotFoundPageProps {
  onNavigate: (view: string, slug?: string) => void;
}

const TOP_CATEGORIES = [
  { name: 'Smartphones', slug: 'category-smartphones', icon: Smartphone, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-900/50' },
  { name: 'Audio & Sound', slug: 'category-audio', icon: Headphones, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200/60 dark:border-purple-900/50' },
  { name: 'Laptops & PCs', slug: 'category-laptops', icon: Laptop, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-900/50' },
  { name: 'Smartwatches', slug: 'category-wearables', icon: Watch, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200/60 dark:border-amber-900/50' },
  { name: 'Gaming Gear', slug: 'category-gaming', icon: Gamepad2, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200/60 dark:border-rose-900/50' },
  { name: 'TV & Display', slug: 'category-tv', icon: Tv, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200/60 dark:border-cyan-900/50' },
];

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  // Fetch 4 top products for the 404 recommendation grid
  const { data: trendingProducts = [] } = useQuery<Product[]>({
    queryKey: ['404_trending_products'],
    queryFn: async () => {
      const res = await apiFetch('/api/products?limit=4');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.products || []);
    },
    staleTime: 300000,
  });

  const handleCopyPath = () => {
    try {
      const currentUrl = window.location.href;
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      showToast('Path copied to clipboard! You can share or report this URL.', 'info');
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      showToast('Failed to copy URL', 'error');
    }
  };

  const handleSurpriseMe = () => {
    if (trendingProducts.length > 0) {
      const randomProduct = trendingProducts[Math.floor(Math.random() * trendingProducts.length)];
      showToast(`Navigating to random gadget: ${getShortProductTitle(randomProduct.name, randomProduct.brand, 30)}`, 'success');
      onNavigate('product-detail', randomProduct.slug || randomProduct._id);
    } else {
      onNavigate('products');
    }
  };

  const triggerRadarPulse = () => {
    setIsPulsing(true);
    showToast('Radar Scan Complete: 0 signal found at this address. Rerouting options ready!', 'info');
    setTimeout(() => setIsPulsing(false), 2000);
  };

  return (
    <div className="relative min-h-[85vh] w-full overflow-hidden bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <Helmet>
        <title>404 - Page Not Found | GadgetsProHub</title>
        <meta name="robots" content="noindex, follow" />
        <meta name="description" content="The requested page could not be found. Search our gadget catalog or explore top tech categories on GadgetsProHub." />
      </Helmet>

      {/* Subtle Ambient Background Gradients for Light and Dark Modes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-40 w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 max-w-4xl w-full mx-auto text-center flex flex-col items-center">
        
        {/* Interactive Radar Compass Badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative mb-6"
        >
          <button
            onClick={triggerRadarPulse}
            title="Click to scan signal"
            className="group relative flex items-center justify-center h-20 w-20 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-indigo-500/20 dark:hover:shadow-indigo-500/30 transition-all cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {/* Pulsing ring indicator */}
            <div className={`absolute inset-0 rounded-3xl bg-indigo-500/20 dark:bg-indigo-500/30 ${isPulsing ? 'animate-ping' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} />
            
            <Compass className={`h-10 w-10 text-indigo-600 dark:text-indigo-400 group-hover:rotate-45 transition-transform duration-500 ${isPulsing ? 'animate-spin' : ''}`} />
          </button>
          
          <span className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold shadow-md">
            !
          </span>
        </motion.div>

        {/* Big Display 404 Headline */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 mb-3">
            <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
              HTTP Error 404
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-display font-black tracking-tight text-slate-900 dark:text-white">
            Page <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">Not Found</span>
          </h1>

          <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
            The page or product you're looking for doesn't exist or has been moved.
          </p>
        </motion.div>

        {/* Smart Search Input Container */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 w-full max-w-lg"
        >
          <div className="bg-white dark:bg-slate-900/90 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-slate-950/80">
            <div className="text-left">
              <SearchAutocompleteInput
                onNavigate={onNavigate}
                placeholder="Search products, brands, or reviews..."
                variant="catalog"
              />
            </div>
          </div>
        </motion.div>

        {/* Quick Action Interactive Buttons */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full"
        >
          <button
            onClick={handleSurpriseMe}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer min-h-[44px]"
          >
            <Shuffle className="h-4 w-4" />
            <span>Surprise Me (Random Gadget)</span>
          </button>

          <button
            onClick={handleCopyPath}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[44px]"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-slate-500" />}
            <span>{copied ? 'URL Copied!' : 'Copy Page URL'}</span>
          </button>
        </motion.div>

        {/* Popular Categories Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-12 w-full max-w-3xl"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Explore Top Tech Categories
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TOP_CATEGORIES.map((cat) => {
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.slug}
                  onClick={() => onNavigate('products', cat.slug)}
                  className="flex flex-col items-center p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 hover:border-indigo-400 dark:hover:border-indigo-500/80 hover:shadow-lg dark:hover:shadow-indigo-950/40 transition-all cursor-pointer group text-center min-h-[100px] justify-center"
                >
                  <div className={`p-2.5 rounded-xl border ${cat.color} mb-2 group-hover:scale-110 transition-transform`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Trending Gadgets Recommendations */}
        {trendingProducts.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="mt-12 w-full max-w-3xl text-left"
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400">
                  <Star className="h-4 w-4 fill-amber-500" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Popular Tech Right Now
                </h3>
              </div>
              
              <button
                onClick={() => onNavigate('products')}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {trendingProducts.map((prod) => (
                <div
                  key={prod._id || prod.slug}
                  onClick={() => onNavigate('product-detail', prod.slug || prod._id)}
                  className="flex flex-col bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2.5">
                    <img
                      src={getThumbnailUrl((prod.images && prod.images[0]) || (prod as any).imageUrl, 300)}
                      alt={prod.name}
                      className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {prod.brand && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/80 text-white backdrop-blur-xs">
                        {prod.brand}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 leading-snug">
                    {getShortProductTitle(prod.name, prod.brand, 45)}
                  </h4>

                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {formatProductPrice(prod.price, prod)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {prod.rating ? prod.rating.toFixed(1) : '4.5'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Global Navigation Shortcuts Footer */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800/80 w-full flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold shadow-md transition-all cursor-pointer min-h-[44px]"
          >
            <Home className="h-4 w-4" />
            <span>Return Home</span>
          </button>

          <button
            onClick={() => onNavigate('products')}
            className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-5 py-2.5 text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[44px]"
          >
            <ShoppingBag className="h-4 w-4 text-indigo-500" />
            <span>Browse Products</span>
          </button>

          <button
            onClick={() => onNavigate('blogs')}
            className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-5 py-2.5 text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[44px]"
          >
            <BookOpen className="h-4 w-4 text-emerald-500" />
            <span>Read Tech Blogs</span>
          </button>

          <button
            onClick={() => onNavigate('contact')}
            className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-5 py-2.5 text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[44px]"
          >
            <LifeBuoy className="h-4 w-4 text-amber-500" />
            <span>Contact Support</span>
          </button>
        </motion.div>

      </div>
    </div>
  );
};

