import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import { apiFetch } from '../utils/apiClient';
import { X, Heart, Trash2, ExternalLink, ShoppingBag } from 'lucide-react';
import { formatProductPrice, getShortProductTitle } from '../utils/productUtils';
import { getCleanAffiliateUrl } from '../utils/affiliate';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string, param?: string) => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { wishlist, toggleWishlist, token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (!isOpen) return;
      if (wishlist.length === 0) {
        setProducts([]);
        return;
      }

      setLoading(true);
      try {
        if (token) {
          const res = await apiFetch('/api/user/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.wishlist && Array.isArray(data.wishlist)) {
              setProducts(data.wishlist);
            }
          }
        } else {
          // For guests, fetch products by IDs
          if (wishlist.length === 0) {
            setProducts([]);
            return;
          }
          const res = await apiFetch(`/api/products?ids=${wishlist.join(',')}&limit=100`);
          if (res.ok) {
            const data = await res.json();
            if (data?.products && Array.isArray(data.products)) {
              setProducts(data.products);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch wishlist items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlistProducts();
  }, [isOpen, wishlist, token]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wishlist-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-500 rounded-xl">
              <Heart className="w-5 h-5 fill-rose-500" />
            </div>
            <div>
              <h2 id="wishlist-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
                Saved Wishlist
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved in your list
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close wishlist dialog"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
              Loading your wishlist items...
            </div>
          ) : wishlist.length === 0 || products.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 text-rose-400 rounded-full flex items-center justify-center mx-auto">
                <Heart className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Your wishlist is currently empty</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Click the heart icon on any gadget or specification card to save items for quick access later.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const title = getShortProductTitle(product.name, product.brand, 50);
                const affUrl = getCleanAffiliateUrl(product.affiliateLink, product.asin, product.affiliateCode);
                return (
                  <div
                    key={product._id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => {
                          onClose();
                          onNavigate('product-detail', product.slug);
                        }}
                        className="w-16 h-16 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-700 p-1.5 flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <img
                          src={product.images?.[0]}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="space-y-1">
                        <h4
                          onClick={() => {
                            onClose();
                            onNavigate('product-detail', product.slug);
                          }}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-2 transition-colors"
                        >
                          {title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                            {formatProductPrice(product.price, product)}
                          </span>
                          {product.rating && product.rating > 0 && (
                            <span className="text-[10px] text-amber-500 font-bold font-mono">
                              ★ {product.rating}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                      <a
                        href={affUrl}
                        target="_blank"
                        rel="noopener"
                        className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white dark:hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>Buy on {product.seller || product.marketplace || 'Store'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => toggleWishlist(product._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
