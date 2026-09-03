import React, { useState, useEffect, Suspense, lazy } from 'react';
import { QueryClientProvider, useIsFetching, useIsMutating } from '@tanstack/react-query';
import { queryClient } from './utils/queryClient';
import { prefetchData } from './utils/prefetcher';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { CompareProvider } from './context/CompareContext';
import { CompareBar } from './components/CompareBar';
import { CompareModal } from './components/CompareModal';
import { WishlistModal } from './components/WishlistModal';
import { initWebVitals } from './utils/webVitals';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { ImageLightbox } from './components/ImageLightbox';
import { CookieConsent } from './components/CookieConsent';
import { Home } from './pages/Home';
import { ProductPageSkeleton, BlogPageSkeleton } from './components/PageSkeletons';
import { ErrorBoundary } from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { safeSetItem, safeGetItem } from './utils/localStorage';
import { DEFAULT_VIEW_METADATA, updateDocumentMetadata } from './utils/metaManager';
import { apiFetch } from './utils/apiClient';
import { captureError } from './utils/errorTracker';

const isAbortError = (err: unknown): boolean => {
  if (!err) return false;
  if (err instanceof Error) return err.name === 'AbortError';
  if (typeof err === 'object' && err !== null && 'name' in err) {
    return (err as { name?: unknown }).name === 'AbortError';
  }
  return false;
};

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
    return "Unknown";
  }
  const raw = rawName.trim();
  const name = raw.toLowerCase();
  if (name === 'unknown') return "Unknown";
  
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
  }

  const matched = TAMIL_NADU_CITIES.find(
    c => c.toLowerCase() === name || name.includes(c.toLowerCase())
  );
  if (matched) return matched;

  // Return original detected city name
  return raw;
};

import { NotFoundPage } from './pages/NotFoundPage';

// Static allowed view definitions (exhaustively checked at compile time)
export const ALLOWED_VIEWS = [
  'home',
  'products',
  'search',
  'product-detail',
  'blogs',
  'blog',
  'blog-detail',
  'contact',
  'login',
  'profile',
  'admin',
  'privacy-policy',
  'privacy',
  'about-us',
  'terms-conditions',
  'disclaimer',
  '404'
] as const;

export type AppView = typeof ALLOWED_VIEWS[number];

// Module-level global state for Google AdSense to prevent duplicate script loading across StrictMode mounts
let adsenseScriptLoaded = false;

// Standardized telemetry visitor logger extracted outside component context to eliminate state/callback circular reference loops
export const logVisit = (timeSpentSeconds: number, currentPath: string, viewCity: string) => {
  try {
    const consent = safeGetItem('cookie_consent');
    if (consent === 'declined') return;
    const prefs = safeGetItem('cookie_preferences');
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs);
        if (parsed.analytics === false) return;
      } catch (e) {}
    }

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

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

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

// Code-Split Dynamic Page Imports (Home is statically bundled for immediate LCP/FCP)
const ProductList = dynamicLoadWithPreload(() => import('./pages/ProductList').then(m => ({ default: m.ProductList })));
const SearchPage = dynamicLoadWithPreload(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
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
      case 'privacy':
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
    prefetchData(view, slug).catch(() => {});
  } catch (err) {
    captureError(err, { context: 'preloadView', view, slug });
  }
};

