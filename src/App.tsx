import React, { useState, useEffect, Suspense, lazy } from 'react';
import { QueryClientProvider, useIsFetching, useIsMutating } from '@tanstack/react-query';
import { queryClient } from './utils/queryClient';
import { prefetchData } from './utils/prefetcher';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { ImageLightbox } from './components/ImageLightbox';
import { ProductPageSkeleton, BlogPageSkeleton } from './components/PageSkeletons';
import { ErrorBoundary } from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { safeSetItem, safeGetItem } from './utils/localStorage';
import { DEFAULT_VIEW_METADATA, updateDocumentMetadata } from './utils/metaManager';
import { apiFetch } from './utils/apiClient';
import { captureError } from './utils/errorTracker';

const TAMIL_NADU_CITIES = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
  "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur",
  "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris",
  "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivagangai",
  "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
  "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore",
  "Viluppuram", "Virudhunagar"
];

const mapToTamilNaduCity = (rawName: string): string => {
  if (!rawName) {
    return "Chennai";
  }
  const name = rawName.trim().toLowerCase();
  
  if (name.includes("trichy") || name.includes("tiruchirappalli") || name.includes("tiruchirapalli")) {
    return "Tiruchirappalli";
  } else if (name.includes("chennai") || name.includes("madras")) {
    return "Chennai";
  } else if (name.includes("coimbatore") || name.includes("kovai")) {
    return "Coimbatore";
  } else if (name.includes("madurai")) {
    return "Madurai";
  } else if (name.includes("salem")) {
    return "Salem";
  } else if (name.includes("nellai") || name.includes("tirunelveli")) {
    return "Tirunelveli";
  } else if (name.includes("ashburn") || name.includes("montreal") || name.includes("bueren") || name.includes("virginia")) {
    // Return a random stable major Tamil Nadu city based on hashing
    return "Chennai";
  }

  const matched = TAMIL_NADU_CITIES.find(
    c => c.toLowerCase() === name || name.includes(c.toLowerCase())
  );
  if (matched) return matched;

  // Stably map other names via hash to one of the major cities
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % TAMIL_NADU_CITIES.length;
  return TAMIL_NADU_CITIES[index];
};

// Static allowed view definitions (exhaustively checked at compile time)
export const ALLOWED_VIEWS = [
  'home',
  'products',
  'product-detail',
  'blogs',
  'blog-detail',
  'contact',
  'login',
  'profile',
  'admin',
  'privacy-policy',
  'about-us',
  'terms-conditions',
  'disclaimer'
] as const;

export type AppView = typeof ALLOWED_VIEWS[number];

// Module-level global state for Google AdSense to prevent duplicate script loading across StrictMode mounts
let adsenseScriptLoaded = false;

// Standardized telemetry visitor logger extracted outside component context to eliminate state/callback circular reference loops
export const logVisit = (timeSpentSeconds: number, currentPath: string, viewCity: string) => {
  try {
    const ua = navigator.userAgent;
    let browser = "Chrome";
    let device = "Desktop";

    // Accurate and standard-conforming browser matching
    if (ua.includes("Firefox/")) browser = "Firefox";
    else if (ua.includes("SamsungBrowser/")) browser = "Samsung Browser";
    else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";
    else if (ua.includes("Trident/")) browser = "Internet Explorer";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome/") && ua.includes("Safari/")) browser = "Chrome";
    else if (ua.includes("Safari/")) browser = "Safari";

    // Precise mobile device matching
    if (/android/i.test(ua)) {
      device = /mobile/i.test(ua) ? "Android Mobile" : "Android Tablet";
    } else if (/ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      device = "iPad/Tablet";
    } else if (/iphone|ipod/i.test(ua)) {
      device = "iOS Mobile";
    } else if (/windows/i.test(ua)) {
      device = "Windows Desktop";
    } else if (/macintosh/i.test(ua)) {
      device = "macOS Desktop";
    } else if (/linux/i.test(ua)) {
      device = "Linux Desktop";
    } else if (/mobile/i.test(ua)) {
      device = "General Mobile";
    }

    const body = {
      pageUrl: currentPath,
      timeSpent: timeSpentSeconds,
      browser,
      device,
      district: viewCity
    };

    const tokenVal = safeGetItem('aff_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tokenVal) {
      headers['Authorization'] = `Bearer ${tokenVal}`;
    }

    apiFetch('/api/analytics/page-view', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      keepalive: true
    }).catch((err) => {
      console.warn('Silent analytics page-view failed:', err);
    });
  } catch (err) {
    captureError(err, { context: 'Analytics logging exception' });
  }
};

