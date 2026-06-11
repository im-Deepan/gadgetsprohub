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

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        let attempts = 0;
        const maxAttempts = 30;

        // Wait until element has width before pushing
        const checkVisibility = () => {
          if (adElement.current && !adElement.current.getAttribute('data-adsbygoogle-status')) {
            if (adElement.current.offsetWidth > 0) {
              const adsbygoogle = (window as any).adsbygoogle || [];
              try {
                adsbygoogle.push({});
              } catch (e) {
                console.warn('AdSense push error:', e);
              }
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(checkVisibility, 200);
            }
          }
        };

        const timer = setTimeout(checkVisibility, 300);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('Google AdSense render fallback triggered:', e);
    }
  }, []);

  const publisherId = (import.meta as any).env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-5970826882216712';

  // Ensure style always has block layout and safety dimensions to satisfy Google publisher tag layout requirements
  const resolvedStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    minWidth: '250px',
    minHeight: '90px',
    ...style
  };

  return (
    <div id={`adsense-panel-${slot}`} className={`my-6 overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900/30 p-4 border border-dashed border-slate-200 dark:border-slate-800/80 flex flex-col items-center justify-center transition-all duration-300 ${className}`}>
      <span className="text-[9px] font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-2">
        Sponsor Advertisement
      </span>
      
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

      {/* Subtle indicator showing that context ad slot holds active listeners */}
      <span className="text-[8px] font-mono text-slate-350 dark:text-slate-600 mt-2 cursor-default select-none">
        AdSense Client: {publisherId} | Slot Ref: {slot}
      </span>
    </div>
  );
};
