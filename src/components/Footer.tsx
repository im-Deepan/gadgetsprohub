import React, { useState } from 'react';
import { Instagram, Linkedin, BadgeAlert, ShieldCheck, CheckCircle2, RefreshCw, Home, ShoppingBag, BookOpen, Phone, Smartphone, Headphones, Watch, Laptop, Tag } from 'lucide-react';
import { NewsletterSubscribe } from './NewsletterSubscribe';
import { apiFetch } from '../utils/apiClient';
import { Category } from '../types';
import { fetchCategoriesShared, filterCategoriesForUI } from '../utils/category';

interface FooterProps {
  onNavigate: (view: string, slug?: string) => void;
  isHomePage?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, isHomePage = false }) => {
  const [categories, setCategories] = useState<Category[]>([]);

  // Load real categories dynamically using shared categories loader
  React.useEffect(() => {
    const controller = new AbortController();
    fetchCategoriesShared(controller.signal)
      .then(data => {
        if (Array.isArray(data) && !controller.signal.aborted) {
          setCategories(filterCategoriesForUI(data, [], 0));
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
            <span className="font-bold text-slate-700 dark:text-white">As an Amazon Associate I earn from qualifying purchases.</span> gadgetsprohub provides spec indexing and shopping recommendations.
          </p>
        </div>
      </div>

      {/* How We Curate Trust Banner */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-800 py-6 px-4">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-6 text-xs md:px-8">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-slate-800 dark:text-slate-100 mb-0.5">Real specs, side by side</h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Compare hardware parameters, screen architectures, and specs in clean, easy-to-read comparison views.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <RefreshCw className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-slate-800 dark:text-slate-100 mb-0.5">Prices checked daily</h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Daily tracking of prices, active deal thresholds, and merchant listings directly from major retailers.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-slate-800 dark:text-slate-100 mb-0.5">Honest pros and cons</h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Synthesizing reviews and specs to give you transparent highlights of advantages and drawbacks.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5 md:px-4">
          
          {/* Logo Brand / Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center text-lg font-bold">
              <span className="text-zinc-900 dark:text-white font-display font-black tracking-tight">
                gadgetsprohub
              </span>
            </div>
            
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed dark:text-slate-300">
              Spec comparisons, features indexing, and direct buying links for smart gadgets, headphones, wearables, and tech accessories.
            </p>

            <div className="flex gap-3">
              <a 
                href="https://www.instagram.com/gadgetsprohub_ofl?igsh=M29uYjBiZGdzM2lu" 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => trackSocialClick('instagram')}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-indigo-500 hover:text-white dark:bg-slate-800 transition-colors duration-300 cursor-pointer"
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
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-indigo-500 hover:text-white dark:bg-slate-800 transition-colors duration-300 cursor-pointer"
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
              Navigation
            </h4>
            <ul className="space-y-1 text-xs">
              <li>
                <button onClick={() => onNavigate('home')} className="min-h-[44px] hover:text-indigo-500 cursor-pointer flex items-center gap-2 font-medium transition-colors duration-300 text-left bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 w-full">
                  <Home className="h-4 w-4 text-slate-400 shrink-0" /> Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('products')} className="min-h-[44px] hover:text-indigo-500 cursor-pointer flex items-center gap-2 font-medium transition-colors duration-300 text-left bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 w-full">
                  <ShoppingBag className="h-4 w-4 text-slate-400 shrink-0" /> Products
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('blogs')} className="min-h-[44px] hover:text-indigo-500 cursor-pointer flex items-center gap-2 font-medium transition-colors duration-300 text-left bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 w-full">
                  <BookOpen className="h-4 w-4 text-slate-400 shrink-0" /> Blog
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="min-h-[44px] hover:text-indigo-500 cursor-pointer flex items-center gap-2 font-medium transition-colors duration-300 text-left bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 w-full">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" /> Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Categories select */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white mb-4">
              Categories
            </h4>
            <ul className="space-y-1 text-xs">
              {categories.length > 0 ? (
                categories.map(cat => (
                  <li key={cat._id}>
                    <button 
                      onClick={() => onNavigate('products', `category-${cat._id}`)} 
                      className="min-h-[44px] hover:text-indigo-500 cursor-pointer transition-colors duration-300 text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-2 w-full"
                    >
                      <Tag className="h-4 w-4 text-slate-400 shrink-0" /> {cat.name}
                    </button>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <button onClick={() => onNavigate('products')} className="min-h-[44px] hover:text-indigo-500 cursor-pointer transition-colors duration-300 text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-2 w-full">
                      <Smartphone className="h-4 w-4 text-slate-400 shrink-0" /> Electronics
                    </button>
                  </li>
                  <li>
                    <button onClick={() => onNavigate('products')} className="min-h-[44px] hover:text-indigo-500 cursor-pointer transition-colors duration-300 text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-2 w-full">
                      <Headphones className="h-4 w-4 text-slate-400 shrink-0" /> Audio Gear
                    </button>
                  </li>
                  <li>
                    <button onClick={() => onNavigate('products')} className="min-h-[44px] hover:text-indigo-500 cursor-pointer transition-colors duration-300 text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-2 w-full">
                      <Watch className="h-4 w-4 text-slate-400 shrink-0" /> Wearables
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Newsletter Input */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-white mb-4">
              Weekly Tech Feed
            </h4>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed dark:text-slate-300">
              Get product comparisons and buying guides directly in your inbox.
            </p>

            <NewsletterSubscribe variant="minimal" />
          </div>

        </div>

        <hr className="my-8 border-slate-100 dark:border-slate-700" />

        {/* Bottom copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>© 2026 gadgetsprohub. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 items-center justify-center sm:justify-start">
            <button onClick={() => onNavigate('about-us')} className="min-h-[44px] flex items-center hover:text-slate-600 dark:hover:text-white cursor-pointer bg-transparent border-none p-0">About Us</button>
            <span>•</span>
            <button onClick={() => onNavigate('privacy-policy')} className="min-h-[44px] flex items-center hover:text-slate-600 dark:hover:text-white cursor-pointer bg-transparent border-none p-0">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => onNavigate('terms-conditions')} className="min-h-[44px] flex items-center hover:text-slate-600 dark:hover:text-white cursor-pointer bg-transparent border-none p-0">Terms & Conditions</button>
            <span>•</span>
            <button onClick={() => onNavigate('disclaimer')} className="min-h-[44px] flex items-center hover:text-slate-600 dark:hover:text-white cursor-pointer bg-transparent border-none p-0">Disclosure</button>
            <span>•</span>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open_cookie_settings'))} 
              className="min-h-[44px] flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer bg-transparent border-none p-0 underline-offset-4 hover:underline"
              title="Manage Cookie Consent and GDPR/CCPA Privacy Preferences"
            >
              Cookie Preferences & Opt-Out
            </button>
          </div>
        </div>
      </div>

    </footer>
  );
};
