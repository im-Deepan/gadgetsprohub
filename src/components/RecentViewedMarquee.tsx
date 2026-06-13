import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Sparkles, ArrowRight } from 'lucide-react';
import { Product } from '../types';

interface RecentViewedMarqueeProps {
  recentViewed: Product[];
  onNavigate: (view: string, slug?: string) => void;
  onClear: () => void;
}

export const RecentViewedMarquee: React.FC<RecentViewedMarqueeProps> = ({
  recentViewed,
  onNavigate,
  onClear,
}) => {
  if (!recentViewed || recentViewed.length === 0) return null;

  // We will display a row of slots depending on screen size:
  // On mobile: 2 slots (or 1 if list is extremely small)
  // On tablet: 3 slots
  // On desktop: 4 slots
  const [slotCycles, setSlotCycles] = useState<number[]>([0, 1, 2, 3]);

  // Handle auto-rotation. Every 4.5 seconds, we increment the indexes so they roll vertically!
  useEffect(() => {
    if (recentViewed.length <= 1) return;

    const interval = setInterval(() => {
      setSlotCycles((prev) => prev.map((val) => (val + 1) % recentViewed.length));
    }, 4505);

    return () => clearInterval(interval);
  }, [recentViewed.length]);

  // Determine how many slots to render depending on size.
  // Instead of completely hiding slots using javascript client-side resize which can flicker,
  // we will standardise Tailwind grid classes to show/hide slots.
  // Mobile: grid-cols-2 (2 slots)
  // Tablet: md:grid-cols-3 (3 slots)
  // Desktop: lg:grid-cols-4 (4 slots)
  const renderSlots = [0, 1, 2, 3];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Editorial Title Header */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-6 pb-3 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white font-sans uppercase">
            Pick Where You Left
          </h2>
          <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-900/80 dark:text-slate-300 font-mono uppercase tracking-wide">
            History Roll
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors bg-transparent border-none cursor-pointer p-0 mt-1 md:mt-0"
        >
          Clear history
        </button>
      </div>

      {/* Grid of equally-spaced square containers */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {renderSlots.map((slotIndex) => {
          // Calculate the actual product index for this slot.
          // We apply an offset so that each slot displays a different product!
          // Slot 0 sees product: (cycle + 0) % len
          // Slot 1 sees product: (cycle + 1) % len
          // etc.
          const currentCycle = slotCycles[slotIndex];
          const productIndex = (currentCycle + slotIndex) % recentViewed.length;
          const prod = recentViewed[productIndex];

          // Determine responsiveness classes:
          // Slots 0 & 1: Always visible (grid-cols-2).
          // Slot 2: Hidden on mobile (block on md, table scale) md:block.
          // Slot 3: Hidden on mobile/tablet, visible on desktop lg:block.
          let responsiveClass = "";
          if (slotIndex === 2) {
            responsiveClass = "hidden md:block";
          } else if (slotIndex === 3) {
            responsiveClass = "hidden lg:block";
          }

          if (!prod) return null;

          return (
            <div
              key={`slot-${slotIndex}`}
              className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0c1224] transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 aspect-square flex flex-col justify-between p-4 group cursor-pointer ${responsiveClass}`}
              onClick={() => onNavigate('product-detail', prod.slug)}
            >
              {/* Vertical Marquee Slide with AnimatePresence */}
              <div className="relative w-full h-[62%] flex items-center justify-center overflow-hidden bg-slate-50/50 dark:bg-slate-950/45 rounded-xl border border-slate-100 dark:border-slate-900/60 p-2">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={prod._id}
                    initial={{ opacity: 0, y: 55, scale: 0.92 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0, 
                      scale: 1,
                      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
                    }}
                    exit={{ 
                      opacity: 0, 
                      y: -55, 
                      scale: 0.92,
                      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
                    }}
                    className="absolute w-full h-full flex items-center justify-center p-3"
                  >
                    <img
                      src={prod.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300'}
                      alt={prod.name}
                      referrerPolicy="no-referrer"
                      className="max-w-full max-h-full object-contain drop-shadow-xs group-hover:scale-105 transition-all duration-300 inline-block"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Rating overlay badge at top right */}
                {prod.rating && (
                  <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md text-white font-extrabold font-mono text-[9px] px-1.5 py-0.5 rounded shadow-sm z-10 dark:bg-slate-900/90">
                    ★ {prod.rating.toFixed(1)}
                  </div>
                )}
              </div>

              {/* Text, Brand, and title container */}
              <div className="h-[32%] flex flex-col justify-end relative overflow-hidden mt-2">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={prod._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { duration: 0.45, ease: 'easeOut' }
                    }}
                    exit={{ 
                      opacity: 0, 
                      y: -15,
                      transition: { duration: 0.35, ease: 'easeIn' }
                    }}
                    className="w-full flex-grow flex flex-col justify-center"
                  >
                    <span className="text-[9px] font-black tracking-wider uppercase font-mono text-indigo-600 dark:text-indigo-400 leading-none truncate">
                      {prod.brand || 'Elite Design'}
                    </span>
                    <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight leading-none mt-1">
                      {prod.name}
                    </h3>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Corner mini arrow indicating action on hover */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <ArrowRight className="h-3 w-3 text-indigo-605" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
