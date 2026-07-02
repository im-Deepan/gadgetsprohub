import React, { useEffect, useRef } from 'react';

interface AdSenseBannerProps {
  slot: string;
  format?: string;
  responsive?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  slot,
  format = 'auto',
  responsive = 'true',
  style = { display: 'block' },
  className = '',
}) => {
  const adElement = useRef<HTMLModElement>(null);

  const publisherId = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_ADSENSE_CLIENT_ID || '' : '';

  useEffect(() => {
    if (!publisherId) return; // Do not push empty client ads in dev mode or missing client id
    try {
      if (typeof window !== 'undefined') {
        let attempts = 0;
        const maxAttempts = 30;

        let innerTimer: ReturnType<typeof setTimeout> | null = null;
        let isUnmounted = false;

        // Wait until element has width before pushing
        const checkVisibility = () => {
          if (isUnmounted) return;
          if (adElement.current && !adElement.current.getAttribute('data-adsbygoogle-status')) {
            if (adElement.current.offsetWidth > 0) {
              const adsbygoogle = (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || [];
              try {
                adsbygoogle.push({});
              } catch (e) {
                console.warn('AdSense inline push warning:', e);
              }
            } else if (attempts < maxAttempts) {
              attempts++;
              innerTimer = setTimeout(checkVisibility, 200);
            }
          }
        };

        const timer = setTimeout(checkVisibility, 300);
        return () => {
          isUnmounted = true;
          clearTimeout(timer);
          if (innerTimer) clearTimeout(innerTimer);
        };
      }
    } catch (e) {
      console.warn('AdSense load catch warning:', e);
    }
    return;
  }, [publisherId]);

  // Ensure style always has block layout and safety dimensions to satisfy Google publisher tag layout requirements
  const resolvedStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    minWidth: '250px',
    minHeight: '90px',
    ...style
  };

  return (
    <div id={`adsense-panel-${slot}`} className={`my-6 overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800/30 p-4 border border-dashed border-slate-100 dark:border-slate-700/80 flex flex-col items-center justify-center transition-all duration-300 ${className}`}>
      <span className="text-[9px] font-mono tracking-widest text-slate-300 dark:text-slate-400 uppercase mb-2">
        Sponsor Advertisement
      </span>
      
      {publisherId ? (
        <div className="w-full min-w-[250px] min-h-[90px] block relative text-center overflow-x-auto">
          <ins
            className="adsbygoogle"
            style={resolvedStyle}
            data-ad-client={publisherId}
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive={responsive}
            ref={adElement}
          />
        </div>
      ) : (
        <div className="w-full h-24 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl flex flex-col items-center justify-center p-4 border border-dotted border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-300 font-mono">
            Interactive Ad Slot Sandbox
          </span>
          <span className="text-[9px] text-slate-300 dark:text-slate-500 font-mono mt-1 text-center max-w-md">
            Please configure the environment variable VITE_ADSENSE_CLIENT_ID in your workspace settings to authorize and stream ads here.
          </span>
        </div>
      )}

      {/* Subtle indicator showing that context ad slot holds active listeners */}
      <span className="text-[8px] font-mono text-slate-300 dark:text-slate-400 mt-2 cursor-default select-none">
        AdSense Client: {publisherId || 'Local Sandbox Mode (Unconfigured)'} | Slot Ref: {slot}
      </span>
    </div>
  );
};
