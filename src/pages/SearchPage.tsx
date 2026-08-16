import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { AppView } from '../App';
import { formatProductPrice } from '../utils/productUtils';
import { apiFetch } from '../utils/apiClient';
import { SearchAutocompleteInput } from '../components/SearchAutocompleteInput';
import { Breadcrumb } from '../components/Breadcrumb';
import { Helmet } from '../components/Helmet';
import { Search, Package, Sparkles, Filter, ArrowRight, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { matchProductByTokens } from '../utils/searchMatcher';

interface SearchPageProps {
  onNavigate: (view: AppView, slug?: string) => void;
  onPreload?: (view: AppView, slug?: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ onNavigate, onPreload }) => {
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, wishlist, toggleWishlist } = useAuth();

  // Keep query synced with URL search changes
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get('q') || '');
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const fetchSearchData = async () => {
      setLoading(true);
      try {
        const currentQ = (new URLSearchParams(window.location.search).get('q') || query).trim();
        if (currentQ) {
          const res = await apiFetch(`/api/products?search=${encodeURIComponent(currentQ)}&limit=100`);
          if (res.ok && !isCancelled) {
            const data = await res.json();
            const prods: Product[] = data.products || data.data || (Array.isArray(data) ? data : []);
            setProducts(prods);
          }
        } else {
          setProducts([]);
        }

        // Featured / fallback recommendations (up to 4 items)
        const recsRes = await apiFetch(`/api/products?trending=true&limit=4`);
        if (recsRes.ok && !isCancelled) {
          const recsData = await recsRes.json();
          const recs: Product[] = recsData.products || recsData.data || [];
          setSuggestedProducts(recs.slice(0, 4));
        }
      } catch (err) {
        console.warn('Search page data error:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchSearchData();

    // SEO: Set Title, noindex, and remove canonical pointing at /search
    if (typeof document !== 'undefined') {
      document.title = query ? `Search: "${query}" | GadgetsProHub` : 'Search Products | GadgetsProHub';
      
      let robotsMeta = document.querySelector('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex, follow');

      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical && canonical.getAttribute('href')?.includes('/search')) {
        canonical.remove();
      }
    }

    return () => { isCancelled = true; };
  }, [query]);

  const breadcrumbItems = [
    { label: 'Home', onClick: () => onNavigate('home') },
    { label: 'Search Results', isCurrentPage: true },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 transition-colors duration-300">
      <Helmet>
        <title>{query ? `Search: "${query}" | GadgetsProHub` : 'Search Products | GadgetsProHub'}</title>
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://gadgetsprohub.onrender.com/search" />
      </Helmet>

      {/* Structured Data: Breadcrumb JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": typeof window !== "undefined" ? window.location.origin : "https://gadgetsprohub.com"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Search Results",
              "item": typeof window !== "undefined" ? window.location.href : "https://gadgetsprohub.com/search"
            }
          ]
        })}
      </script>

      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Header Search Banner */}
      <div className="mb-8 rounded-2xl bg-slate-900 dark:bg-zinc-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 font-sans">
            Search Products
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
            {query ? `Search Results for "${query}"` : 'Search Gadget Catalog'}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            Compare prices, specifications, user ratings, and expert reviews across our tech directory.
          </p>

          <div className="mt-5 w-full">
            <SearchAutocompleteInput
              value={query}
              onChange={(val) => setQuery(val)}
              onNavigate={onNavigate}
              variant="hero"
              placeholder="Search smartphones, laptops, headphones, brands..."
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse space-y-3">
              <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-1/3 pt-2" />
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 font-sans">
              Showing <span className="font-bold text-slate-900 dark:text-white">{products.length}</span> matching product{products.length > 1 ? 's' : ''}
            </p>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All Products</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p) => {
              const isDiscounted = p.discount && p.discount > 0;
              const title = p.name || 'Unnamed Product';
              return (
                <div
                  key={p._id}
                  className="group relative rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all duration-300 hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/50 flex flex-col justify-between"
                >
                  <div>
                    {/* Media */}
                    <div className="relative aspect-square w-full bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden p-3 flex items-center justify-center mb-3">
                      <img
                        src={p.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500'}
                        alt={p.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                      {isDiscounted && (
                        <span className="absolute top-2 left-2 bg-rose-500 text-white text-[11px] font-semibold px-2 py-0.5 rounded shadow-xs font-sans">
                          -{p.discount}%
                        </span>
                      )}
                      {isAuthenticated && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(p._id, p.name); }}
                          aria-label={wishlist.includes(p._id) ? "Remove from wishlist" : "Add to wishlist"}
                          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 shadow-xs cursor-pointer"
                        >
                          <Heart className={`h-4 w-4 ${wishlist.includes(p._id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Meta */}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans block">
                      {p.brand || 'Premium'}
                    </span>
                    <h3 className="mt-1 text-sm font-bold font-display text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      <a
                        href={`/product-detail/${p.slug}`}
                        onClick={(e) => { e.preventDefault(); onNavigate('product-detail', p.slug); }}
                        className="focus:outline-none"
                      >
                        {title}
                      </a>
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-sans tabular-nums">
                        {formatProductPrice(p.price, p)}
                      </span>
                      {isDiscounted && (
                        <span className="ml-2 text-xs text-slate-400 line-through font-sans tabular-nums">
                          {formatProductPrice(p.originalPrice, p)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('product-detail', p.slug)}
                      className="rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold text-xs py-1.5 px-3 transition-colors cursor-pointer font-sans"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Zero Results State */
        <div className="py-16 px-6 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-slate-800 text-center min-h-[500px] flex flex-col justify-center items-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mb-4">
            <Package className="h-7 w-7" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            No matches for "{query}" — try these instead
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed font-sans">
            We couldn't find any exact products matching your search term. Check for typos or discover top recommendations below.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => onNavigate('products')}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md cursor-pointer font-sans min-h-[44px]"
            >
              Browse Full Catalog
            </button>
            <button
              onClick={() => onNavigate('products', 'category-smartphones')}
              className="px-5 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer font-sans min-h-[44px]"
            >
              Explore Smartphones
            </button>
            <button
              onClick={() => onNavigate('products', 'category-audio')}
              className="px-5 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer font-sans min-h-[44px]"
            >
              Explore Audio & Headphones
            </button>
          </div>

          {/* Suggested Items */}
          {suggestedProducts.length > 0 && (
            <div className="mt-12 text-left pt-8 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-sans mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span>Recommended Products</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {suggestedProducts.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => onNavigate('product-detail', p.slug)}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 transition-all cursor-pointer flex items-center gap-3"
                  >
                    <img
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=150'}
                      alt={p.name}
                      loading="lazy"
                      className="h-12 w-12 object-contain bg-slate-50 dark:bg-slate-950 p-1 rounded-lg shrink-0"
                    />
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate font-sans">
                        {p.name}
                      </h4>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold font-sans tabular-nums mt-0.5">
                        {formatProductPrice(p.price, p)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
