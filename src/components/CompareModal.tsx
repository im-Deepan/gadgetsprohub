import React, { useEffect } from 'react';
import { useCompare } from '../context/CompareContext';
import { X, Scale, ExternalLink, Trash2, Check, Minus } from 'lucide-react';
import { formatProductPrice, getShortProductTitle } from '../utils/productUtils';
import { getCleanAffiliateUrl } from '../utils/affiliate';

interface CompareModalProps {
  onNavigate?: (view: string, param?: string) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({ onNavigate }) => {
  const { compareList, removeFromCompare, clearCompare, isOpen, setIsOpen } = useCompare();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const specKeys = [
    { label: 'Brand', get: (p: any) => p.brand || 'N/A' },
    { label: 'Price', get: (p: any) => formatProductPrice(p.price, p) },
    { label: 'Original Price', get: (p: any) => p.originalPrice ? formatProductPrice(p.originalPrice, p) : 'N/A' },
    { label: 'Rating', get: (p: any) => p.rating ? `${p.rating} / 5` : 'N/A' },
    { label: 'In Stock', get: (p: any) => p.inStock ? 'Yes' : 'Out of Stock' },
    { label: 'Category', get: (p: any) => typeof p.category === 'object' ? p.category?.name : (p.category || 'General') },
    { label: 'ASIN', get: (p: any) => p.asin || 'N/A' },
    { label: 'Seller', get: (p: any) => p.seller || p.marketplace || 'Store' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 id="compare-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
                Compare Product Specifications
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Side-by-side comparison ({compareList.length} of 4 items)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {compareList.length > 0 && (
              <button
                type="button"
                onClick={clearCompare}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close comparison window"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {compareList.length === 0 ? (
          <div className="p-12 text-center space-y-4 my-auto">
            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
              <Scale className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">No items selected for comparison</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Click the "Compare" button on any product card to add items and compare specifications side-by-side.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="grid grid-cols-[140px_repeat(auto-fit,minmax(180px,1fr))] gap-4 min-w-[600px]">
              {/* Product Header Row */}
              <div className="font-bold text-xs text-slate-400 uppercase tracking-wider self-end pb-2">
                Products
              </div>

              {compareList.map((product) => {
                const title = getShortProductTitle(product.name, product.brand, 45);
                const affUrl = getCleanAffiliateUrl(product.affiliateLink, product.asin, product.affiliateCode);
                return (
                  <div key={product._id} className="relative bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
                    <button
                      type="button"
                      onClick={() => removeFromCompare(product._id)}
                      aria-label={`Remove ${title} from comparison`}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-28 w-full bg-white dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center p-2 aspect-[4/3]">
                      <img
                        width="112"
                        height="112"
                        src={product.images?.[0]}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div className="space-y-1">
                      <h4
                        onClick={() => {
                          setIsOpen(false);
                          if (onNavigate) onNavigate('product-detail', product.slug);
                        }}
                        className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-2 transition-colors"
                      >
                        {title}
                      </h4>
                      <div className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                        {formatProductPrice(product.price, product)}
                      </div>
                    </div>

                    <a
                      href={affUrl}
                      target="_blank"
                      rel="noopener"
                      className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white dark:hover:text-white py-2 px-3 rounded-lg text-[11px] font-bold text-center flex items-center justify-center gap-1 transition-all shadow-xs"
                    >
                      <span>Buy on {product.seller || product.marketplace || 'Store'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}

              {/* Specs Rows */}
              {specKeys.map((spec) => (
                <React.Fragment key={spec.label}>
                  <div className="py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 flex items-center">
                    {spec.label}
                  </div>
                  {compareList.map((product) => {
                    const val = spec.get(product);
                    return (
                      <div key={product._id} className="py-2 text-xs font-medium text-slate-800 dark:text-slate-200 border-t border-slate-100 dark:border-slate-800/80 font-mono">
                        {val}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
