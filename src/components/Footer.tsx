import React, { useState } from 'react';
import { Instagram, Linkedin, BadgeAlert } from 'lucide-react';
import { NewsletterSubscribe } from './NewsletterSubscribe';
import { apiFetch } from '../utils/apiClient';
import { Category } from '../types';

interface FooterProps {
  onNavigate: (view: string, slug?: string) => void;
  isHomePage?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, isHomePage = false }) => {
  const [categories, setCategories] = useState<Category[]>([]);

  // Load real categories dynamically
  React.useEffect(() => {
    const controller = new AbortController();
    apiFetch('/api/categories', { signal: controller.signal })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        })
       .then(data => {
         if (data && Array.isArray(data) && !controller.signal.aborted) {
           setCategories(data);
         }
       })
       .catch(e => {
         if (e.name !== 'AbortError') {
           console.error('[Footer categories fetch]', e);
         }
       });
    return () => {
      controller.abort();
    };
  }, []);

  // Track social clicks helper
  const trackSocialClick = async (platform: 'instagram' | 'linkedin') => {
    try {
      await apiFetch('/api/analytics/social-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform })
      });
    } catch (err) {
      console.warn('Silent social click tracking failed:', err);
    }
  };

  return (
    <footer className="w-full border-t border-slate-100 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-black dark:text-slate-200 transition-colors duration-300">
      
      {/* Top Banner Ethical Disclosure */}
      <div className="bg-indigo-50/70 border-b border-indigo-50/40 py-3.5 px-4 dark:bg-indigo-950/20 dark:border-slate-700">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs md:px-8">
          <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-300">
            <BadgeAlert className="h-5 w-5 shrink-0" />
            <span className="font-semibold uppercase tracking-wider">Amazon Associate Disclosure</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-2xl text-center md:text-right leading-relaxed dark:text-slate-300">
            <span className="font-bold text-slate-700 dark:text-white">As an Amazon Associate I earn from qualifying purchases.</span> gadgetsprohub is an independent product reviews platform providing objective spec indexing and curated shopping recommendations.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5 md:px-4">
          
          {/* Logo Brand / Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center text-lg font-bold">
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-amber-400 bg-clip-text text-transparent font-black tracking-tight">
                gadgetsprohub
              </span>
            </div>
            
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed dark:text-slate-300">
              Honest critiques, comprehensive spec maps, and direct buying links for electronic accessories, trendy apparel, home designs, and trail workout gear. Discover premium products with real value.
            </p>

            <div className="flex gap-3">
              <a 
                href="https://www.instagram.com/gadgetsprohub_ofl?igsh=M29uYjBiZGdzM2lu" 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => trackSocialClick('instagram')}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-indigo-500 hover:text-white dark:bg-slate-800 transition-colors duration-300 cursor-pointer"
                title="Follow us on Instagram"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a 
                href="https://linkedin.com/company/gadgetsprohub" 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => trackSocialClick('linkedin')}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-indigo-500 hover:text-white dark:bg-slate-800 transition-colors duration-300 cursor-pointer"
                title="Connect with us on LinkedIn"
                aria-label="Connect with us on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick NavLinks */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white mb-4">
              Explore Portal
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-indigo-500 cursor-pointer flex items-center gap-1.5 font-medium transition-colors duration-300 text-left bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300">
                  <span>🏠</span> Home Hub
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('products')} className="hover:text-indigo-500 cursor-pointer flex items-center gap-1.5 font-medium transition-colors duration-300 text-left bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300">
                  <span>🛒</span> Product Selections
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('blogs')} className="hover:text-indigo-500 cursor-pointer flex items-center gap-1.5 font-medium transition-colors duration-300 text-left bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300">
                  <span>✍️</span> Blog Feed
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-indigo-500 cursor-pointer flex items-center gap-1.5 font-medium transition-colors duration-300 text-left bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300">
                  <span>📞</span> Contact Desk
                </button>
              </li>
            </ul>
          </div>

          {/* Categories select */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white mb-4">
              {categories.length > 0 ? "Product Categories" : "Featured Categories"}
            </h4>
            <ul className="space-y-2.5 text-xs">
              {categories.length > 0 ? (
                categories.map(cat => (
                  <li key={cat._id}>
                    <button 
                      onClick={() => onNavigate('products', `category-${cat._id}`)} 
                      className="hover:text-indigo-500 cursor-pointer transition-colors duration-300 text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-1.5"
                    >
                      <span>{cat.icon || '📦'}</span> {cat.name}
                    </button>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <button onClick={() => onNavigate('products')} className="hover:text-indigo-500 cursor-pointer transition-colors duration-300 text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-1.5">
                      <span>📱</span> Electronics
                    </button>
                  </li>
                  <li>
                    <button onClick={() => onNavigate('products')} className="hover:text-indigo-500 cursor-pointer transition-colors duration-300 text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-1.5">
                      <span>👔</span> Fashion Wear
                    </button>
                  </li>
                  <li>
                    <button onClick={() => onNavigate('products')} className="hover:text-indigo-500 cursor-pointer transition-colors duration-300 text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-1.5">
                      <span>🏡</span> Home & Kitchen
                    </button>
                  </li>
                  <li>
                    <button onClick={() => onNavigate('products')} className="hover:text-indigo-500 cursor-pointer transition-colors duration-300 text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-1.5">
                      <span>⚽</span> Athletics Gear
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Newsletter Input */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-white mb-4">
              Weekly Deals Feed
            </h4>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed dark:text-slate-300">
              Get honest product comparisons and buying guides directly in your inbox. Zero clutter.
            </p>

            <NewsletterSubscribe variant="minimal" />
          </div>

        </div>

        <hr className="my-8 border-slate-100 dark:border-slate-700" />

        {/* Bottom copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-300">
          <p>© 2026 gadgetsprohub Review Platform. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center sm:justify-start">
            <button onClick={() => onNavigate('about-us')} className="hover:text-slate-500 dark:hover:text-white cursor-pointer bg-transparent border-none p-0">About Us</button>
            <span>•</span>
            <button onClick={() => onNavigate('privacy-policy')} className="hover:text-slate-500 dark:hover:text-white cursor-pointer bg-transparent border-none p-0">Privacy Statement</button>
            <span>•</span>
            <button onClick={() => onNavigate('terms-conditions')} className="hover:text-slate-500 dark:hover:text-white cursor-pointer bg-transparent border-none p-0">Terms & Conditions</button>
            <span>•</span>
            <button onClick={() => onNavigate('disclaimer')} className="hover:text-slate-500 dark:hover:text-white cursor-pointer bg-transparent border-none p-0">Commission Disclosure</button>
          </div>
        </div>
      </div>

    </footer>
  );
};
