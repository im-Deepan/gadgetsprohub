import React, { useState } from 'react';
import { Mail, Instagram, Linkedin, Send, BadgeAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { NewsletterSubscribe } from './NewsletterSubscribe';
import { mapErrorToFriendly } from '../utils/errorMapper';
import { apiFetch } from '../utils/apiClient';
import { Category } from '../types';

interface FooterProps {
  onNavigate: (view: string, slug?: string) => void;
  isHomePage?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, isHomePage = false }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);

  // States for diagnostic feed alert overlays
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Load real categories dynamically
  React.useEffect(() => {
    const controller = new AbortController();
    apiFetch('/api/categories', { signal: controller.signal })
       .then(res => {
         if (res.ok) return res.json();
         throw new Error("fail");
       })
       .then(data => {
         if (data && Array.isArray(data) && !controller.signal.aborted) {
           setCategories(data);
         }
       })
       .catch(e => {
         if (e.name !== 'AbortError') {
           
         }
       });
    return () => {
      controller.abort();
    };
  }, []);

  // Track social clicks helper
  const trackSocialClick = async (platform: 'instagram' | 'linkedin') => {
    try {
      apiFetch('/api/analytics/social-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform })
      });
    } catch (err) {
      
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorText('');
    try {
      const res = await apiFetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setSubscribed(true);
        setEmail('');
        setShowSuccessModal(true);
        showToast("You have successfully registered for our newsletter!", "success", 4000, "User Action");
      } else {
        const errMsg = data.error || "We could not subscribe your email at this moment. Please check your connection and try again.";
        const friendly = mapErrorToFriendly(errMsg, "subscribe to newsletter");
        setErrorText(friendly.message);
        setShowErrorModal(true);
        showToast(friendly.message, friendly.type, 4000, friendly.category);
      }
    } catch (e) {
      
      const friendly = mapErrorToFriendly(e, "subscribe to newsletter");
      setErrorText(friendly.message);
      setShowErrorModal(true);
      showToast(friendly.message, friendly.type, 4000, friendly.category);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="w-full border-t border-slate-100 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-black dark:text-slate-200 transition-colors duration-300">
      
      {/* Top Banner Ethical Disclosure */}
      {isHomePage && (
        <div className="bg-indigo-50/70 border-b border-indigo-50/40 py-4 px-4 dark:bg-indigo-950/20 dark:border-slate-700">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs md:px-8">
            <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-300">
              <BadgeAlert className="h-5 w-5 shrink-0" />
              <span className="font-semibold uppercase tracking-wider">Affiliate Disclosure Statement</span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-2xl text-center md:text-right leading-relaxed dark:text-slate-300">
              gadgetsprohub is an independent product reviews platform. We review select electronic gadgets, apparel & lifestyle items. When you hover and click dynamic store tags to execute a purchase, our platform occasionally earns minor percentages in commissions from vendor outlets.
            </p>
          </div>
        </div>
      )}

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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-indigo-500 hover:text-white dark:bg-slate-800 transition-colors cursor-pointer"
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-indigo-500 hover:text-white dark:bg-slate-800 transition-colors cursor-pointer"
                title="Connect with us on LinkedIn"
                aria-label="Connect with us on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick NavLinks */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-905 dark:text-white mb-4">
              Explore Portal
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-indigo-500 cursor-pointer flex items-center gap-1.5 font-medium transition-colors text-left bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300">
                  <span>🏠</span> Home Hub
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('products')} className="hover:text-indigo-500 cursor-pointer flex items-center gap-1.5 font-medium transition-colors text-left bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300">
                  <span>🛒</span> Product Selections
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('blogs')} className="hover:text-indigo-500 cursor-pointer flex items-center gap-1.5 font-medium transition-colors text-left bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300">
                  <span>✍️</span> Blog Feed
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-indigo-500 cursor-pointer flex items-center gap-1.5 font-medium transition-colors text-left bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300">
                  <span>📞</span> Contact Desk
                </button>
              </li>
            </ul>
          </div>

          {/* Categories select */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-905 dark:text-white mb-4">
              Real Categories
            </h4>
            <ul className="space-y-2.5 text-xs">
              {categories.length > 0 ? (
                categories.map(cat => (
                  <li key={cat._id}>
                    <button 
                      onClick={() => onNavigate('products', `category-${cat._id}`)} 
                      className="hover:text-indigo-500 cursor-pointer transition-colors text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-1.5"
                    >
                      <span>{cat.icon || '📦'}</span> {cat.name}
                    </button>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <button onClick={() => onNavigate('products', 'category-665a0001bc93ef2d8c000001')} className="hover:text-indigo-500 cursor-pointer transition-colors text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-1.5">
                      <span>📱</span> Electronics
                    </button>
                  </li>
                  <li>
                    <button onClick={() => onNavigate('products', 'category-665a0001bc93ef2d8c000002')} className="hover:text-indigo-500 cursor-pointer transition-colors text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-1.5">
                      <span>👔</span> Fashion Wear
                    </button>
                  </li>
                  <li>
                    <button onClick={() => onNavigate('products', 'category-665a0001bc93ef2d8c000003')} className="hover:text-indigo-500 cursor-pointer transition-colors text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-1.5">
                      <span>🏡</span> Home & Kitchen
                    </button>
                  </li>
                  <li>
                    <button onClick={() => onNavigate('products', 'category-665a0001bc93ef2d8c000004')} className="hover:text-indigo-500 cursor-pointer transition-colors text-left font-medium bg-transparent border-none p-0 text-slate-500 dark:text-slate-300 hover:dark:text-indigo-300 flex items-center gap-1.5">
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
              Get honest product comparisons and valid discount codes directly in your inbox. Zero clutter.
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

      {/* Subscription Success Modal Overlay */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-50 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-zinc-800 transition-all text-left text-slate-800 dark:text-white">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-teal-50 text-teal-500 dark:bg-teal-950/40 rounded-full shrink-0">
                <ShieldCheck className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-1 my-1">
                <h3 className="text-xs font-black uppercase tracking-wider font-sans text-teal-500">Subscribed</h3>
                <p className="text-xs text-slate-400 dark:text-slate-300 font-medium leading-relaxed font-sans">
                  Success! Your email has been added to our live Deals Feed to receive direct specification reviews and handpicked discount offers.
                </p>
              </div>
            </div>
            
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="rounded-lg bg-teal-500 hover:bg-teal-600 text-white py-1.5 px-3.5 text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Error Modal Overlay */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-rose-50 bg-white p-6 shadow-xl dark:border-rose-950/30 dark:bg-zinc-800 transition-all text-left text-slate-800 dark:text-white">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 text-rose-500 dark:bg-rose-950/40 rounded-full shrink-0">
                <AlertTriangle className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-1 my-1">
                <h3 className="text-xs font-black uppercase tracking-wider font-sans text-rose-500">Subscription Notice</h3>
                <p className="text-xs text-slate-400 dark:text-slate-300 font-medium leading-relaxed font-sans">
                  {errorText || "We were unable to complete your subscription. Please check your network connection."}
                </p>
              </div>
            </div>
            
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="rounded-lg bg-rose-500 hover:bg-rose-600 text-white py-1.5 px-3.5 text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

    </footer>
  );
};
