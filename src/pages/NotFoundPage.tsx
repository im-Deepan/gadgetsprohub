import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { 
  Home, 
  ShoppingBag, 
  BookOpen, 
  Smartphone, 
  Headphones, 
  Laptop, 
  Watch, 
  Gamepad2, 
  Tv, 
  ArrowRight, 
  ArrowLeft,
  Star,
  Search,
  HelpCircle,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Compass,
  Layers
} from 'lucide-react';
import { Helmet } from '../components/Helmet';
import { SearchAutocompleteInput } from '../components/SearchAutocompleteInput';
import { apiFetch } from '../utils/apiClient';
import { formatProductPrice, getShortProductTitle, getThumbnailUrl } from '../utils/productUtils';
import { useTheme } from '../context/ThemeContext';
import type { Product } from '../types';

interface NotFoundPageProps {
  onNavigate: (view: string, slug?: string) => void;
}

const POPULAR_DEPARTMENTS = [
  { name: 'Smartphones', slug: 'category-smartphones', icon: Smartphone, count: '120+ Models' },
  { name: 'Audio & ANC', slug: 'category-audio', icon: Headphones, count: '85+ Gear' },
  { name: 'Laptops & PCs', slug: 'category-laptops', icon: Laptop, count: '60+ Systems' },
  { name: 'Smartwatches', slug: 'category-wearables', icon: Watch, count: '45+ Wearables' },
  { name: 'Gaming Gear', slug: 'category-gaming', icon: Gamepad2, count: '90+ Accessories' },
  { name: '4K Smart TV', slug: 'category-tv', icon: Tv, count: '30+ Displays' },
];

const SUGGESTED_SEARCHES = [
  'iPhone 16 Pro',
  'Noise Cancelling Headphones',
  'MacBook Air M3',
  'Mechanical Keyboards',
  'OLED Smart TVs',
  'Fitness Smartwatches'
];

/**
 * Professional, high-craft Vector Illustration for 404 Disconnected Tech State.
 * Adapts dynamically to light and dark themes using SVG tokens and Tailwind classes.
 */
