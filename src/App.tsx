import React, { useState, useEffect, Suspense, lazy } from 'react';
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

    fetch('/api/analytics/page-view', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      keepalive: true
    }).catch((err) => {
      console.warn("Analytics telemetry request could not be completed:", err);
    });
  } catch (err) {
    console.warn("Telemetry reporting failure:", err);
  }
};

// Helper to support manual preloading on lazy-loaded routes
const dynamicLoadWithPreload = (factory: () => Promise<any>) => {
  const Component = lazy(factory);
  (Component as any).preload = factory;
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

export const preloadView = (view: AppView) => {
  try {
    switch (view) {
      case 'home':
        (Home as any).preload?.();
        break;
      case 'products':
        (ProductList as any).preload?.();
        break;
      case 'product-detail':
        (ProductDetail as any).preload?.();
        break;
      case 'blogs':
        (BlogList as any).preload?.();
        break;
      case 'blog-detail':
        (BlogDetail as any).preload?.();
        break;
      case 'contact':
        (Contact as any).preload?.();
        break;
      case 'login':
        (Login as any).preload?.();
        break;
      case 'profile':
        (Profile as any).preload?.();
        break;
      case 'admin':
        (Admin as any).preload?.();
        break;
      case 'privacy-policy':
        (PrivacyPolicy as any).preload?.();
        break;
      case 'about-us':
        (AboutUs as any).preload?.();
        break;
      case 'terms-conditions':
        (TermsConditions as any).preload?.();
        break;
      case 'disclaimer':
        (Disclaimer as any).preload?.();
        break;
    }
  } catch (err) {
    console.warn("Dynamic view preloading failed:", err);
  }
};

const ViewLoader: React.FC = () => {
  const [statusMessage, setStatusMessage] = useState("Initializing safe environment...");
  const [progress, setProgress] = useState(15);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const steps = [
      { msg: "Establishing safe connection to secure servers...", progress: 38, stepNum: 1 },
      { msg: "Retrieving dynamic catalog templates & preferences...", progress: 62, stepNum: 2 },
      { msg: "Compiling responsive styling & custom interface controls...", progress: 84, stepNum: 3 },
      { msg: "Finalizing and caching client assets for peak performance...", progress: 100, stepNum: 4 }
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
        <div className="h-16 w-16 rounded-full border-4 border-slate-100 dark:border-slate-800/80 border-t-indigo-600 animate-spin"></div>
        <div className="absolute h-16 w-16 rounded-full border border-dashed border-indigo-500/20 animate-ping"></div>
        <div className="absolute text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
          {progress}%
        </div>
      </div>
      
      <div className="text-center max-w-sm w-full mb-4 px-2">
        <div className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase mb-1">
          Step {currentStep} of 4 • Loading Assets
        </div>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tracking-wide block leading-relaxed min-h-[32px]">
          {statusMessage}
        </span>
      </div>

      {/* Elegant glowing progress bar container */}
      <div className="w-64 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3 relative shadow-inner">
        <motion.div 
          className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 rounded-full"
          initial={{ width: "15%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
        />
      </div>

      <span className="text-[10px] font-bold text-slate-400/70 dark:text-slate-500/70 uppercase tracking-[0.25em] animate-pulse">
        Optimizing experience
      </span>
    </motion.div>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const handleOffline = () => {
      showToast("You are offline. Please check your connection and try again later.", "warning");
    };

    const handleOnline = () => {
      showToast("You are back online!", "success");
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
    const checkDbHealth = async () => {
      try {
        const response = await fetch('/api/health-check');
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          console.warn("Database connectivity issue on start:", detail);
          showToast("Cloud DB connectivity issues detected. App is running in local backup mode.", "warning");
        } else {
          console.log("Database connectivity verified on start.");
        }
      } catch (err) {
        console.warn("Database connectivity check failed to execute:", err);
        showToast("Unable to reach cloud servers. Running in offline/local cache mode.", "info");
      }
    };
    checkDbHealth();
  }, [showToast]);

  // Visitor logging under a controlled mount hook utilizing an AbortController signal
  useEffect(() => {
    const controller = new AbortController();
    
    let visitorId = safeGetItem('affiliate_visitor_id');
    if (!visitorId) {
      visitorId = 'vis_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      safeSetItem('affiliate_visitor_id', visitorId);
    }
    
    fetch('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
        signal: controller.signal
      }).catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('Visitor logging call failed:', err);
        }
      });

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
        const publisherId = (import.meta as any).env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-5970826882216712';
        const existingScript = document.querySelector(`script[src*="pagead2.googlesyndication.com"]`);
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
          script.async = true;
          script.crossOrigin = 'anonymous';
          document.head.appendChild(script);
          console.log(`Google AdSense script lazily loaded with Client ID: ${publisherId}`);
        }
      } catch (err) {
        console.warn('Google AdSense script lazy load injection failed:', err);
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
      return 'home';
    } catch (err) {
      console.warn("Simple router active view parsing failed, falling back safely:", err);
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
      if (pathParts.length > 1) {
        return pathParts.slice(1).join('/'); 
      }
      return null;
    } catch (err) {
      console.warn("Simple router slug parsing failed, falling back safely:", err);
      return null;
    }
  });

  const [detectedCity, setDetectedCity] = useState<string>(() => {
    return safeGetItem('aff_preferred_city') || 'Chennai';
  });

  // Fetch primary location / district of user automatically and silently on app boot using AbortController
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchLocation = async () => {
      const cached = safeGetItem('aff_preferred_city');
      if (cached && cached !== 'Chennai') {
        setDetectedCity(cached);
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
              safeSetItem('aff_preferred_city', city);
              setDetectedCity(city);
              console.log(`[Auto Location] Detected location via proxy: ${city}`);
              return;
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('[Auto Location] Proxy failed:', err);
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

  // Manage body scroll positions on navigating
  const navigateToView = (view: AppView, slug?: string) => {
    if (!(ALLOWED_VIEWS as readonly string[]).includes(view)) return;
    
    if (activeView === view && selectedSlug === (slug || null)) {
      // If we are already on this view, still push state if history current is different 
      // (though usually they are in sync)
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
      } else {
        url.pathname = '/' + view + (slug ? '/' + slug : '');
        url.search = ''; // Clean old queries
      }
      
      // Store state in history to retrieve on back/forward
      window.history.pushState({ view, slug: slug || null }, '', url.toString());
    } catch (e) {
      console.warn("Could not sync window history:", e);
    }

    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
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
        }
        
        setActiveView(view);
        setSelectedSlug(slug);
      }
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
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
        return <Home onNavigate={navigateToView} />;
      case 'products':
        return (
          <Suspense fallback={<ProductPageSkeleton />}>
            <ProductList initialFilter={selectedSlug} onNavigate={navigateToView} />
          </Suspense>
        );
      case 'product-detail':
        return <ProductDetail productSlug={selectedSlug || ''} onNavigate={navigateToView} />;
      case 'blogs':
        return (
          <Suspense fallback={<BlogPageSkeleton />}>
            <BlogList onNavigate={navigateToView} />
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
            <button onClick={() => navigateToView('home')} className="bg-indigo-600 text-white px-6 py-2 rounded-lg">Return Home</button>
          </div>
        );
      }
    }
  };

  return (
    <div className={`min-h-screen flex flex-col text-slate-800 dark:text-slate-100 transition-colors duration-300 ${activeView === 'login' ? 'bg-slate-50 dark:bg-black' : 'bg-slate-50 dark:bg-black'}`}>
      
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

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
