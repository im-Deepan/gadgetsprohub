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

  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [dragY, setDragY] = useState(0);

  const touchStartRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isSingleTouchRef = useRef(false);
  const initialDistanceRef = useRef(0);
  const initialScaleRef = useRef(1);
  const lastTapRef = useRef<number>(0);
  const panStartXRef = useRef(0);
  const panStartYRef = useRef(0);
  const swipeDeltaXRef = useRef(0);
  const swipeDeltaYRef = useRef(0);

  useEffect(() => {
    // Reset Zoom/Translate state when main image changes
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    setDragY(0);
  }, [lightboxData?.currentIndex]);

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
      if (!prev || !prev.images || prev.images.length <= 1) return prev;
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
      if (!prev || !prev.images || idx < 0 || idx >= prev.images.length) return prev;
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

  // Premium multi-gesture mobile handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      panStartXRef.current = translateX;
      panStartYRef.current = translateY;
      isSingleTouchRef.current = true;
      swipeDeltaXRef.current = 0;
      swipeDeltaYRef.current = 0;

      touchStartRef.current = touch.clientX;
    } else if (e.touches.length === 2) {
      isSingleTouchRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      initialDistanceRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isSingleTouchRef.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;
      swipeDeltaXRef.current = deltaX;
      swipeDeltaYRef.current = deltaY;

      if (scale > 1) {
        if (e.cancelable) e.preventDefault();
        const maxPanX = Math.max(0, 160 * (scale - 1));
        const maxPanY = Math.max(0, 160 * (scale - 1));
        const newX = panStartXRef.current + deltaX;
        const newY = panStartYRef.current + deltaY;
        setTranslateX(Math.max(-maxPanX * 1.5, Math.min(maxPanX * 1.5, newX)));
        setTranslateY(Math.max(-maxPanY * 1.5, Math.min(maxPanY * 1.5, newY)));
      } else {
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          // Swipe down or up to dismiss
          setDragY(deltaY);
        } else {
          setDragY(0);
        }
      }
    } else if (e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (initialDistanceRef.current > 0) {
        const factor = distance / initialDistanceRef.current;
        const targetScale = Math.max(1, Math.min(4, initialScaleRef.current * factor));
        setScale(targetScale);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isSingleTouchRef.current) {
      if (scale === 1) {
        if (Math.abs(dragY) > 80) {
          // Vertically swiped past threshold -> Dismiss!
          setLightboxData(null);
          return;
        } else {
          setDragY(0);
        }

        const deltaX = swipeDeltaXRef.current;
        const deltaY = swipeDeltaYRef.current;
        if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 40) {
          if (deltaX > 0) {
            handleNavigate('prev');
          } else {
            handleNavigate('next');
          }
        }
      } else {
        const maxPanX = Math.max(0, 160 * (scale - 1));
        const maxPanY = Math.max(0, 160 * (scale - 1));
        setTranslateX(prev => Math.max(-maxPanX, Math.min(maxPanX, prev)));
        setTranslateY(prev => Math.max(-maxPanY, Math.min(maxPanY, prev)));
      }
    }

    touchStartRef.current = null;
    isSingleTouchRef.current = false;
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_PRESS_THRESHOLD = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_THRESHOLD) {
      if (scale > 1) {
        setScale(1);
        setTranslateX(0);
        setTranslateY(0);
      } else {
        setScale(2.5);
      }
    }
    lastTapRef.current = now;
  };

  return (
    <AnimatePresence>
      {lightboxData && (
        <motion.div
          id="global-image-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center p-4 backdrop-blur-md cursor-zoom-out transition-colors duration-200"
          style={{ backgroundColor: `rgba(0, 0, 0, ${0.85 * Math.max(0.12, 1 - Math.abs(dragY) / 380)})` }}
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

          {/* Interactive touch action helper tip badge */}
          <div className="absolute top-6 left-6 hidden sm:flex items-center gap-1.5 bg-white/10 border border-white/5 text-white/70 px-3 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider select-none pointer-events-none">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
            Pinch to Zoom • Tap-Drag to pan • Swipe vertical to dismiss
          </div>

          {/* Lightbox main viewport */}
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[85vh] flex flex-col items-center justify-center gap-4 pointer-events-auto bg-transparent"
          >
            {/* Interactive Image Frame */}
            <div 
              className="relative w-full flex items-center justify-center cursor-default select-none overflow-hidden py-4"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleDoubleTap}
            >
              <img
                src={lightboxData.src}
                alt={lightboxData.alt}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[58vh] md:max-h-[62vh] object-contain rounded-2xl shadow-3xl border border-white/10 bg-slate-800/60 pointer-events-auto touch-none"
                style={{
                  transform: `translate3d(${translateX}px, ${translateY + dragY}px, 0) scale(${scale})`,
                  transition: scale === 1 && dragY === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease' : 'none'
                }}
              />
            </div>

            {lightboxData.alt && (
              <div className="text-white/85 text-xs font-semibold font-sans tracking-wide text-center select-none truncate max-w-lg">
                {lightboxData.alt}
              </div>
            )}

            {/* Slight Translucent Navigation Bar at the Bottom */}
            <div className="flex items-center gap-3 bg-black/45 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-xl max-w-full select-none">
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
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[100px] sm:max-w-[300px] py-1 px-1 scrollbar-hide">
                {lightboxData.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => jumpToImage(i)}
                    className={`relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border transition-all duration-200 cursor-pointer ${
                      i === lightboxData.currentIndex
                        ? 'border-indigo-400 scale-105 shadow-md ring-2 ring-indigo-400/30'
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