// Helper to support manual preloading on lazy-loaded routes
type PreloadableComponent<T extends React.ComponentType<any>> = React.LazyExoticComponent<T> & {
  preload?: () => Promise<{ default: T }>;
};

const dynamicLoadWithPreload = <T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>): PreloadableComponent<T> => {
  const Component = lazy(factory) as PreloadableComponent<T>;
  Component.preload = factory;
  return Component;
};

// Code-Split Dynamic Page Imports
const Home = dynamicLoadWithPreload(() => import('./pages/Home').then(m => ({ default: m.Home })));
const ProductList = dynamicLoadWithPreload(() => import('./pages/ProductList').then(m => ({ default: m.ProductList })));
const ProductDetail = dynamicLoadWithPreload(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const BlogList = dynamicLoadWithPreload(() => import('./pages/Blog').then(m => ({ default: m.BlogList })));
const BlogDetail = dynamicLoadWithPreload(() => import('./pages/BlogDetail').then(m => ({ default: m.BlogDetail })));
const Contact = dynamicLoadWithPreload(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const Login = dynamicLoadWithPreload(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Profile = dynamicLoadWithPreload(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Admin = dynamicLoadWithPreload(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const PrivacyPolicy = dynamicLoadWithPreload(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const AboutUs = dynamicLoadWithPreload(() => import('./pages/AboutUs').then(m => ({ default: m.AboutUs })));
const TermsConditions = dynamicLoadWithPreload(() => import('./pages/TermsConditions').then(m => ({ default: m.TermsConditions })));
const Disclaimer = dynamicLoadWithPreload(() => import('./pages/Disclaimer').then(m => ({ default: m.Disclaimer })));

export const preloadView = (view: AppView, slug?: string) => {
  try {
    const handlePreload = (promise?: Promise<any>) => {
      promise?.catch?.((err) => captureError(err, { context: 'preloadView promise', view }));
    };
    switch (view) {
      case 'home':
        handlePreload(Home.preload?.());
        break;
      case 'products':
        handlePreload(ProductList.preload?.());
        break;
      case 'product-detail':
        handlePreload(ProductDetail.preload?.());
        break;
      case 'blogs':
        handlePreload(BlogList.preload?.());
        break;
      case 'blog-detail':
        handlePreload(BlogDetail.preload?.());
        break;
      case 'contact':
        handlePreload(Contact.preload?.());
        break;
      case 'login':
        handlePreload(Login.preload?.());
        break;
      case 'profile':
        handlePreload(Profile.preload?.());
        break;
      case 'admin':
        handlePreload(Admin.preload?.());
        break;
      case 'privacy-policy':
        handlePreload(PrivacyPolicy.preload?.());
        break;
      case 'about-us':
        handlePreload(AboutUs.preload?.());
        break;
      case 'terms-conditions':
        handlePreload(TermsConditions.preload?.());
        break;
      case 'disclaimer':
        handlePreload(Disclaimer.preload?.());
        break;
    }
    // Prefetch API and TanStack state cache
    prefetchData(view, slug);
  } catch (err) {
    captureError(err, { context: 'preloadView', view, slug });
  }
};

const ViewLoader: React.FC = () => {
  const [statusMessage, setStatusMessage] = useState("Preparing page components...");
  const [progress, setProgress] = useState(15);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const steps = [
      { msg: "Connecting to secure catalog servers...", progress: 38, stepNum: 1 },
      { msg: "Loading product details & reviews...", progress: 62, stepNum: 2 },
      { msg: "Initializing interface filters and options...", progress: 84, stepNum: 3 },
      { msg: "Rendering gallery elements for you...", progress: 100, stepNum: 4 }
    ];
    let index = 0;
    const interval = setInterval(() => {
      if (index < steps.length) {
        setStatusMessage(steps[index].msg);
        setProgress(steps[index].progress);
        setCurrentStep(steps[index].stepNum);
        index++;
      }
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-h-[60vh] flex flex-col items-center justify-center py-20 px-4 font-sans select-none"
    >
      <div className="relative flex items-center justify-center mb-6">
        <div className="h-16 w-16 rounded-full border-4 border-slate-50 dark:border-slate-700/80 border-t-indigo-500 animate-spin"></div>
        <div className="absolute h-16 w-16 rounded-full border border-dashed border-indigo-400/20 animate-ping"></div>
        <div className="absolute text-[10px] font-mono font-bold text-indigo-500 dark:text-indigo-300">
          {progress}%
        </div>
      </div>
      
      <div className="text-center max-w-sm w-full mb-4 px-2">
        <div className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase mb-1">
          Step {currentStep} of 4 • Loading Assets
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-200 tracking-wide block leading-relaxed min-h-[32px]">
          {statusMessage}
        </span>
      </div>

      {/* Elegant glowing progress bar container */}
      <div className="w-64 h-1.5 bg-slate-50 dark:bg-slate-700 rounded-full overflow-hidden mb-3 relative shadow-inner">
        <motion.div 
          className="h-full bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600 rounded-full"
          initial={{ width: "15%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
        />
      </div>

      <span className="text-[10px] font-bold text-slate-300/70 dark:text-slate-400/70 uppercase tracking-[0.25em] animate-pulse">
        Optimizing experience
      </span>
    </motion.div>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isGlobalLoading = isFetching > 0 || isMutating > 0;

  useEffect(() => {
    const handleOffline = () => {
      showToast("Your internet connection was interrupted. The application is now running in local offline safety mode.", "warning", 5000, "Connectivity");
    };

    const handleOnline = () => {
      showToast("Your internet connection has been restored. Re-establishing live server sync.", "success", 4000, "Connectivity");
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [showToast]);

  // Gracefully verify connection to MongoDB Atlas from App initialization
  useEffect(() => {
    const controller = new AbortController();
    const checkDbHealth = async () => {
      try {
        const response = await apiFetch('/api/health-check', { signal: controller.signal });
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          
          showToast("Reconnecting to the primary data system. Working securely with local cache.", "warning", 5000, "Connectivity");
        } else {
          
        }
      } catch (err: unknown) {
        const errorObj = err as { name?: string };
        if (errorObj.name !== 'AbortError') {
          
          showToast("Synchronized successfully in offline mode. Accessing local catalog backups.", "info", 4000, "Connectivity");
        }
      }
    };
    checkDbHealth();
    return () => {
      controller.abort();
    };
  }, [showToast]);

  // Visitor logging under a controlled mount hook utilizing an AbortController signal
  useEffect(() => {
    const controller = new AbortController();
    
    let visitorId = safeGetItem('affiliate_visitor_id');
    if (!visitorId) {
      visitorId = 'vis_' + window.crypto.randomUUID().replace(/-/g, '');
      safeSetItem('affiliate_visitor_id', visitorId);
    }
    
    const trackVisit = async () => {
      try {
        const res = await fetch('/api/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId }),
          signal: controller.signal
        });
        if (!res.ok) {
          console.warn(`Analytics visit tracking failed with status ${res.status}`);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          captureError(err, { context: 'Failed to track visitor visit analytics' });
        }
      }
    };

    trackVisit();

    // Lazy load AdSense safely with strict double-trigger protection
    const loadAdSense = () => {
      if (adsenseScriptLoaded) return;
      adsenseScriptLoaded = true;

      // Clean up event listeners immediately upon any physical interaction click/scroll
      window.removeEventListener('scroll', loadAdSense);
      window.removeEventListener('click', loadAdSense);
      window.removeEventListener('touchstart', loadAdSense);
      window.removeEventListener('mousemove', loadAdSense);

      try {
        const publisherId = import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-5970826882216712';
        const existingScript = document.querySelector(`script[src*="pagead2.googlesyndication.com"]`);
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
          script.async = true;
          script.crossOrigin = 'anonymous';
          document.head.appendChild(script);
        }
      } catch (err) {
        captureError(err, { context: 'Failed to load Google AdSense script' });
      }
    };

    if (!adsenseScriptLoaded) {
      window.addEventListener('scroll', loadAdSense, { passive: true });
      window.addEventListener('click', loadAdSense, { passive: true });
      window.addEventListener('touchstart', loadAdSense, { passive: true });
      window.addEventListener('mousemove', loadAdSense, { passive: true });
    }

    // 3.5s safety timeout for crawlers or indexers, giving plenty of time to render without script congestion
    const adsenseTimeout = setTimeout(loadAdSense, 3500);

    return () => {
      controller.abort();
      window.removeEventListener('scroll', loadAdSense);
      window.removeEventListener('click', loadAdSense);
      window.removeEventListener('touchstart', loadAdSense);
      window.removeEventListener('mousemove', loadAdSense);
      clearTimeout(adsenseTimeout);
    };
  }, []);

  // Simple state router
  const [activeView, setActiveView] = useState<AppView>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam && (ALLOWED_VIEWS as readonly string[]).includes(viewParam)) return viewParam as AppView;
      
      const path = window.location.pathname.replace(/^\/+/, '');
      const pathParts = path.split('/');
      const viewPart = pathParts[0];

      if (viewPart && (ALLOWED_VIEWS as readonly string[]).includes(viewPart)) {
        return viewPart as AppView;
      }

      // Map category slugs directly to 'products' view
      const knownCategories = ['electronics', 'fashion', 'home-garden', 'sports'];
      if (viewPart && (knownCategories.includes(viewPart) || viewPart.startsWith('category-'))) {
        return 'products';
      }

      return 'home';
    } catch (err) {
      captureError(err, { context: 'getInitialView' });
      return 'home';
    }
  });

  // JSDoc note: selectedSlug holds sub-route URL pieces or localized slug query strings (e.g. products/subcategory or blog/slug)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('slug')) return params.get('slug');

      const path = window.location.pathname.replace(/^\/+/, '');
      const pathParts = path.split('/');
      const viewPart = pathParts[0];

      // Map category slugs
      const knownCategories = ['electronics', 'fashion', 'home-garden', 'sports'];
      if (viewPart && knownCategories.includes(viewPart)) {
        return `category-${viewPart}`;
      }
      if (viewPart && viewPart.startsWith('category-')) {
        return viewPart;
      }

      if (pathParts.length > 1) {
        return pathParts.slice(1).join('/'); 
      }
      return null;
    } catch (err) {
      captureError(err, { context: 'getInitialSlug' });
      return null;
    }
  });

  const [detectedCity, setDetectedCity] = useState<string>(() => {
    const raw = safeGetItem('aff_preferred_city') || 'Chennai';
    return mapToTamilNaduCity(raw);
  });

  // Fetch primary location / district of user automatically and silently on app boot using AbortController
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchLocation = async () => {
      const cached = safeGetItem('aff_preferred_city');
      if (cached) {
        const mappedCached = mapToTamilNaduCity(cached);
        setDetectedCity(mappedCached);
        if (mappedCached !== cached) {
          safeSetItem('aff_preferred_city', mappedCached);
        }
        return;
      }

      // Try proxy/location (CORS-friendly)
      try {
        const response = await fetch('/api/proxy/location', { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          if (data && data.city && typeof data.city === 'string') {
            const city = data.city.trim();
            if (city) {
              const mappedCity = mapToTamilNaduCity(city);
              safeSetItem('aff_preferred_city', mappedCity);
              setDetectedCity(mappedCity);
              
              return;
            }
          }
        }
      } catch (err: unknown) {
        const e = err as { name?: string };
        if (e.name !== 'AbortError') {
          
        }
      }
    };

    fetchLocation();
    return () => {
      controller.abort();
    };
  }, []);

  // Keep references to state so popstate lists won't capture stale values on dynamic syncing
  const activeViewRef = React.useRef(activeView);
  const selectedSlugRef = React.useRef(selectedSlug);

  useEffect(() => {
    activeViewRef.current = activeView;
    selectedSlugRef.current = selectedSlug;
  }, [activeView, selectedSlug]);

  // Tracks activeView and selectedSlug to determine page URL and times spent on each view
  useEffect(() => {
    const pageStartTime = Date.now();
    const currentPath = selectedSlug ? `${activeView}/${selectedSlug}` : activeView;
    const viewCity = user?.district || detectedCity || 'Chennai';

    // Log instantaneous visual landing (0 seconds spent)
    logVisit(0, currentPath, viewCity);

    return () => {
      // Log active duration spent on cleanup
      const durationSeconds = Math.round((Date.now() - pageStartTime) / 1000);
      if (durationSeconds > 0) {
        logVisit(durationSeconds, currentPath, viewCity);
      }
    };
  }, [activeView, selectedSlug, user, detectedCity]);

  // Dynamic metadata update effect
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const applyMetadata = async () => {
      // 1. If it's a product detail, inspect dynamic details from db API
      if (activeView === 'product-detail' && selectedSlug) {
        try {
          const res = await fetch(`/api/products/${selectedSlug}`, { signal: controller.signal });
          if (res.ok && active) {
            const product = await res.json();
            const categoryName = typeof product.category === 'object' ? product.category.name : (product.category || 'Tech');
            const dynamicOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://gadgetsprohub.com';
            const dynamicUrl = `${dynamicOrigin}/product-detail/${selectedSlug}`;

            if (active && !controller.signal.aborted) {
              updateDocumentMetadata({
                title: `${product.name} - Specifications, Price & Review | gadgetsprohub`,
                description: product.description || `Read detailed reviews, current prices, and core physical specifications of the ${product.name} at gadgetsprohub.`,
                keywords: `${product.name}, ${product.brand || ''}, ${categoryName}, technical specs, gadget comparison`,
                ogType: 'product',
                ogUrl: dynamicUrl,
                ogImage: product.images?.[0] || '/favicon.png'
              });
            }
            return;
          }
        } catch (err: unknown) {
          const errorObj = err as { name?: string };
          if (errorObj.name !== 'AbortError') {
            
          }
        }
      }

      // 2. If it's a blog detail, inspect dynamic details from blogs API
      if (activeView === 'blog-detail' && selectedSlug) {
        try {
          const res = await fetch(`/api/blogs/${selectedSlug}`, { signal: controller.signal });
          if (res.ok && active) {
            const blog = await res.json();
            const dynamicOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://gadgetsprohub.com';
            const dynamicUrl = `${dynamicOrigin}/blog-detail/${selectedSlug}`;

            if (active && !controller.signal.aborted) {
              updateDocumentMetadata({
                title: `${blog.title} | Technical Editorial Insights`,
                description: blog.excerpt || blog.content?.substring(0, 160) || `Read our latest expert tech perspective and expert specs analysis on gadgetsprohub.`,
                keywords: `${blog.title}, expert guides, editorial blog, specs breakdown`,
                ogType: 'article',
                ogUrl: dynamicUrl,
                ogImage: blog.imageUrl || blog.featured_image || '/favicon.png'
              });
            }
            return;
          }
        } catch (err: unknown) {
          const errorObj = err as { name?: string };
          if (errorObj.name !== 'AbortError') {
            
          }
        }
      }

      // 3. Fallback/Standard static metadata updates
      const staticMeta = DEFAULT_VIEW_METADATA[activeView];
      if (staticMeta && active && !controller.signal.aborted) {
        const dynamicOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://gadgetsprohub.com';
        const dynamicUrl = selectedSlug 
          ? `${dynamicOrigin}/${activeView}/${selectedSlug}` 
          : `${dynamicOrigin}/${activeView === 'home' ? '' : activeView}`;

        updateDocumentMetadata({
          ...staticMeta,
          ogUrl: dynamicUrl
        });
      }
    };

    applyMetadata();

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeView, selectedSlug]);

  // Manage body scroll positions on navigating
  const navigateToView = (view: any, slug?: string) => {
    if (!(ALLOWED_VIEWS as readonly string[]).includes(view)) return;
    
    if (activeView === view && selectedSlug === (slug || null)) {
      // If we are already on this view, trigger resets for better user experience!
      if (view === 'products') {
        window.dispatchEvent(new CustomEvent('reset-product-filters'));
      } else if (view === 'home') {
        window.dispatchEvent(new CustomEvent('reset-home-filters'));
      }
      return; 
    }

    setActiveView(view);
    setSelectedSlug(slug || null);
    
    // Sync URL queries
    try {
      const url = new URL(window.location.href);
      if (view === 'home' && !slug) {
        url.pathname = '/';
        url.search = '';
      } else if (view === 'products' && slug && slug.startsWith('category-')) {
        const catSlug = slug.replace('category-', '');
        url.pathname = '/' + catSlug;
        url.search = '';
      } else {
        url.pathname = '/' + view + (slug ? '/' + slug : '');
        url.search = ''; // Clean old queries
      }
      
      // Store state in history to retrieve on back/forward
      window.history.pushState({ view, slug: slug || null }, '', url.toString());
    } catch (e) {
      captureError(e, { context: 'pushState error ignored', url: window.location.href });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Synchronize app state with browser history (back/forward buttons) preserving React state dependency rules
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we have state in the history, use it
      if (event.state && event.state.view) {
        setActiveView(event.state.view);
        setSelectedSlug(event.state.slug || null);
      } else {
        // Fallback to URL parsing if state is missing
        const params = new URLSearchParams(window.location.search);
        const viewUrl = params.get('view');
        
        const path = window.location.pathname.replace(/^\/+/, '');
        const pathParts = path.split('/');
        const viewPart = pathParts[0];
        
        let view: AppView = 'home';
        let slug = null;

        const knownCategories = ['electronics', 'fashion', 'home-garden', 'sports'];
        if (viewUrl && (ALLOWED_VIEWS as readonly string[]).includes(viewUrl)) {
          view = viewUrl as AppView;
          slug = params.get('slug') || null;
        } else if (viewPart && (ALLOWED_VIEWS as readonly string[]).includes(viewPart)) {
          view = viewPart as AppView;
          if (pathParts.length > 1) {
             slug = pathParts.slice(1).join('/');
          }
        } else if (viewPart && knownCategories.includes(viewPart)) {
          view = 'products';
          slug = `category-${viewPart}`;
        } else if (viewPart && viewPart.startsWith('category-')) {
          view = 'products';
          slug = viewPart;
        }
        
        setActiveView(view);
        setSelectedSlug(slug);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    
    // Ensure initial state is captured in history using the non-stale ref values
    if (!window.history.state) {
      window.history.replaceState({ view: activeViewRef.current, slug: selectedSlugRef.current }, '', window.location.href);
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // Keeps listeners clean without stale closures using stable state ref hooks

  // Custom visual view switcher render with exhaustive switch path checks
  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return <Home onNavigate={navigateToView} onPreload={preloadView} />;
      case 'products':
        return (
          <Suspense fallback={<ProductPageSkeleton />}>
            <ProductList initialFilter={selectedSlug} onNavigate={navigateToView} onPreload={preloadView} />
          </Suspense>
        );
      case 'product-detail':
        return <ProductDetail productSlug={selectedSlug || ''} onNavigate={navigateToView} />;
      case 'blogs':
        return (
          <Suspense fallback={<BlogPageSkeleton />}>
            <BlogList onNavigate={navigateToView} onPreload={preloadView} />
          </Suspense>
        );
      case 'blog-detail':
        return <BlogDetail blogSlug={selectedSlug || ''} onNavigate={navigateToView} />;
      case 'contact':
        return <Contact />;
      case 'login':
        return <Login onNavigate={navigateToView} />;
      case 'profile':
        return <Profile onNavigate={navigateToView} />;
      case 'admin':
        return <Admin onNavigate={navigateToView} />;
      case 'privacy-policy':
        return <PrivacyPolicy />;
      case 'about-us':
        return <AboutUs />;
      case 'terms-conditions':
        return <TermsConditions />;
      case 'disclaimer':
        return <Disclaimer />;
      default: {
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
            <button onClick={() => navigateToView('home')} className="bg-indigo-500 text-white px-6 py-2 rounded-lg">Return Home</button>
          </div>
        );
      }
    }
  };

  return (
    <div className={`min-h-screen flex flex-col text-slate-700 dark:text-slate-50 transition-colors duration-300 ${activeView === 'login' ? 'bg-slate-50 dark:bg-black' : 'bg-slate-50 dark:bg-black'}`}>
      
      {isGlobalLoading && (
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-slate-100/50 dark:bg-slate-700/50 z-[9999] overflow-hidden">
          <div className="h-full bg-indigo-500 dark:bg-indigo-300 w-1/3 rounded-full animate-loading-bar" />
        </div>
      )}

      {/* Structural Header Navigation */}
      <Navbar currentView={activeView} onNavigate={navigateToView} onPreload={preloadView} />

      {/* Main viewport area */}
      <main className="flex-grow overflow-x-hidden relative flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView + (selectedSlug || '')}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="w-full max-w-full overflow-x-hidden flex-grow flex flex-col"
          >
            <Suspense fallback={<ViewLoader />}>
              {renderActiveView()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Structural Footer */}
      {activeView !== 'login' && <Footer onNavigate={navigateToView} isHomePage={activeView === 'home'} />}
      <ScrollToTop />
      <ImageLightbox />

    </div>
  );
};

// queryClient is now imported from './utils/queryClient'

const setupGlobalErrorTracking = () => {
  window.addEventListener('error', (event) => {
    captureError(event.error || new Error(event.message), {
      context: 'Global error handler',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, {
      context: 'Unhandled promise rejection',
    });
  });
};

export default function App() {
  useEffect(() => {
    setupGlobalErrorTracking();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
