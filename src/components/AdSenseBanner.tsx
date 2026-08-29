import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Tag, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdSenseBannerProps {
  slot: string;
  format?: string;
  responsive?: string;
  style?: React.CSSProperties;
  className?: string;
}

const FALLBACK_PUBLISHER_ID = 'ca-pub-1234567890123456';

const SPONSORED_ADS = [
  {
    title: "Premium Tech Upgrade Deals - Up to 40% Off",
    description: "Explore top-rated smartphones, ultra-slim laptops, noise-canceling gear & smart wearables verified by gadgetsprohub.",
    cta: "Explore Verified Deals",
    url: "/?category=smartphones",
    tag: "Sponsored Sponsor",
    badge: "Official Deal"
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
  slot,
  format = 'auto',
  responsive = 'true',
  style = { display: 'block' },
  className = '',
}) => {
  const { user } = useAuth();
  const isAdmin = Boolean(user && user.role === 'admin');
  const adElement = useRef<HTMLModElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [isUnfilled, setIsUnfilled] = useState(false);
  const [siteSettings, setSiteSettings] = useState<{
    adsenseClientId?: string;
    adsenseEnabled?: boolean;
  } | null>(null);

  // Pick a stable fallback ad based on slot ID hash
  const adIndex = Math.abs(slot.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % SPONSORED_ADS.length;
  const currentFallbackAd = SPONSORED_ADS[adIndex];

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

  const configuredPublisherId = siteSettings?.adsenseClientId || (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_ADSENSE_CLIENT_ID || '' : '');
  const publisherId = configuredPublisherId || FALLBACK_PUBLISHER_ID;
  const isTestMode = publisherId === FALLBACK_PUBLISHER_ID || publisherId.includes('1234567890');
  
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

  const [consentGiven, setConsentGiven] = React.useState<boolean>(checkMarketingConsent);

  React.useEffect(() => {
    const handleConsentChange = () => {
      setConsentGiven(checkMarketingConsent());
    };
    window.addEventListener('cookie_consent_updated', handleConsentChange);
    return () => {
      window.removeEventListener('cookie_consent_updated', handleConsentChange);
    };
  }, []);

  const adsEnabled = (siteSettings?.adsenseEnabled ?? true) && consentGiven;

  useEffect(() => {
    if (!adsEnabled) return;
    
    if (isTestMode) {
      setIsUnfilled(true);
      return;
    }

    let isUnmounted = false;
    let observer: MutationObserver | null = null;
    let checkTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      if (typeof window !== 'undefined') {
        // Ensure AdSense script tag is present in document head with correct publisherId
        const existingScript = document.querySelector<HTMLScriptElement>(`script[src*="pagead2.googlesyndication.com"]`);
        if (existingScript) {
          if (publisherId && !existingScript.src.includes(`client=${publisherId}`)) {
            existingScript.remove();
            const script = document.createElement('script');
            script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.onerror = () => {
              if (!isUnmounted) setIsUnfilled(true);
            };
            document.head.appendChild(script);
          }
        } else {
          const script = document.createElement('script');
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
          script.async = true;
          script.crossOrigin = 'anonymous';
          script.onerror = () => {
            if (!isUnmounted) setIsUnfilled(true);
          };
          document.head.appendChild(script);
        }

        // Push ad unit once element is visible
        let attempts = 0;
        const maxAttempts = 20;

        const pushAdUnit = () => {
          if (isUnmounted) return;
          if (adElement.current && !adElement.current.getAttribute('data-adsbygoogle-status')) {
            if (adElement.current.offsetWidth > 0) {
              const adsbygoogle = (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || [];
              try {
                adsbygoogle.push({});
                setAdLoaded(true);
              } catch (e) {
                console.warn('AdSense push warning:', e);
                setIsUnfilled(true);
              }
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(pushAdUnit, 250);
            }
          }
        };

        setTimeout(pushAdUnit, 300);

        // Observe element mutations to detect Google AdSense unfilled attribute
        if (adElement.current && typeof MutationObserver !== 'undefined') {
          observer = new MutationObserver(() => {
            if (isUnmounted) return;
            const status = adElement.current?.getAttribute('data-ad-status');
            if (status === 'unfilled') {
              setIsUnfilled(true);
            } else if (status === 'filled') {
              setIsUnfilled(false);
              setAdLoaded(true);
            }
          });

          observer.observe(adElement.current, {
            attributes: true,
            attributeFilter: ['data-ad-status', 'style']
          });
        }

        // Fallback check after 2 seconds: if ins has no height or marked unfilled, show fallback
        checkTimeout = setTimeout(() => {
          if (isUnmounted) return;
          if (adElement.current) {
            const status = adElement.current.getAttribute('data-ad-status');
            if (status === 'unfilled' || (adElement.current.clientHeight < 15 && isTestMode)) {
              setIsUnfilled(true);
            }
          }
        }, 2000);
      }
    } catch (e) {
      console.warn('AdSense setup error:', e);
      setIsUnfilled(true);
    }

    return () => {
      isUnmounted = true;
      if (observer) observer.disconnect();
      if (checkTimeout) clearTimeout(checkTimeout);
    };
  }, [publisherId, slot, adsEnabled, isTestMode]);

  // Ensure style always has block layout and safety dimensions
  const resolvedStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    minWidth: '250px',
    minHeight: '90px',
    ...style
  };

  if (!adsEnabled) {
    return (
      <div id={`adsense-panel-${slot}`} className={`my-4 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border border-dotted border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 font-mono ${className}`}>
        [AdSense Ads Paused by Admin]
      </div>
    );
  }

  return (
    <div id={`adsense-panel-${slot}`} className={`my-6 min-h-[140px] overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-dashed border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center transition-all duration-300 ${className}`}>
      <div className="w-full flex items-center justify-between mb-2.5 px-1">
        <span className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-slate-400 uppercase font-bold flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Sponsored Showcase
        </span>
        {isAdmin && (
          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Tag className="w-3 h-3 text-indigo-400" /> Slot: {slot}
          </span>
        )}
      </div>
      
      <div className="w-full min-w-[250px] block relative text-center overflow-x-auto">
        {/* Google AdSense ins tag */}
        <ins
          className="adsbygoogle"
          style={{ ...resolvedStyle, display: isUnfilled ? 'none' : 'block' }}
          data-ad-client={publisherId}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive}
          data-ad-test={isTestMode ? "on" : undefined}
          ref={adElement}
        />

        {/* Fallback Sponsored Ad Banner (Only shown if AdSense is unfilled or fails to load) */}
        {isUnfilled && (
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

      {isAdmin && (
        <div className="w-full mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span>Publisher: <strong className="text-slate-700 dark:text-slate-200">{publisherId}</strong> | Slot: {slot}</span>
            <span>{isUnfilled ? <strong className="text-amber-500">AdSense Unfilled / 400 Notice</strong> : <strong className="text-emerald-500">AdSense Active</strong>}</span>
          </div>
          {isUnfilled && (
            <p className="text-[9px] text-slate-400 dark:text-slate-400 leading-relaxed bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              ℹ️ <strong>AdSense 400 Error / Unfilled Notice:</strong> Google AdSense returned a 400 error because this domain (<code className="text-indigo-400">gadgetsprohub.onrender.com</code>) or ad slot ID (<code className="text-indigo-400">{slot}</code>) is pending review, not yet approved in your AdSense console, or missing ads.txt verification. The verified fallback showcase banner is displayed above.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

