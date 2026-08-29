import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, Settings, Check, X, Info } from 'lucide-react';

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

export const CookieConsent: React.FC = () => {
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
      setShow(true);
    }

    const handleOpenSettings = () => {
      setShow(true);
      setShowPreferences(true);
    };

    window.addEventListener('open_cookie_settings', handleOpenSettings);
    return () => {
      window.removeEventListener('open_cookie_settings', handleOpenSettings);
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

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 md:p-6 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-200 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="mx-auto max-w-6xl">
        {!showPreferences ? (
          /* Primary Compact Banner */
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3 max-w-4xl">
              <div className="p-2 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/40 shrink-0 mt-0.5">
                <Cookie className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 id="cookie-consent-title" className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Privacy & Cookie Consent (GDPR & CCPA Compliant)</span>
                </h3>
                <p id="cookie-consent-desc" className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  We use cookies and telemetry to personalize recommendations, deliver Google AdSense partner promotions, analyze site health, and save your wishlist preferences. Choose your preference below or customize categories.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowPreferences(true)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                aria-label="Customize Cookie Preferences"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Customize</span>
              </button>
              <button
                type="button"
                onClick={handleDeclineAll}
                className="px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-700"
                aria-label="Decline Non-Essential Cookies and Opt-Out"
              >
                Decline Non-Essential
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-md hover:shadow-indigo-500/20 cursor-pointer"
                aria-label="Accept All Cookies"
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          /* Granular Preferences Modal Drawer */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Customize Consent & Privacy Controls</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close preferences"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Category 1: Essential */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Essential Cookies</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded-md">Always Active</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Required for site security, navigation, dark/light theme persistence, and local wishlist storage. Cannot be disabled.
                </p>
              </div>

              {/* Category 2: Analytics */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Analytics & Telemetry</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                      className="sr-only peer"
                      aria-label="Toggle Analytics and Performance Cookies"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Collects anonymous page-load metrics, search queries, and crash reports to help us improve performance and feature reliability.
                </p>
              </div>

              {/* Category 3: Advertising / Marketing */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">AdSense & Marketing</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                      className="sr-only peer"
                      aria-label="Toggle Advertising and AdSense Cookies"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Enables Google AdSense contextual ads and sponsored showcase deals. Disabling this displays non-personalized fallback deals.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info className="h-3.5 w-3.5" />
                <span>You can reopen and update these preferences anytime from the footer.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeclineAll}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Reject All
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Preferences</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
