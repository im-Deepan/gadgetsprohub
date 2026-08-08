import React, { useState } from 'react';
import { Mail, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { mapErrorToFriendly } from '../utils/errorMapper';
import { apiFetch } from '../utils/apiClient';

interface NewsletterSubscribeProps {
  className?: string;
  variant?: 'card' | 'inline' | 'minimal';
}

export const NewsletterSubscribe: React.FC<NewsletterSubscribeProps> = ({ 
  className = '', 
  variant = 'card' 
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [errorText, setErrorText] = useState('');
  const { showToast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorText('Email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorText('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail })
      });
      const data = await res.json();

      if (res.ok) {
        setSubscribed(true);
        setEmail('');
        showToast("You have successfully registered for the newsletter!", "success", 4000, "User Action");
      } else {
        const errMsg = data.error || 'Unable to subscribe at this moment. Please try again.';
        const friendly = mapErrorToFriendly(errMsg, "subscribe to newsletter");
        setErrorText(friendly.message);
        showToast(friendly.message, friendly.type, 4000, friendly.category);
      }
    } catch (err) {
      
      const friendly = mapErrorToFriendly(err, "subscribe to newsletter");
      setErrorText(friendly.message);
      showToast(friendly.message, friendly.type, 4000, friendly.category);
    } finally {
      setLoading(false);
    }
  };

  const textContainer = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.3 } }
  };

  if (variant === 'minimal') {
    return (
      <div id="newsletter-form-minimal" className={`w-full ${className}`}>
        <form name="footer-newsletter-form" onSubmit={handleSubscribe} className="relative mt-2 flex items-center gap-2">
          <div className="relative flex-grow">
            <input
              type="email"
              placeholder="Enter your email"
              aria-label="Email address for newsletter"
              value={email}
              disabled={loading || subscribed}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorText) setErrorText('');
              }}
              className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 transition-all duration-300 outline-none focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-50 dark:focus:border-indigo-300 dark:focus:bg-slate-800"
              required
            />
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 dark:text-slate-400" />
          </div>
          <button
            type="submit"
            disabled={loading || subscribed}
            className={`flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-all duration-300 active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${
              subscribed 
                ? 'bg-emerald-400 hover:bg-emerald-500' 
                : 'bg-indigo-500 hover:bg-indigo-600 hover:shadow-md hover:shadow-indigo-400/10'
            }`}
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : subscribed ? (
              'Subscribed!'
            ) : (
              'Join'
            )}
          </button>
        </form>
        {errorText && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-rose-400 dark:text-rose-300 animate-pulse">
            <AlertCircle size={12} />
            <span>{errorText}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div 
      id="newsletter-subscribe-container" 
      className={`relative overflow-hidden transition-all duration-300 ${
        variant === 'card' 
          ? 'rounded-3xl border border-slate-50 bg-white p-6 shadow-xl shadow-slate-50/40 dark:border-slate-700/80 dark:bg-slate-800/40 dark:shadow-none' 
          : 'rounded-2xl bg-gradient-to-br from-indigo-50/40 to-slate-50/20 p-8 border border-indigo-50/30 dark:from-slate-950/20 dark:to-slate-800/10 dark:border-slate-700/40'
      } ${className}`}
    >
      {/* Abstract decorative glowing gradient blobs */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-purple-400/10 blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        {!subscribed ? (
          <motion.div
            key="subscribe-form"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={textContainer}
            className="flex flex-col md:flex-row items-center gap-6 justify-between relative z-10"
          >
            <div className="max-w-md space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300">
                <Sparkles size={12} className="animate-spin-slow" />
                <span>Exclusive Specs & Digests</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white sm:text-2xl">
                Stay updated with premium specs
              </h3>
              <p className="text-sm leading-relaxed text-slate-400 dark:text-slate-300">
                Subscribe to our newsletter and never miss special store deals, gadget price drops, and curated editorial product updates.
              </p>
            </div>

            <div className="w-full md:max-w-xs shrink-0">
              <form name="inline-newsletter-form" onSubmit={handleSubscribe} className="space-y-3">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="name@email.com"
                    aria-label="Email address for newsletter"
                    value={email}
                    disabled={loading}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorText) setErrorText('');
                    }}
                    className="w-full rounded-2xl border border-slate-100 bg-white/80 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-700 transition-all duration-300 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50/60 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50 dark:focus:border-indigo-300 dark:focus:ring-indigo-800/30"
                    required
                  />
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300/80 dark:text-slate-400" />
                </div>
                
                {errorText && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 dark:text-rose-300 px-1 animate-pulse">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errorText}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 hover:bg-indigo-500 dark:bg-white dark:hover:bg-indigo-500 dark:text-slate-950 dark:hover:text-white px-5 py-3.5 text-sm font-bold text-white transition-all duration-300 shadow-md active:scale-98 disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Subscribing...</span>
                    </>
                  ) : (
                    <>
                      <span>Join Tech Feed</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="subscribe-success"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={textContainer}
            className="flex flex-col items-center justify-center py-6 text-center max-w-lg mx-auto space-y-4 relative z-10"
          >
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 p-3 text-emerald-400 dark:text-emerald-300 animate-scale-up">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">
                You're Subscribed! 🎉
              </h3>
              <p className="text-sm leading-relaxed text-slate-400 dark:text-slate-300">
                Thank you! Your subscription is successfully active. Look forward to premium editorial reviews, curated drops, and exclusive updates in your inbox soon.
              </p>
            </div>
            <button
              onClick={() => setSubscribed(false)}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-indigo-500 dark:text-slate-300 dark:hover:text-indigo-300 transition-colors duration-300"
            >
              Subscribe another email
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
