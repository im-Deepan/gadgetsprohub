import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Cookie, Settings, Check, X, Info, ExternalLink } from 'lucide-react';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: true,
  marketing: true
};

interface CookieConsentProps {
  onNavigate?: (view: string, slug?: string) => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ onNavigate }) => {
  const [show, setShow] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(() => {
    try {
      const saved = localStorage.getItem('cookie_preferences');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_PREFERENCES;
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Delay slightly for smooth page entrance flow
      const timer = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(timer);
    }

    const handleOpenSettings = () => {
      setShow(true);
      setShowPreferences(true);
    };

    window.addEventListener('open_cookie_settings', handleOpenSettings);
    window.addEventListener('open_privacy_optout', handleOpenSettings);
    return () => {
      window.removeEventListener('open_cookie_settings', handleOpenSettings);
      window.removeEventListener('open_privacy_optout', handleOpenSettings);
    };
  }, []);

  const saveAndNotify = (consentStatus: 'accepted' | 'declined' | 'custom', prefs: CookiePreferences) => {
    try {
      localStorage.setItem('cookie_consent', consentStatus);
      localStorage.setItem('cookie_preferences', JSON.stringify(prefs));
      
      // If user declined or disabled marketing, purge any dynamically added AdSense script tags
      if (consentStatus === 'declined' || !prefs.marketing) {
        const adScripts = document.querySelectorAll('script[src*="pagead2.googlesyndication.com"]');
        adScripts.forEach(script => script.remove());
      }

      window.dispatchEvent(new CustomEvent('cookie_consent_updated', {
        detail: { consent: consentStatus, preferences: prefs }
      }));
    } catch (e) {
      console.warn('Failed to persist cookie consent preferences:', e);
    }
    setShow(false);
    setShowPreferences(false);
  };

  const handleAcceptAll = () => {
    const allEnabled: CookiePreferences = { essential: true, analytics: true, marketing: true };
    setPreferences(allEnabled);
    saveAndNotify('accepted', allEnabled);
  };

  const handleDeclineAll = () => {
    const essentialOnly: CookiePreferences = { essential: true, analytics: false, marketing: false };
    setPreferences(essentialOnly);
    saveAndNotify('declined', essentialOnly);
  };

  const handleSaveCustom = () => {
    const isAll = preferences.analytics && preferences.marketing;
    const isNone = !preferences.analytics && !preferences.marketing;
    const status = isAll ? 'accepted' : isNone ? 'declined' : 'custom';
    saveAndNotify(status, preferences);
  };

  const handleGoToPrivacyPolicy = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('privacy-policy');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.href = '/privacy-policy';
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="cookie-consent-bar"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-desc"
          className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 md:p-6 bg-white/95 text-slate-800 border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md dark:bg-slate-900/95 dark:text-slate-100 dark:border-slate-800 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)] transition-colors duration-200"
        >
          <div className="mx-auto max-w-6xl">
            <AnimatePresence mode="wait" initial={false}>
              {!showPreferences ? (
                /* Primary Compact Banner */
                <motion.div
                  key="primary-banner"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 max-w-4xl">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-400 dark:border-indigo-800/40 shrink-0 mt-0.5 shadow-xs">
                      <Cookie className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 id="cookie-consent-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          Privacy &amp; Cookie Consent
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800/50">
                          GDPR • CCPA • Google AdSense
                        </span>
                      </div>
                      <p id="cookie-consent-desc" className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        We and our third-party advertising partners, including Google, use cookies, device identifiers, and coarse location signals to deliver relevant ads, prevent invalid traffic, measure performance telemetry, and remember your device wishlist. Read our{' '}
                        <button
                          type="button"
                          onClick={handleGoToPrivacyPolicy}
                          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          Privacy Policy &amp; AdSense Disclosures <ExternalLink className="h-3 w-3 inline" />
                        </button>{' '}
                        for comprehensive guidance on partner data policies.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setShowPreferences(true)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/90 border border-slate-200/90 dark:text-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                      aria-label="Customize Cookie Preferences"
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Customize</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclineAll}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/90 border border-slate-200/90 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 rounded-lg transition-colors cursor-pointer active:scale-95"
                      aria-label="Decline Non-Essential Cookies and Opt-Out"
                    >
                      Decline Non-Essential
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptAll}
                      className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs hover:shadow-indigo-500/25 cursor-pointer active:scale-95"
                      aria-label="Accept All Cookies"
                    >
                      Accept All
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Granular Preferences Modal Drawer */
                <motion.div
                  key="preferences-drawer"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Customize Consent &amp; Privacy Controls
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPreferences(false)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      aria-label="Close preferences"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Category 1: Essential */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 dark:bg-slate-800/60 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Essential Cookies
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/40 px-2 py-0.5 rounded-md">
                          Always Active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        Required for website security, page navigation, dark and light mode persistence, CSRF integrity, and local gadget wishlist storage. Cannot be disabled.
                      </p>
                    </div>

                    {/* Category 2: Analytics */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 dark:bg-slate-800/60 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Analytics &amp; Telemetry
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.analytics}
                            onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                            className="sr-only peer"
                            aria-label="Toggle Analytics and Performance Cookies"
                          />
                          <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        Collects anonymous page metrics, search queries, and crash reports to help us benchmark device specifications and maintain fast loading speeds.
                      </p>
                    </div>

                    {/* Category 3: Advertising / Marketing */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 dark:bg-slate-800/60 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Google AdSense &amp; Partners
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.marketing}
                            onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                            className="sr-only peer"
                            aria-label="Toggle Advertising and AdSense Cookies"
                          />
                          <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        Third-party advertising partners, including Google, use advertising cookies such as DoubleClick to deliver relevant ads based on prior browsing. If disabled, ads are non-personalized.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <Info className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                      <span>
                        Read our{' '}
                        <button
                          type="button"
                          onClick={handleGoToPrivacyPolicy}
                          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline cursor-pointer"
                        >
                          Privacy Policy
                        </button>{' '}
                        for complete Google AdSense Section 10 disclosures and direct opt-out tools.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeclineAll}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 rounded-lg transition-colors cursor-pointer active:scale-95"
                      >
                        Reject All
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCustom}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Save Preferences</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