const ViewLoader: React.FC = () => {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center py-20 px-4 font-sans select-none">
      <div className="h-10 w-10 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-indigo-600 animate-spin mb-4" />
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Loading</span>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  useEffect(() => {
    initWebVitals();
  }, []);

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

  // Gracefully verify connection to MongoDB Atlas from App initialization after main thread is idle
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const response = await apiFetch('/api/health-check', { signal: controller.signal, maxRetries: 0 });
        if (!response.ok) {
          await response.json().catch(() => ({}));
          showToast("Server health check returned a warning status. Attempting to reconnect...", "warning", 5000, "Connectivity");
        }
      } catch (err: unknown) {
        if (!isAbortError(err)) {
          showToast("Unable to reach primary server. Please check your network connection.", "warning", 4000, "Connectivity");
        }
      }
    }, 2000);
    return () => {
      clearTimeout(timeoutId);
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
    
    const timeoutId = setTimeout(async () => {
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
        if (!isAbortError(err)) {
          captureError(err, { context: 'Failed to track visitor visit analytics' });
        }
      }
    }, 1500);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // Load AdSense script safely after initial page render and hydration during idle time
  useEffect(() => {
    const loadAdSense = async () => {
      const consent = localStorage.getItem('cookie_consent');
      if (consent === 'declined') return;
      const prefs = localStorage.getItem('cookie_preferences');
      if (prefs) {
        try {
          const parsed = JSON.parse(prefs);
          if (parsed.marketing === false) return;
        } catch (e) {}
      }

      if (adsenseScriptLoaded) return;

      try {
        let publisherId = (import.meta.env.VITE_ADSENSE_CLIENT_ID || '').trim();
        let adsEnabled = true;

        // Fetch dynamic site settings configured in Admin dashboard
        try {
          const res = await fetch('/api/settings');
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
              if (json.data.adsenseEnabled === false) {
                adsEnabled = false;
              }
              if (json.data.adsenseClientId) {
                publisherId = json.data.adsenseClientId.trim();
              }
            }
          }
        } catch (e) {}

        if (!adsEnabled) return;

        const isValidPublisher = Boolean(
          publisherId && 
          publisherId.startsWith('ca-pub-') && 
          publisherId !== 'ca-pub-1234567890123456' && 
          publisherId !== 'ca-pub-0000000000000000'
        );

        if (isValidPublisher) {
          adsenseScriptLoaded = true;
          const existingScript = document.querySelector(`script[src*="pagead2.googlesyndication.com"]`);
          if (!existingScript) {
            const script = document.createElement('script');
            script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
            script.async = true;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
          }
        }
      } catch (err) {
        captureError(err, { context: 'Failed to load Google AdSense script' });
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(loadAdSense, { timeout: 3500 });
    } else {
      const timer = setTimeout(loadAdSense, 3000);
      return () => clearTimeout(timer);
    }

    const handleConsentUpdate = () => {
      const consent = localStorage.getItem('cookie_consent');
      if (consent === 'declined') {
        const existingScript = document.querySelector(`script[src*="pagead2.googlesyndication.com"]`);
        if (existingScript) existingScript.remove();
        adsenseScriptLoaded = false;
      } else {
        loadAdSense();
      }
    };

    window.addEventListener('cookie_consent_updated', handleConsentUpdate);
    return () => {
      window.removeEventListener('cookie_consent_updated', handleConsentUpdate);
    };
  }, []);

  // Simple state router
  const [activeView, setActiveView] = useState<AppView>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam && (ALLOWED_VIEWS as readonly string[]).includes(viewParam)) {
        return (viewParam === 'blog' ? 'blogs' : viewParam) as AppView;
      }
      
      const path = window.location.pathname.replace(/^\/+/, '').trim();
      if (!path) return 'home';

      const pathParts = path.split('/');
      const viewPart = pathParts[0];

      if (viewPart === 'blog' || viewPart === 'blogs') {
        return pathParts.length > 1 && pathParts[1] ? 'blog-detail' : 'blogs';
      }

      if (viewPart === 'privacy' || viewPart === 'privacy-policy') {
        return 'privacy-policy';
      }

      if (viewPart && (ALLOWED_VIEWS as readonly string[]).includes(viewPart)) {
        return viewPart as AppView;
      }
      // Any unknown top-level route is treated as a category slug
      if (viewPart === 'category') {
        return 'products';
      }
      if (viewPart && !(ALLOWED_VIEWS as readonly string[]).includes(viewPart)) {
        return 'products';
      }

      return '404';
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

      const path = window.location.pathname.replace(/^\/+/, '').trim();
      if (!path) return null;

      const pathParts = path.split('/');
      const viewPart = pathParts[0];

      if (viewPart === 'blog' || viewPart === 'blogs') {
        return pathParts.length > 1 ? pathParts.slice(1).join('/') : null;
      }
      // Any unknown top-level route is treated as a category slug
      if (viewPart && !(ALLOWED_VIEWS as readonly string[]).includes(viewPart)) {
        return `category-${viewPart}`;
      }
      if (viewPart === 'category' && pathParts.length > 1) {
        return `category-${pathParts[1]}`;
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
    const raw = safeGetItem('aff_preferred_city') || 'Unknown';
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
              if (data.country && typeof data.country === 'string') {
                safeSetItem('aff_country', data.country);
              }
              setDetectedCity(mappedCity);
              
              return;
            }
          }
        }
      } catch (err: unknown) {
        if (!isAbortError(err)) {
          // Log location lookup warning defensively without throwing
        }
      }
    };

    fetchLocation().catch(() => {});
    return () => {
      controller.abort();
    };
  }, []);

  // Keep references to state so popstate lists and analytics won't capture stale values or trigger duplicate network hits
  const activeViewRef = React.useRef(activeView);
  const selectedSlugRef = React.useRef(selectedSlug);
  const userDistrictRef = React.useRef(user?.district);
  const detectedCityRef = React.useRef(detectedCity);

  useEffect(() => {
    activeViewRef.current = activeView;
    selectedSlugRef.current = selectedSlug;
    userDistrictRef.current = user?.district;
    detectedCityRef.current = detectedCity;
  }, [activeView, selectedSlug, user?.district, detectedCity]);

  // Tracks activeView and selectedSlug to determine page URL and times spent on each view
  useEffect(() => {
    const pageStartTime = Date.now();
    const currentPath = selectedSlug ? `${activeView}/${selectedSlug}` : activeView;
    const viewCity = userDistrictRef.current || detectedCityRef.current || 'Unknown';

    // Log instantaneous visual landing deferred slightly to not block initial render
    const initialTimer = setTimeout(() => {
      logVisit(0, currentPath, viewCity);
    }, 1000);

    return () => {
      clearTimeout(initialTimer);
      // Log active duration spent on cleanup
      const durationSeconds = Math.round((Date.now() - pageStartTime) / 1000);
      if (durationSeconds > 0) {
        logVisit(durationSeconds, currentPath, viewCity);
      }
    };
  }, [activeView, selectedSlug]);

  // Dynamic metadata update effect
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const applyMetadata = async () => {
      // 1. If it's a product , inspect dynamic s from db API
      if (activeView === 'product-detail' && selectedSlug) {
        try {
          const res = await fetch(`/api/products/${selectedSlug}`, { signal: controller.signal });
          if (res.ok && active) {
            const product = await res.json();
            const categoryName = (typeof product.category === 'object' && product.category !== null) ? product.category.name : (product.category || 'Tech');
            const dynamicOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://gadgetsprohub.com';
            const dynamicUrl = `${dynamicOrigin}/product-detail/${selectedSlug}`;

            if (active && !controller.signal.aborted) {
              updateDocumentMetadata({
                title: `${product.name} - Specifications, Price & Review | gadgetsprohub`,
                description: product.description || `Read detailed reviews, current prices, and core physical specifications of the ${product.name} at gadgetsprohub.`,
                keywords: `${product.name}, ${product.brand || ''}, ${categoryName}, technical specs, gadget comparison`,
                ogType: 'product',
                ogUrl: dynamicUrl,
                ogImage: product.images?.[0] || '/og-banner.png'
              });
            }
            return;
          }
        } catch (err: unknown) {
          if (!isAbortError(err)) {
            // Defensively continue with static metadata fallback
          }
        }
      }

      // 2. If it's a blog , inspect dynamic s from blogs API
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
                ogImage: blog.imageUrl || blog.featured_image || '/og-banner.png'
              });
            }
            return;
          }
        } catch (err: unknown) {
          if (!isAbortError(err)) {
            // Defensively continue with static metadata fallback
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

    applyMetadata().catch(() => {});

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeView, selectedSlug]);

  // Manage body scroll positions on navigating
  const navigateToView = (view: AppView | string, slug?: string) => {
    let normalized = view === 'blog' ? 'blogs' : view;
    if (normalized === 'privacy') normalized = 'privacy-policy';
    const targetView = normalized as AppView;
    if (!(ALLOWED_VIEWS as readonly string[]).includes(targetView)) {
      setActiveView('404');
      return;
    }
    
    if (activeView === targetView && selectedSlug === (slug || null)) {
      // If we are already on this view, trigger resets for better user experience!
      if (targetView === 'products') {
        window.dispatchEvent(new CustomEvent('reset-product-detailfilters'));
      } else if (targetView === 'home') {
        window.dispatchEvent(new CustomEvent('reset-home-filters'));
      }
      return; 
    }

    setActiveView(targetView);
    setSelectedSlug(slug || null);
    
    // Sync URL queries
    try {
      const url = new URL(window.location.href);
      if (targetView === 'home' && !slug) {
        url.pathname = '/';
        url.search = '';
      } else if (targetView === 'blogs' && !slug) {
        url.pathname = '/blog';
        url.search = '';
      } else if (targetView === 'products' && slug && slug.startsWith('category-')) {
        const catSlug = slug.replace('category-', '');
        url.pathname = '/' + catSlug;
        url.search = '';
      } else {
        url.pathname = '/' + targetView + (slug ? '/' + slug : '');
        url.search = ''; // Clean old queries
      }
      
      // Store state in history to retrieve on back/forward
      window.history.pushState({ view: targetView, slug: slug || null }, '', url.toString());
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

        if (viewUrl && (ALLOWED_VIEWS as readonly string[]).includes(viewUrl)) {
          view = viewUrl as AppView;
          slug = params.get('slug') || null;
        } else if (viewPart && (ALLOWED_VIEWS as readonly string[]).includes(viewPart)) {
          view = viewPart as AppView;
          if (pathParts.length > 1) {
             slug = pathParts.slice(1).join('/');
          }
        } else if (viewPart === 'category' && pathParts.length > 1) {
          view = 'products';
          slug = `category-${pathParts[1]}`;
        } else if (viewPart && viewPart.startsWith('category-')) {
          view = 'products';
          slug = viewPart;
        } else if (viewPart && !(ALLOWED_VIEWS as readonly string[]).includes(viewPart)) {
          view = 'products';
          slug = `category-${viewPart}`;
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
    let content = null;
    switch (activeView) {
      case 'home':
        content = <Home onNavigate={navigateToView} onPreload={preloadView} />;
        break;
      case 'products':
        content = (
          <Suspense fallback={<ProductPageSkeleton />}>
            <ProductList initialFilter={selectedSlug} onNavigate={navigateToView} onPreload={preloadView} />
          </Suspense>
        );
        break;
      case 'search':
        content = (
          <Suspense fallback={<ProductPageSkeleton />}>
            <SearchPage onNavigate={navigateToView} onPreload={preloadView} />
          </Suspense>
        );
        break;
      case 'product-detail':
        content = (
          <Suspense fallback={<ProductPageSkeleton />}>
            <ProductDetail productSlug={selectedSlug || ''} onNavigate={navigateToView} />
          </Suspense>
        );
        break;
      case 'blogs':
      case 'blog':
        content = (
          <Suspense fallback={<BlogPageSkeleton />}>
            <BlogList onNavigate={navigateToView} onPreload={preloadView} />
          </Suspense>
        );
        break;
      case 'blog-detail':
        content = (
          <Suspense fallback={<BlogPageSkeleton />}>
            <BlogDetail blogSlug={selectedSlug || ''} onNavigate={navigateToView} />
          </Suspense>
        );
        break;
      case 'contact':
        content = (
          <Suspense fallback={<ViewLoader />}>
            <Contact />
          </Suspense>
        );
        break;
      case 'login':
        content = (
          <Suspense fallback={<ViewLoader />}>
            <Login onNavigate={navigateToView} />
          </Suspense>
        );
        break;
      case 'profile':
        content = (
          <Suspense fallback={<ViewLoader />}>
            <Profile onNavigate={navigateToView} />
          </Suspense>
        );
        break;
      case 'admin':
        content = (
          <Suspense fallback={<ViewLoader />}>
            <Admin onNavigate={navigateToView} />
          </Suspense>
        );
        break;
      case 'privacy':
      case 'privacy-policy':
        content = (
          <Suspense fallback={<ViewLoader />}>
            <PrivacyPolicy />
          </Suspense>
        );
        break;
      case 'about-us':
        content = (
          <Suspense fallback={<ViewLoader />}>
            <AboutUs />
          </Suspense>
        );
        break;
      case 'terms-conditions':
        content = (
          <Suspense fallback={<ViewLoader />}>
            <TermsConditions />
          </Suspense>
        );
        break;
      case 'disclaimer':
        content = (
          <Suspense fallback={<ViewLoader />}>
            <Disclaimer />
          </Suspense>
        );
        break;
      case '404':
      default:
        content = <NotFoundPage onNavigate={navigateToView} />;
        break;
    }
    
    return content;
  };

  return (
    <div className={`min-h-screen flex flex-col text-slate-700 dark:text-slate-50 transition-colors duration-300 ${activeView === 'login' ? 'bg-slate-50 dark:bg-black' : 'bg-slate-50 dark:bg-black'}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[10000] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none font-bold text-xs"
      >
        Skip to main content
      </a>
      
      {isGlobalLoading && (
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-slate-100/50 dark:bg-slate-700/50 z-[9999] overflow-hidden">
          <div className="h-full bg-indigo-600 dark:bg-indigo-400 w-1/3 rounded-full animate-loading-bar" />
        </div>
      )}

      {/* Structural Header Navigation */}
      <Navbar
        currentView={activeView}
        onNavigate={navigateToView}
        onPreload={preloadView}
        onOpenWishlist={() => setIsWishlistOpen(true)}
      />

      {/* Main viewport area */}
      <main id="main-content" className="flex-grow overflow-x-hidden relative flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView + (selectedSlug || '')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-full overflow-x-hidden flex-grow flex flex-col"
          >
            <Suspense fallback={<ViewLoader />}>
              {renderActiveView()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Structural Footer */}
      <Footer onNavigate={navigateToView} isHomePage={activeView === 'home'} />
      <ScrollToTop />
      <ImageLightbox />
      <CookieConsent onNavigate={navigateToView} />

      {/* Modals & Floating Tools */}
      {isWishlistOpen && (
        <WishlistModal
          isOpen={isWishlistOpen}
          onClose={() => setIsWishlistOpen(false)}
          onNavigate={navigateToView}
        />
      )}
      <CompareModal onNavigate={navigateToView} />
      <CompareBar />

    </div>
  );
};

// queryClient is now imported from './utils/queryClient'

const setupGlobalErrorTracking = () => {
  const handleError = (event: ErrorEvent) => {
    captureError(event.error || new Error(event.message || 'Global error'), {
      context: 'Global error handler',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    if (
      !reason ||
      reason.name === 'AbortError' ||
      reason.name === 'CanceledError' ||
      (typeof reason === 'string' && (
        reason.includes('abort') || 
        reason.includes('canceled') || 
        reason.includes('cancelled') ||
        reason.includes('failed to fetch') ||
        reason.includes('load failed')
      )) ||
      (reason && typeof reason === 'object' && (
        reason.name === 'AbortError' ||
        reason.name === 'CanceledError' ||
        String(reason.name || '').toLowerCase() === 'aborterror'  ||
        String(reason.message || '').toLowerCase().includes('abort') ||
        String(reason.message || '').toLowerCase().includes('canceled') ||
        String(reason.message || '').toLowerCase().includes('cancelled') ||
        String(reason.message || '').toLowerCase().includes('failed to fetch') ||
        String(reason.message || '').toLowerCase().includes('networkerror') ||
        String(reason.message || '').toLowerCase().includes('load failed')
      ))
    ) {
      return;
    }
    captureError(reason, {
      context: 'Unhandled promise rejection',
    });
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
};

export default function App() {
  useEffect(() => {
    const cleanup = setupGlobalErrorTracking();
    return cleanup;
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <CompareProvider>
                <AppContent />
              </CompareProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
