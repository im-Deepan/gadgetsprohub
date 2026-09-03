import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Cookie, Settings, Check, X, Info, ExternalLink } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: true,
  marketing: true,
};

interface CookieConsentProps {
  onNavigate?: (view: string, slug?: string) => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const [show, setShow] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(() => {
    try {
      const saved = localStorage.getItem('cookie_preferences');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // Fall back silently
    }
    return DEFAULT_PREFERENCES;
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Delay entrance slightly for a smooth, natural slide after initial page render
      const timer = setTimeout(() => setShow(true), 650);
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
        adScripts.forEach((script) => script.remove());
      }

      window.dispatchEvent(
        new CustomEvent('cookie_consent_updated', {
          detail: { consent: consentStatus, preferences: prefs },
        })
      );
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
        <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none p-0 sm:p-4 md:p-6 flex justify-center">
          <motion.div
            key="cookie-consent-bottom-sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 260,
              mass: 0.85,
            }}
            role="dialog"
            aria-labelledby="cookie-consent-title"
            aria-describedby="cookie-consent-desc"
            className={`pointer-events-auto w-full max-w-5xl rounded-t-3xl sm:rounded-3xl border backdrop-blur-xl transition-colors duration-300 ${
              isDark
                ? 'bg-slate-900/95 text-slate-100 border-slate-800 shadow-[0_-12px_40px_rgba(0,0,0,0.65)]'
                : 'bg-white/95 text-slate-800 border-slate-200/90 shadow-[0_-12px_40px_rgba(15,23,42,0.09)]'
            }`}
          >
            {/* Mobile swipe / drawer indicator pill */}
            <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
              <span
                className={`w-10 h-1 rounded-full ${
                  isDark ? 'bg-slate-700' : 'bg-slate-300'
                }`}
              />
            </div>

            <div className="p-4 sm:p-5 md:p-6">
              <AnimatePresence mode="wait" initial={false}>
                {!showPreferences ? (
                  /* Primary Sliding Banner View */
                  <motion.div
                    key="primary-banner-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6"
                  >
                    <div className="flex items-start gap-3 sm:gap-4 max-w-4xl">
                      <div
                        className={`p-2.5 rounded-2xl shrink-0 mt-0.5 border shadow-2xs transition-colors ${
                          isDark
                            ? 'bg-indigo-950/80 text-indigo-400 border-indigo-800/40'
                            : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        }`}
                      >
                        <Cookie className="h-5 w-5" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            id="cookie-consent-title"
                            className={`text-sm sm:text-base font-bold tracking-tight ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            Privacy &amp; Cookie Consent
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isDark
                                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/50'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200/70'
                            }`}
                          >
                            GDPR • CCPA • Google AdSense
                          </span>
                        </div>

                        <p
                          id="cookie-consent-desc"
                          className={`text-xs sm:text-sm leading-relaxed ${
                            isDark ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          We and our third-party advertising partners, including Google, use cookies, device identifiers, and coarse location signals to deliver relevant ads, prevent invalid traffic, measure performance telemetry, and remember your device wishlist. Read our{' '}
                          <button
                            type="button"
                            onClick={handleGoToPrivacyPolicy}
                            className={`font-semibold underline inline-flex items-center gap-0.5 cursor-pointer transition-colors ${
                              isDark
                                ? 'text-indigo-400 hover:text-indigo-300'
                                : 'text-indigo-600 hover:text-indigo-500'
                            }`}
                          >
                            Privacy Policy &amp; AdSense Disclosures <ExternalLink className="h-3 w-3 inline" />
                          </button>{' '}
                          for comprehensive partner compliance.
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 w-full lg:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setShowPreferences(true)}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                          isDark
                            ? 'text-slate-200 bg-slate-800/90 hover:bg-slate-700 border-slate-700 shadow-2xs'
                            : 'text-slate-700 bg-slate-100 hover:bg-slate-200/90 border-slate-200/90 shadow-2xs'
                        }`}
                        aria-label="Customize Cookie Preferences"
                      >
                        <Settings className={`h-3.5 w-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                        <span className="whitespace-nowrap">Customize</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDeclineAll}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                          isDark
                            ? 'text-slate-200 bg-slate-800/90 hover:bg-slate-700 border-slate-700 shadow-2xs'
                            : 'text-slate-700 bg-slate-100 hover:bg-slate-200/90 border-slate-200/90 shadow-2xs'
                        }`}
                        aria-label="Decline Non-Essential Cookies"
                      >
                        Decline Non-Essential
                      </button>

                      <button
                        type="button"
                        onClick={handleAcceptAll}
                        className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-xs hover:shadow-indigo-500/25 cursor-pointer active:scale-95 whitespace-nowrap"
                        aria-label="Accept All Cookies"
                      >
                        Accept All
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* Granular Preferences Drawer View */
                  <motion.div
                    key="preferences-drawer-content"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                  >
                    <div
                      className={`flex items-center justify-between pb-3 border-b ${
                        isDark ? 'border-slate-800' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck
                          className={`h-5 w-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
                        />
                        <h3
                          className={`text-base font-bold tracking-tight ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          Customize Consent &amp; Privacy Controls
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPreferences(false)}
                        className={`p-1.5 rounded-xl transition-colors cursor-pointer active:scale-95 ${
                          isDark
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                        aria-label="Close preferences"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Category 1: Essential */}
                      <div
                        className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${
                          isDark
                            ? 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                            : 'bg-slate-50 border-slate-200/80 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            Essential Cookies
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border whitespace-nowrap ${
                              isDark
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            Always Active
                          </span>
                        </div>
                        <p
                          className={`text-xs leading-relaxed ${
                            isDark ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          Required for website security, page navigation, dark and light mode persistence, CSRF integrity, and local gadget wishlist storage. Cannot be disabled.
                        </p>
                      </div>

                      {/* Category 2: Analytics */}
                      <div
                        className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${
                          isDark
                            ? 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                            : 'bg-slate-50 border-slate-200/80 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            Analytics &amp; Telemetry
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.analytics}
                              onChange={(e) =>
                                setPreferences({ ...preferences, analytics: e.target.checked })
                              }
                              className="sr-only peer"
                              aria-label="Toggle Analytics and Performance Cookies"
                            />
                            <div
                              className={`w-9 h-5 rounded-full peer peer-focus:outline-hidden transition-colors peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 ${
                                isDark ? 'bg-slate-700' : 'bg-slate-300'
                              }`}
                            />
                          </label>
                        </div>
                        <p
                          className={`text-xs leading-relaxed ${
                            isDark ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          Collects anonymous page metrics, search queries, and crash reports to help us benchmark device specifications and maintain fast loading speeds.
                        </p>
                      </div>

                      {/* Category 3: Advertising / Marketing */}
                      <div
                        className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${
                          isDark
                            ? 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                            : 'bg-slate-50 border-slate-200/80 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            Google AdSense &amp; Ads
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.marketing}
                              onChange={(e) =>
                                setPreferences({ ...preferences, marketing: e.target.checked })
                              }
                              className="sr-only peer"
                              aria-label="Toggle Advertising and AdSense Cookies"
                            />
                            <div
                              className={`w-9 h-5 rounded-full peer peer-focus:outline-hidden transition-colors peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 ${
                                isDark ? 'bg-slate-700' : 'bg-slate-300'
                              }`}
                            />
                          </label>
                        </div>
                        <p
                          className={`text-xs leading-relaxed ${
                            isDark ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          Third-party advertising partners, including Google, use advertising cookies such as DoubleClick to deliver relevant ads based on prior browsing. If disabled, ads are non-personalized.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div
                        className={`flex items-center gap-2 text-xs ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        <Info className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                        <span>
                          Read our{' '}
                          <button
                            type="button"
                            onClick={handleGoToPrivacyPolicy}
                            className={`font-semibold hover:underline inline cursor-pointer ${
                              isDark ? 'text-indigo-400' : 'text-indigo-600'
                            }`}
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
                          className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                            isDark
                              ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700'
                              : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200/80'
                          }`}
                        >
                          Reject All
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveCustom}
                          className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
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
        </div>
      )}
    </AnimatePresence>
  );
};
