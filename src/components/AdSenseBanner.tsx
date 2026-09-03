import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Tag, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface AdSenseBannerProps {
  slot?: string;
  slotType?: 'headerBanner' | 'productDetail' | 'blog' | 'sidebar' | 'home';
  format?: string;
  responsive?: string;
  style?: React.CSSProperties;
  className?: string;
}

const SPONSORED_ADS = [
  {
    title: "Premium Tech Upgrade Deals - Up to 40% Off",
    description: "Explore top-rated smartphones, ultra-slim laptops, noise-canceling gear & smart wearables verified by gadgetsprohub.",
    cta: "Explore Verified Deals",
    url: "/?category=smartphones",
    tag: "Sponsored Showcase",
    badge: "Verified Deal"
  },
  {
    title: "Next-Gen Audio & Smart Accessories Showcase",
    description: "Check out high-fidelity wireless earbuds, studio monitors, and ergonomic productivity gear with member discounts.",
    cta: "Claim Discount",
    url: "/?category=audio",
    tag: "Featured Promotion",
    badge: "Hot Offer"
  },
  {
    title: "Top Electronics & Smart Gear Specs Directory",
    description: "Compare side-by-side technical benchmarks, battery runtimes, and price histories across 500+ tech items.",
    cta: "Compare Specs",
    url: "/",
    tag: "Partner Ad",
    badge: "Verified"
  }
];

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  slot: propSlot,
  slotType,
  format = 'auto',
  responsive = 'true',
  style = { display: 'block' },
  className = '',
}) => {
  const { user } = useAuth();
  const isAdmin = Boolean(user && user.role === 'admin');
  const adElement = useRef<HTMLModElement>(null);
  const [adFilled, setAdFilled] = useState<boolean | null>(null);
  const [siteSettings, setSiteSettings] = useState<{
    adsenseClientId?: string;
    adsenseEnabled?: boolean;
    adsenseTestMode?: boolean;
    adsenseAutoAds?: boolean;
    adsenseSlots?: {
      headerBannerSlot?: string;
      productDetailSlot?: string;
      blogSlot?: string;
      sidebarSlot?: string;
      homeSlot?: string;
    };
  } | null>(null);

  // Fetch site settings
  useEffect(() => {
    let isMounted = true;
    fetch('/api/settings')
      .then(res => res.json())
      .then(json => {
        if (isMounted && json.success && json.data) {
          setSiteSettings(json.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Determine effective ad slot from props or admin settings
  let resolvedSlot = propSlot || '';
  if (siteSettings?.adsenseSlots) {
    const slots = siteSettings.adsenseSlots;
    if (slotType === 'headerBanner' && slots.headerBannerSlot) {
      resolvedSlot = slots.headerBannerSlot;
    } else if (slotType === 'productDetail' && slots.productDetailSlot) {
      resolvedSlot = slots.productDetailSlot;
    } else if (slotType === 'blog' && slots.blogSlot) {
      resolvedSlot = slots.blogSlot;
    } else if (slotType === 'sidebar' && slots.sidebarSlot) {
      resolvedSlot = slots.sidebarSlot;
    } else if (slotType === 'home' && slots.homeSlot) {
      resolvedSlot = slots.homeSlot;
    } else if (propSlot === '7898031267' && slots.productDetailSlot) {
      resolvedSlot = slots.productDetailSlot;
    } else if (propSlot === '1223904982' && slots.blogSlot) {
      resolvedSlot = slots.blogSlot;
    } else if (propSlot === '6223881151' && slots.headerBannerSlot) {
      resolvedSlot = slots.headerBannerSlot;
    }
  }

  // Publisher ID resolution
  const configuredPublisherId = siteSettings?.adsenseClientId?.trim() || 
    (typeof import.meta.env !== 'undefined' ? (import.meta.env.VITE_ADSENSE_CLIENT_ID || '').trim() : '');
  
  // Real publisher check: matches ca-pub-16digits and not dummy placeholder
  const isRealPublisher = Boolean(
    configuredPublisherId && 
    /^ca-pub-\d{16}$/i.test(configuredPublisherId) && 
    configuredPublisherId !== 'ca-pub-1234567890123456' && 
    configuredPublisherId !== 'ca-pub-0000000000000000'
  );

  // Test mode flag
  const isTestMode = Boolean(siteSettings?.adsenseTestMode);

  // Check marketing cookie consent
  const checkMarketingConsent = () => {
    try {
      const consent = localStorage.getItem('cookie_consent');
      if (consent === 'declined') return false;
      const prefs = localStorage.getItem('cookie_preferences');
      if (prefs) {
        const parsed = JSON.parse(prefs);
        if (parsed.marketing === false) return false;
      }
      return true;
    } catch (e) {
      return true;
    }
  };

  const [consentGiven, setConsentGiven] = useState<boolean>(checkMarketingConsent);

  useEffect(() => {
    const handleConsentChange = () => {
      setConsentGiven(checkMarketingConsent());
    };
    window.addEventListener('cookie_consent_updated', handleConsentChange);
    return () => {
      window.removeEventListener('cookie_consent_updated', handleConsentChange);
    };
  }, []);

  const adsEnabled = Boolean(siteSettings?.adsenseEnabled) && consentGiven;

  // Stable fallback ad based on slot ID hash
  const adIndex = Math.abs((resolvedSlot || 'slot').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % SPONSORED_ADS.length;
  const currentFallbackAd = SPONSORED_ADS[adIndex];

  // AdSense Execution & MutationObserver
  useEffect(() => {
    if (!adsEnabled || !isRealPublisher || !resolvedSlot) {
      setAdFilled(false);
      return;
    }

    let isUnmounted = false;
    let observer: MutationObserver | null = null;
    let checkTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      if (typeof window !== 'undefined') {
        // Ensure Google AdSense script tag is present in document head with the real publisher ID
        let existingScript = document.querySelector<HTMLScriptElement>(`script[src*="pagead2.googlesyndication.com"]`);
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${configuredPublisherId}`;
          script.async = true;
          script.crossOrigin = 'anonymous';
          script.onerror = () => {
            if (!isUnmounted) setAdFilled(false);
          };
          document.head.appendChild(script);
        }

        // Push ad unit once element has non-zero layout
        let attempts = 0;
        const maxAttempts = 15;

        const pushAdUnit = () => {
          if (isUnmounted) return;
          if (adElement.current && !adElement.current.getAttribute('data-adsbygoogle-status')) {
            if (adElement.current.offsetWidth > 0) {
              const adsbygoogle = (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || [];
              try {
                adsbygoogle.push({});
              } catch (e) {
                console.warn('AdSense push error:', e);
                if (!isUnmounted) setAdFilled(false);
              }
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(pushAdUnit, 200);
            }
          }
        };

        setTimeout(pushAdUnit, 250);

        // Observe element mutations to detect Google AdSense fill status
        if (adElement.current && typeof MutationObserver !== 'undefined') {
          observer = new MutationObserver(() => {
            if (isUnmounted) return;
            const status = adElement.current?.getAttribute('data-ad-status');
            if (status === 'filled') {
              setAdFilled(true);
            } else if (status === 'unfilled') {
              setAdFilled(false);
            }
          });

          observer.observe(adElement.current, {
            attributes: true,
            attributeFilter: ['data-ad-status', 'style']
          });
        }

        // Safety timeout: if Google hasn't explicitly set status after 2.5s, check if element has height
        checkTimeout = setTimeout(() => {
          if (isUnmounted) return;
          if (adElement.current) {
            const status = adElement.current.getAttribute('data-ad-status');
            if (status === 'filled') {
              setAdFilled(true);
            } else if (status === 'unfilled' || adElement.current.clientHeight < 15) {
              setAdFilled(false);
            } else if (adElement.current.clientHeight >= 50) {
              setAdFilled(true);
            }
          }
        }, 2500);
      }
    } catch (e) {
      console.warn('AdSense setup error:', e);
      setAdFilled(false);
    }

    return () => {
      isUnmounted = true;
      if (observer) observer.disconnect();
      if (checkTimeout) clearTimeout(checkTimeout);
    };
  }, [configuredPublisherId, resolvedSlot, adsEnabled, isRealPublisher, isTestMode]);

  // If ads are disabled by admin
  if (!adsEnabled) {
    if (isAdmin) {
      return (
        <div id={`adsense-panel-${resolvedSlot || 'default'}`} className={`my-4 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border border-dotted border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 font-mono ${className}`}>
          [Google AdSense: Ad Serving Paused in Admin Settings]
        </div>
      );
    }
    return null;
  }

  // If no valid publisher ID is configured yet
  if (!isRealPublisher) {
    return (
      <div id={`adsense-panel-${resolvedSlot || 'default'}`} className={`my-6 min-h-[140px] overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-dashed border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center transition-all duration-300 ${className}`}>
        <div className="w-full flex items-center justify-between mb-2.5 px-1">
          <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sponsored Showcase
          </span>
          {isAdmin && (
            <span className="text-[10px] font-mono text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Real AdSense Setup Required
            </span>
          )}
        </div>

        {/* Fallback sponsored banner */}
        <div className="w-full min-h-[90px] bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between p-4 border border-indigo-500/30 shadow-md">
          <div className="flex items-center gap-3.5 text-left mb-3 sm:mb-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-md shrink-0">
              AD
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  {currentFallbackAd.tag}
                </span>
                <span className="text-[9px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {currentFallbackAd.badge}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-100">
                {currentFallbackAd.title}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 max-w-xl line-clamp-1">
                {currentFallbackAd.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={currentFallbackAd.url}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              {currentFallbackAd.cta}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Admin Setup Helper */}
        {isAdmin && (
          <div className="w-full mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Publisher ID: <strong className="text-amber-500">Not configured (or placeholder)</strong></span>
            <a
              href="/admin?tab=adsense-settings"
              className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold underline flex items-center gap-1"
            >
              Configure Real AdSense in Admin Panel &rarr;
            </a>
          </div>
        )}
      </div>
    );
  }

  // Real publisher is configured!
  return (
    <div id={`adsense-panel-${resolvedSlot || 'default'}`} className={`my-6 min-h-[140px] overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-dashed border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center transition-all duration-300 ${className}`}>
      <div className="w-full flex items-center justify-between mb-2.5 px-1">
        <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold flex items-center gap-1.5">
          <span className={`inline-block w-2 h-2 rounded-full ${adFilled ? 'bg-emerald-500' : 'bg-indigo-500'} animate-pulse`}></span>
          {isTestMode ? 'AdSense Test Preview' : 'Sponsored Showcase'}
        </span>
        {isAdmin && (
          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-indigo-400" /> Slot: {resolvedSlot || 'Auto'}
            {isTestMode && <span className="bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-bold">TEST MODE</span>}
          </span>
        )}
      </div>

      <div className="w-full min-w-[250px] block relative text-center overflow-x-auto">
        {/* Real Google AdSense <ins> Tag */}
        <ins
          className="adsbygoogle"
          style={{ 
            display: adFilled === false ? 'none' : 'block',
            width: '100%',
            minWidth: '250px',
            minHeight: '90px',
            ...style 
          }}
          data-ad-client={configuredPublisherId}
          data-ad-slot={resolvedSlot || undefined}
          data-ad-format={format}
          data-full-width-responsive={responsive}
          data-ad-test={isTestMode ? "on" : undefined}
          ref={adElement}
        />

        {/* Fallback Sponsored Banner (Displays smoothly if Google returns unfilled / domain pending) */}
        {adFilled === false && (
          <div className="w-full min-h-[90px] bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between p-4 border border-indigo-500/30 shadow-md">
            <div className="flex items-center gap-3.5 text-left mb-3 sm:mb-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-md shrink-0">
                AD
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-mono uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                    {currentFallbackAd.tag}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> {currentFallbackAd.badge}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-100">
                  {currentFallbackAd.title}
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5 max-w-xl line-clamp-1">
                  {currentFallbackAd.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={currentFallbackAd.url}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                {currentFallbackAd.cta}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Admin Diagnostic Bar */}
      {isAdmin && (
        <div className="w-full mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span>Publisher: <strong className="text-slate-700 dark:text-slate-200">{configuredPublisherId}</strong> | Slot: {resolvedSlot || 'Auto'}</span>
            <span>
              {adFilled === true ? (
                <strong className="text-emerald-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Real Google Ad Serving
                </strong>
              ) : adFilled === false ? (
                <strong className="text-amber-500">AdSense Unfilled (Fallback Active)</strong>
              ) : (
                <strong className="text-indigo-400">Requesting Ad from Google...</strong>
              )}
            </span>
          </div>
          {adFilled === false && (
            <p className="text-[9px] text-slate-400 leading-relaxed bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              ℹ️ <strong>Google Ad Notice:</strong> Google responded with &quot;unfilled&quot;. This occurs when your site/domain is currently under review by Google AdSense, the ad slot is newly created, or no matching ad inventory is available. The verified fallback showcase banner ensures zero broken whitespace for users.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
