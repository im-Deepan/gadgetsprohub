import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { ImageLightbox } from './components/ImageLightbox';
import { motion, AnimatePresence } from 'motion/react';

// Code-Split Dynamic Page Imports
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const ProductList = lazy(() => import('./pages/ProductList').then(m => ({ default: m.ProductList })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const BlogList = lazy(() => import('./pages/Blog').then(m => ({ default: m.BlogList })));
const BlogDetail = lazy(() => import('./pages/BlogDetail').then(m => ({ default: m.BlogDetail })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const AboutUs = lazy(() => import('./pages/AboutUs').then(m => ({ default: m.AboutUs })));
const TermsConditions = lazy(() => import('./pages/TermsConditions').then(m => ({ default: m.TermsConditions })));
const Disclaimer = lazy(() => import('./pages/Disclaimer').then(m => ({ default: m.Disclaimer })));

const ViewLoader: React.FC = () => (
  <div className="w-full min-h-[60vh] flex flex-col items-center justify-center py-20 px-4">
    <div className="relative flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-slate-100 dark:border-slate-900 border-t-indigo-650 animate-spin"></div>
    </div>
    <span className="mt-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 animate-pulse uppercase tracking-[0.12em]">
      Loading page assets...
    </span>
  </div>
);

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

  // Visitor logging and deferred Google AdSense script loading to achieve incredible PageSpeed performance scores
  useEffect(() => {
    try {
      let visitorId = localStorage.getItem('affiliate_visitor_id');
      if (!visitorId) {
        visitorId = 'vis_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('affiliate_visitor_id', visitorId);
      }
      fetch('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId })
      }).catch(err => console.warn('Visitor logging call failed:', err));
    } catch (e) {
      console.warn('Visitor storage query issues:', e);
    }

    // Lazy load AdSense on user interaction or safety timeout
    let scriptLoaded = false;
    
    const loadAdSense = () => {
      if (scriptLoaded) return;
      scriptLoaded = true;

      // Clean up event listeners immediately
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

    window.addEventListener('scroll', loadAdSense, { passive: true });
    window.addEventListener('click', loadAdSense, { passive: true });
    window.addEventListener('touchstart', loadAdSense, { passive: true });
    window.addEventListener('mousemove', loadAdSense, { passive: true });

    // 3.5s safety timeout for crawlers or indexers, giving plenty of time to render without script congestion
    const adsenseTimeout = setTimeout(loadAdSense, 3500);

    return () => {
      window.removeEventListener('scroll', loadAdSense);
      window.removeEventListener('click', loadAdSense);
      window.removeEventListener('touchstart', loadAdSense);
      window.removeEventListener('mousemove', loadAdSense);
      clearTimeout(adsenseTimeout);
    };
  }, []);

  // Simple state router
  const [activeView, setActiveView] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam) return viewParam;
      
      const path = window.location.pathname.replace(/^\/+/, '');
      const pathParts = path.split('/');
      const viewPart = pathParts[0];

      if (viewPart && ['home', 'products', 'product-detail', 'blogs', 'blog-detail', 'contact', 'login', 'profile', 'admin', 'privacy-policy', 'about-us', 'terms-conditions', 'disclaimer'].includes(viewPart)) {
        return viewPart;
      }
      return 'home';
    } catch (err) {
      console.warn("Simple router active view parsing failed, falling back safely:", err);
      return 'home';
    }
  });

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
    try {
      return localStorage.getItem('aff_preferred_city') || 'Chennai';
    } catch (err) {
      console.warn("Storage preferred city resolution failed, falling back safely:", err);
      return 'Chennai';
    }
  });

  // Fetch primary location / district of user automatically and silently on app boot
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const cached = localStorage.getItem('aff_preferred_city');
        if (cached && cached !== 'Chennai') {
          setDetectedCity(cached);
          return;
        }
      } catch (e) {
        console.warn('Storage read failed:', e);
      }

      // Try proxy/location (CORS-friendly)
      try {
        const response = await fetch('/api/proxy/location');
        if (response.ok) {
          const data = await response.json();
          if (data && data.city && typeof data.city === 'string') {
            const city = data.city.trim();
            if (city) {
              localStorage.setItem('aff_preferred_city', city);
              setDetectedCity(city);
              console.log(`[Auto Location] Detected location via proxy: ${city}`);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('[Auto Location] Proxy failed:', err);
      }
    };

    fetchLocation();
  }, []);

  // Tracks activeView and selectedSlug to determine page URL and times spent on each view
  useEffect(() => {
    const pageStartTime = Date.now();
    const currentPath = selectedSlug ? `${activeView}/${selectedSlug}` : activeView;

    const logVisit = (timeSpentSeconds: number) => {
      try {
        const ua = navigator.userAgent;
        let browser = "Chrome";
        let device = "Desktop";

        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("SamsungBrowser")) browser = "Samsung Browser";
        else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
        else if (ua.includes("Trident")) browser = "Internet Explorer";
        else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Edge";
        else if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Safari")) browser = "Safari";

        if (/Android/i.test(ua)) device = "Android Mobile";
        else if (/iPhone|iPad|iPod/i.test(ua)) device = "iOS Device";
        else if (/Windows/i.test(ua)) device = "Windows Desktop";
        else if (/Macintosh/i.test(ua)) device = "macOS Desktop";
        else if (/Linux/i.test(ua)) device = "Linux Desktop";

        // Get location preference
        const preferredCity = user?.district || detectedCity;

        const body = {
          pageUrl: currentPath,
          timeSpent: timeSpentSeconds,
          browser,
          device,
          district: preferredCity
        };

        const tokenVal = localStorage.getItem('aff_token');
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

    // Log instantaneous visual landing (0 seconds spent)
    logVisit(0);

    return () => {
      // Log active duration spent on cleanup
      const durationSeconds = Math.round((Date.now() - pageStartTime) / 1000);
      if (durationSeconds > 0) {
        logVisit(durationSeconds);
      }
    };
  }, [activeView, selectedSlug, user?.id, user?.district, detectedCity]);

  // Manage body scroll positions on navigating
  const navigateToView = (view: string, slug?: string) => {
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

  // Synchronize app state with browser history (back/forward buttons)
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
        
        let view = 'home';
        let slug = null;

        if (viewUrl) {
          view = viewUrl;
          slug = params.get('slug') || null;
        } else if (viewPart && ['home', 'products', 'product-detail', 'blogs', 'blog-detail', 'contact', 'login', 'profile', 'admin', 'privacy-policy', 'about-us', 'terms-conditions', 'disclaimer'].includes(viewPart)) {
          view = viewPart;
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
    
    // Ensure initial state is captured in history
    if (!window.history.state) {
      window.history.replaceState({ view: activeView, slug: selectedSlug }, '', window.location.href);
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeView, selectedSlug]);

  // Custom visual view switcher render
  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return <Home onNavigate={navigateToView} />;
      case 'products':
        return <ProductList initialFilter={selectedSlug} onNavigate={navigateToView} />;
      case 'product-detail':
        return <ProductDetail productSlug={selectedSlug || ''} onNavigate={navigateToView} />;
      case 'blogs':
        return <BlogList onNavigate={navigateToView} />;
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
      default:
        return <Home onNavigate={navigateToView} />;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col text-slate-800 dark:text-slate-100 transition-colors duration-300 ${activeView === 'login' ? 'bg-slate-50 dark:bg-black' : 'bg-slate-50 dark:bg-black'}`}>
      
      {/* Structural Header Navigation */}
      <Navbar currentView={activeView} onNavigate={navigateToView} />

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
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