const TechNotFoundIllustration: React.FC = () => {
  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[420px] aspect-[16/10] mx-auto flex items-center justify-center select-none">
      {/* Ambient background glow ring */}
      <div 
        aria-hidden="true" 
        className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-sky-500/5 to-purple-500/10 dark:from-indigo-600/20 dark:via-sky-500/10 dark:to-purple-600/15 rounded-full blur-3xl -z-10 transform -translate-y-2 pointer-events-none" 
      />

      <svg
        viewBox="0 0 500 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
        role="img"
        aria-label="Illustration representing an unmapped tech link or missing page"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="grid-fade" x1="250" y1="0" x2="250" y2="320" gradientUnits="userSpaceOnUse">
            <stop stopColor="currentColor" stopOpacity="0.12" />
            <stop offset="0.8" stopColor="currentColor" stopOpacity="0.02" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="card-grad-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>

          <linearGradient id="card-grad-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          <linearGradient id="accent-glow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          <linearGradient id="badge-glow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0.05" />
          </linearGradient>

          <pattern id="dot-matrix" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" className="fill-slate-300 dark:fill-slate-800" />
          </pattern>
        </defs>

        {/* Blueprint Dot Matrix Platform */}
        <rect x="30" y="30" width="440" height="260" rx="16" fill="url(#dot-matrix)" />
        
        {/* Ground grid lines */}
        <ellipse cx="250" cy="245" rx="190" ry="45" className="stroke-slate-200 dark:stroke-slate-800/80" strokeWidth="1.5" strokeDasharray="4 4" />
        <ellipse cx="250" cy="245" rx="130" ry="30" className="stroke-indigo-300/40 dark:stroke-indigo-900/60" strokeWidth="1.5" />

        {/* Circuit Bus Lines (Connecting devices) */}
        <path d="M 120 180 L 170 180 L 210 210 L 290 210 L 330 180 L 380 180" className="stroke-slate-300 dark:stroke-slate-800" strokeWidth="2" strokeLinecap="round" />
        <path d="M 250 140 L 250 205" className="stroke-indigo-400 dark:stroke-indigo-500/80" strokeWidth="2" strokeDasharray="3 3" />
        
        {/* Glowing Data Nodes */}
        <circle cx="120" cy="180" r="4" className="fill-indigo-500 dark:fill-indigo-400" />
        <circle cx="380" cy="180" r="4" className="fill-indigo-500 dark:fill-indigo-400" />
        <circle cx="250" cy="210" r="5" className="fill-indigo-600 dark:fill-indigo-500" />

        {/* Central Display Holographic Console (404 Screen) */}
        <g transform="translate(165, 60)">
          {/* Floating Base Shadow */}
          <ellipse cx="85" cy="170" rx="75" ry="12" className="fill-slate-900/5 dark:fill-black/30 blur-xs" />

          {/* Console Stand */}
          <path d="M 75 130 L 95 130 L 105 160 L 65 160 Z" className="fill-slate-200 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700" strokeWidth="1.5" />
          <rect x="55" y="158" width="60" height="6" rx="3" className="fill-slate-300 dark:fill-slate-700" />

          {/* Console Monitor Card */}
          <rect 
            x="5" 
            y="5" 
            width="160" 
            height="125" 
            rx="12" 
            className="fill-white dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-800" 
            strokeWidth="2" 
          />

          {/* Inner Display Screen */}
          <rect 
            x="15" 
            y="15" 
            width="140" 
            height="105" 
            rx="8" 
            className="fill-slate-50 dark:fill-slate-950/80 stroke-slate-150 dark:stroke-slate-800/80" 
            strokeWidth="1" 
          />

          {/* Screen Top Bar */}
          <circle cx="27" cy="26" r="3" className="fill-rose-400" />
          <circle cx="36" cy="26" r="3" className="fill-amber-400" />
          <circle cx="45" cy="26" r="3" className="fill-emerald-400" />
          <line x1="60" y1="26" x2="140" y2="26" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="2" strokeLinecap="round" />

          {/* Big 404 Bold Typography on Display */}
          <text 
            x="85" 
            y="72" 
            textAnchor="middle" 
            className="font-bold fill-slate-900 dark:fill-white tracking-tight" 
            style={{ fontSize: '32px', fontFamily: 'Space Grotesk, system-ui, sans-serif' }}
          >
            4<tspan className="fill-indigo-600 dark:fill-indigo-400">0</tspan>4
          </text>

          {/* Status Subtitle on Screen */}
          <rect x="35" y="86" width="100" height="18" rx="4" className="fill-slate-200/70 dark:fill-slate-800/90" />
          <text 
            x="85" 
            y="98" 
            textAnchor="middle" 
            className="fill-slate-600 dark:fill-slate-400 font-mono text-[9px] uppercase tracking-widest font-semibold"
          >
            SIGNAL_UNREACHABLE
          </text>
        </g>

        {/* Left Side Floating Device: Smartphone with Search Icon */}
        <g transform="translate(65, 120)">
          <rect 
            x="0" 
            y="0" 
            width="65" 
            height="105" 
            rx="10" 
            className="fill-white dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-800" 
            strokeWidth="1.5" 
          />
          <rect x="6" y="8" width="53" height="89" rx="6" className="fill-slate-50 dark:fill-slate-950" />
          {/* Speaker / Camera Notch */}
          <rect x="24" y="11" width="17" height="3" rx="1.5" className="fill-slate-300 dark:fill-slate-800" />
          {/* Missing Signal Wifi Waves */}
          <path d="M 22 45 Q 32.5 37 43 45" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M 26 52 Q 32.5 46 39 52" className="stroke-indigo-400 dark:stroke-indigo-500" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="32.5" cy="59" r="2.5" className="fill-indigo-600 dark:fill-indigo-400" />
          {/* Placeholder Wireframes */}
          <rect x="14" y="70" width="37" height="4" rx="2" className="fill-slate-200 dark:fill-slate-800" />
          <rect x="18" y="78" width="29" height="4" rx="2" className="fill-slate-200 dark:fill-slate-800" />
        </g>

        {/* Right Side Floating Device: Audio ANC Headphones Icon / Badge */}
        <g transform="translate(370, 125)">
          <rect 
            x="0" 
            y="0" 
            width="75" 
            height="95" 
            rx="12" 
            className="fill-white dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-800" 
            strokeWidth="1.5" 
          />
          <rect x="8" y="8" width="59" height="79" rx="8" className="fill-slate-50 dark:fill-slate-950" />
          
          {/* Stylized Headphone silhouette */}
          <path d="M 22 50 A 15 15 0 0 1 53 50" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="2.5" fill="none" />
          <rect x="19" y="46" width="6" height="14" rx="3" className="fill-indigo-600 dark:fill-indigo-400" />
          <rect x="50" y="46" width="6" height="14" rx="3" className="fill-indigo-600 dark:fill-indigo-400" />
          
          {/* Audio Wave disconnect icon */}
          <path d="M 33 68 L 42 68" className="stroke-rose-500 dark:stroke-rose-400" strokeWidth="2" strokeLinecap="round" />
          <circle cx="37.5" cy="30" r="3" className="fill-indigo-500" />
        </g>

        {/* Floating Mini Tech Tags */}
        <g transform="translate(115, 75)">
          <rect x="0" y="0" width="48" height="20" rx="6" className="fill-indigo-50 dark:fill-indigo-950/60 stroke-indigo-200 dark:stroke-indigo-800/80" strokeWidth="1" />
          <text x="24" y="13.5" textAnchor="middle" className="fill-indigo-600 dark:fill-indigo-400 font-mono text-[9px] font-bold">URI_MISS</text>
        </g>

        <g transform="translate(340, 75)">
          <rect x="0" y="0" width="48" height="20" rx="6" className="fill-emerald-50 dark:fill-emerald-950/60 stroke-emerald-200 dark:stroke-emerald-800/80" strokeWidth="1" />
          <text x="24" y="13.5" textAnchor="middle" className="fill-emerald-600 dark:fill-emerald-400 font-mono text-[9px] font-bold">LIVE_HUB</text>
        </g>
      </svg>
    </div>
  );
};

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();

  // Fetch 4 top products for the 404 recommendation grid
  const { data: trendingProducts = [], isLoading: isProductsLoading } = useQuery<Product[]>({
    queryKey: ['404_trending_products'],
    queryFn: async () => {
      const res = await apiFetch('/api/products?limit=4');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.products || []);
    },
    staleTime: 300000,
  });

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      onNavigate('home');
    }
  };

  return (
    <div id="not-found-page" className="min-h-[85vh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Helmet>
        <title>404 - Page Not Found | GadgetsProHub</title>
        <meta name="robots" content="noindex, follow" />
        <meta name="description" content="The page you are looking for could not be found. Discover top-rated electronics, smartphones, audio gear, and tech accessories on GadgetsProHub." />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        {/* Main 404 Content Container */}
        <div className="text-center max-w-2xl mx-auto">
          
          {/* Bespoke Responsive Vector Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="mb-4"
          >
            <TechNotFoundIllustration />
          </motion.div>

          {/* Status Chip */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold uppercase tracking-wider mb-4"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400" />
            <span>HTTP Status 404</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Page Missing</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            Looking for a specific gadget?
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg mx-auto"
          >
            The page or product URL you followed may have been updated, relocated, or expired. Try searching our database below or navigate back to the home hub.
          </motion.p>

          {/* Primary Action Buttons (High visual hierarchy) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            {/* Primary Action: Return to Homepage */}
            <button
              id="not-found-return-home-btn"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-98 cursor-pointer min-h-[46px]"
            >
              <Home className="h-4 w-4" />
              <span>Return to Homepage</span>
            </button>

            {/* Secondary Action: Browse Catalog */}
            <button
              id="not-found-catalog-btn"
              onClick={() => onNavigate('products')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-sm font-semibold transition-all active:scale-98 cursor-pointer min-h-[46px]"
            >
              <ShoppingBag className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>Browse Catalog</span>
            </button>

            {/* Secondary Action: Go Back */}
            <button
              id="not-found-back-btn"
              onClick={handleGoBack}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-all active:scale-98 cursor-pointer min-h-[46px]"
              title="Return to previous screen"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous Page</span>
            </button>
          </motion.div>

          {/* Real-time Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="mt-10 text-left max-w-xl mx-auto"
          >
            <div className="relative rounded-2xl shadow-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <SearchAutocompleteInput
                onNavigate={onNavigate}
                placeholder="Search across all smartphones, laptops, audio gear..."
                variant="catalog"
              />
            </div>

            {/* Suggested Searches */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium mr-1 inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
                <Search className="h-3 w-3" />
                Popular:
              </span>
              {SUGGESTED_SEARCHES.map((query) => (
                <button
                  key={query}
                  id={`suggested-search-${query.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => onNavigate('search', query)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 transition-all text-xs cursor-pointer"
                >
                  {query}
                </button>
              ))}
            </div>
          </motion.div>

        </div>

        {/* Popular Tech Categories */}
        <div className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-850">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Explore Popular Tech Departments
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Quick jump into our top electronics categories
              </p>
            </div>
            <button
              id="not-found-all-categories-btn"
              onClick={() => onNavigate('categories')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
            >
              <span>View all categories</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {POPULAR_DEPARTMENTS.map((dept) => {
              const IconComponent = dept.icon;
              return (
                <button
                  key={dept.slug}
                  id={`not-found-dept-${dept.slug}`}
                  onClick={() => onNavigate('products', dept.slug)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-xs transition-all text-center group cursor-pointer"
                >
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-2.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50 transition-colors">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
                    {dept.name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {dept.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trending Tech Recommendations Grid */}
        {trendingProducts.length > 0 && (
          <div className="mt-14 pt-10 border-t border-slate-200 dark:border-slate-850">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Trending Electronics & Deals
                </h3>
              </div>
              <button
                id="not-found-view-all-products-btn"
                onClick={() => onNavigate('products')}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                <span>Browse all catalog</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendingProducts.map((prod) => (
                <div
                  key={prod._id || prod.slug}
                  id={`not-found-product-${prod.slug || prod._id}`}
                  onClick={() => onNavigate('product-detail', prod.slug || prod._id)}
                  className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 p-2 mb-3 flex items-center justify-center">
                    <img
                      width="240"
                      height="240"
                      src={getThumbnailUrl((prod.images && prod.images[0]) || (prod as any).imageUrl, 300)}
                      alt={prod.name}
                      className="h-full w-full object-contain group-hover:scale-103 transition-transform duration-200"
                      loading="lazy"
                      decoding="async"
                    />
                    {prod.brand && (
                      <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-900/80 text-white backdrop-blur-xs">
                        {prod.brand}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 leading-snug">
                    {getShortProductTitle(prod.name, prod.brand, 45)}
                  </h4>

                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {formatProductPrice(prod.price, prod)}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {prod.rating ? prod.rating.toFixed(1) : '4.5'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Support & Help Bar */}
        <div className="mt-14 pt-8 border-t border-slate-200 dark:border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <span>Need help finding a specific product or want to report a broken link?</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              id="not-found-contact-support-btn"
              onClick={() => onNavigate('contact')}
              className="font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline cursor-pointer"
            >
              Contact Support
            </button>
            <span>•</span>
            <button
              id="not-found-tech-guides-btn"
              onClick={() => onNavigate('blogs')}
              className="font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline cursor-pointer"
            >
              Tech Buying Guides
            </button>
            <span>•</span>
            <button
              id="not-found-about-btn"
              onClick={() => onNavigate('about-us')}
              className="font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline cursor-pointer"
            >
              About GadgetsProHub
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
