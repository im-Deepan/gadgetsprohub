import React, { useState } from 'react';
import { Mail, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorText('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail })
      });
      const data = await res.json();

      if (res.ok) {
        setSubscribed(true);
        setEmail('');
        showToast("Successfully subscribed to the newsletter!", "success");
      } else {
        const errMsg = data.error || 'Unable to subscribe at this moment. Please try again.';
        setErrorText(errMsg);
        showToast(errMsg, "error");
      }
    } catch (err) {
      console.error('Subscription system error:', err);
      const connectionError = 'A connection error occurred. Please verify your internet and try again.';
      setErrorText(connectionError);
      showToast(connectionError, "error");
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
        <form onSubmit={handleSubscribe} className="relative mt-2 flex items-center gap-2">
          <div className="relative flex-grow">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              disabled={loading || subscribed}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorText) setErrorText('');
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 transition-all outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:bg-slate-900"
              required
            />
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          </div>
          <button
            type="submit"
            disabled={loading || subscribed}
            className={`flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${
              subscribed 
                ? 'bg-emerald-500 hover:bg-emerald-600' 
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/10'
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
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-rose-500 dark:text-rose-400 animate-pulse">
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
          ? 'rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-150/40 dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none' 
          : 'rounded-2xl bg-gradient-to-br from-indigo-50/40 to-slate-50/20 p-8 border border-indigo-100/30 dark:from-slate-950/20 dark:to-slate-900/10 dark:border-slate-800/40'
      } ${className}`}
    >
      {/* Abstract decorative glowing gradient blobs */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

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
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Sparkles size={12} className="animate-spin-slow" />
                <span>Exclusive Deals & Updates</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Stay updated with premium specs
              </h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Subscribe to our newsletter and never miss special store deals, gadget price drops, and curated editorial product updates.
              </p>
            </div>

            <div className="w-full md:max-w-xs shrink-0">
              <form onSubmit={handleSubscribe} className="space-y-3">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="name@email.com"
                    value={email}
                    disabled={loading}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorText) setErrorText('');
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-850 transition-all outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100/60 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-900/30"
                    required
                  />
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400/80 dark:text-slate-500" />
                </div>
                
                {errorText && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 dark:text-rose-400 px-1 animate-pulse">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errorText}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-indigo-600 dark:bg-white dark:hover:bg-indigo-550 dark:text-slate-950 dark:hover:text-white px-5 py-3.5 text-sm font-bold text-white transition-all shadow-md active:scale-98 disabled:pointer-events-none disabled:opacity-50"
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
                      <span>Sign up for Deals</span>
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
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 p-3 text-emerald-500 dark:text-emerald-400 animate-scale-up">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                You're Subscribed! 🎉
              </h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Thank you for subscribing to GadgetsProHub emails. We have saved your subscription to the database. Expect awesome deals and gadget recommendations directly in your inbox soon.
              </p>
            </div>
            <button
              onClick={() => setSubscribed(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
            >
              Subscribe another email
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
