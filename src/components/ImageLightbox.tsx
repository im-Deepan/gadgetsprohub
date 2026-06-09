import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxPayload {
  src: string;
  images?: string[];
  alt?: string;
  currentIndex?: number;
}

export const ImageLightbox: React.FC = () => {
  const [lightboxData, setLightboxData] = useState<{
    src: string;
    alt: string;
    images: string[];
    currentIndex: number;
  } | null>(null);

  const touchStartRef = useRef<number | null>(null);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<LightboxPayload>;
      if (customEvent.detail && customEvent.detail.src) {
        const { src, images, alt, currentIndex } = customEvent.detail;
        const imgList = images && images.length > 0 ? images : [src];
        const idx = typeof currentIndex === 'number' && currentIndex >= 0 
          ? currentIndex 
          : imgList.indexOf(src);

        setLightboxData({
          src,
          alt: alt || 'Zoomed view',
          images: imgList,
          currentIndex: idx !== -1 ? idx : 0
        });
      }
    };

    window.addEventListener('open-lightbox', handleOpen);
    return () => {
      window.removeEventListener('open-lightbox', handleOpen);
    };
  }, []);

  const handleNavigate = (direction: 'next' | 'prev') => {
    setLightboxData((prev) => {
      if (!prev || prev.images.length <= 1) return prev;
      const { images, currentIndex } = prev;
      let nextIdx = currentIndex;
      if (direction === 'prev') {
        nextIdx = (currentIndex - 1 + images.length) % images.length;
      } else {
        nextIdx = (currentIndex + 1) % images.length;
      }
      return {
        ...prev,
        currentIndex: nextIdx,
        src: images[nextIdx]
      };
    });
  };

  const jumpToImage = (idx: number) => {
    setLightboxData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentIndex: idx,
        src: prev.images[idx]
      };
    });
  };

  useEffect(() => {
    if (!lightboxData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxData(null);
      } else if (e.key === 'ArrowLeft') {
        handleNavigate('prev');
      } else if (e.key === 'ArrowRight') {
        handleNavigate('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxData]);

  // Touch handlers for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartRef.current;

    // Minimum swipe threshold of 50px
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right -> show previous
        handleNavigate('prev');
      } else {
        // Swipe left -> show next
        handleNavigate('next');
      }
    }
    touchStartRef.current = null;
  };

  return (
    <AnimatePresence>
      {lightboxData && (
        <motion.div
          id="global-image-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out"
          onClick={() => setLightboxData(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxData(null);
            }}
            className="absolute top-6 right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition-all cursor-pointer z-10"
            title="Close Lightbox (Esc)"
          >
            <X size={22} />
          </button>

          {/* Lightbox main viewport */}
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[85vh] flex flex-col items-center justify-center gap-4 pointer-events-auto bg-transparent"
          >
            {/* Swipable Image Frame */}
            <div 
              className="relative w-full flex items-center justify-center cursor-default select-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={lightboxData.src}
                alt={lightboxData.alt}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[58vh] md:max-h-[62vh] object-contain rounded-2xl shadow-3xl border border-white/10 bg-slate-900/60 transition-all duration-300 pointer-events-auto"
              />
            </div>

            {lightboxData.alt && (
              <div className="text-white/85 text-xs font-semibold font-sans tracking-wide text-center select-none truncate max-w-lg">
                {lightboxData.alt}
              </div>
            )}

            {/* Slight Translucent Navigation Bar at the Bottom */}
            <div className="flex items-center gap-3 bg-black/45 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-xl max-w-full select-none select-none">
              {lightboxData.images.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleNavigate('prev')}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/95 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Previous (Left Arrow)"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Prev</span>
                </button>
              )}

              {/* Scrollable Thumbnails list */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[150px] sm:max-w-[300px] py-1 px-1 scrollbar-hide">
                {lightboxData.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => jumpToImage(i)}
                    className={`relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border transition-all duration-200 cursor-pointer ${
                      i === lightboxData.currentIndex
                        ? 'border-indigo-500 scale-105 shadow-md ring-2 ring-indigo-500/30'
                        : 'border-white/10 opacity-55 hover:opacity-100 hover:scale-[1.02]'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`Thumbnail ${i + 1}`} 
                      referrerPolicy="no-referrer" 
                      className="h-full w-full object-cover select-none pointer-events-none" 
                    />
                  </button>
                ))}
              </div>

              {lightboxData.images.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleNavigate('next')}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/95 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Next (Right Arrow)"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>

            {/* Pagination status overlay indicator */}
            {lightboxData.images.length > 1 && (
              <span className="text-[10px] font-mono font-bold text-white/40 tracking-wider">
                {lightboxData.currentIndex + 1} / {lightboxData.images.length}
              </span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
