import React from 'react';
import { Compass, Home, ShoppingBag, BookOpen, Smartphone, Headphones, Laptop, Watch } from 'lucide-react';
import { SearchAutocompleteInput } from '../components/SearchAutocompleteInput';

interface NotFoundPageProps {
  onNavigate: (view: string, slug?: string) => void;
}

const TOP_CATEGORIES = [
  { name: 'Smartphones', slug: 'category-smartphones', icon: Smartphone, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
  { name: 'Audio & Headphones', slug: 'category-audio', icon: Headphones, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
  { name: 'Laptops & Computers', slug: 'category-laptops', icon: Laptop, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
  { name: 'Smartwatches', slug: 'category-wearables', icon: Watch, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
];

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center min-h-[65vh]">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 mb-6 shadow-xs">
        <Compass className="h-8 w-8 animate-spin-slow" />
      </div>

      <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
        Error 404
      </span>

      <h1 className="mt-2 text-3xl sm:text-4xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
        Page Not Found
      </h1>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
        The page you requested does not exist or has been moved. Try searching our catalog or explore top categories below.
      </p>

      {/* Quick Search */}
      <div className="mt-6 w-full max-w-md">
        <SearchAutocompleteInput
          onNavigate={onNavigate}
          placeholder="Search products or reviews..."
          variant="catalog"
        />
      </div>

      {/* Top Categories */}
      <div className="mt-8 w-full max-w-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-3">
          Explore Popular Categories
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TOP_CATEGORIES.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <a
                key={cat.slug}
                href={`/products/${cat.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('products', cat.slug);
                }}
                className="flex flex-col items-center p-3 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 dark:bg-slate-800 dark:border-slate-700/80 dark:hover:border-indigo-500 transition-all cursor-pointer group"
              >
                <div className={`p-2.5 rounded-lg ${cat.color} mb-2 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {cat.name}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Navigation Shortcuts */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); onNavigate('home'); }}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
        >
          <Home className="h-4 w-4" />
          <span>Return Home</span>
        </a>

        <a
          href="/products"
          onClick={(e) => { e.preventDefault(); onNavigate('products'); }}
          className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 shadow-xs transition-all cursor-pointer"
        >
          <ShoppingBag className="h-4 w-4 text-indigo-600" />
          <span>Browse All Products</span>
        </a>

        <a
          href="/blogs"
          onClick={(e) => { e.preventDefault(); onNavigate('blogs'); }}
          className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 shadow-xs transition-all cursor-pointer"
        >
          <BookOpen className="h-4 w-4 text-emerald-600" />
          <span>Read Blog Guides</span>
        </a>
      </div>
    </div>
  );
};
