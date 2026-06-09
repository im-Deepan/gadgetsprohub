import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { ImageLightbox } from './components/ImageLightbox';
import { motion, AnimatePresence } from 'motion/react';

// Page Imports
import { Home } from './pages/Home';
import { ProductList } from './pages/ProductList';
import { ProductDetail } from './pages/ProductDetail';
import { BlogList } from './pages/Blog';
import { BlogDetail } from './pages/BlogDetail';
import { Contact } from './pages/Contact';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { AboutUs } from './pages/AboutUs';
import { TermsConditions } from './pages/TermsConditions';
import { Disclaimer } from './pages/Disclaimer';

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

  // Visitor logging and Google AdSense dynamic loading on app boot
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

    // Initialize Google AdSense dynamic script injection
    try {
      const publisherId = (import.meta as any).env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-3677332219983411';
      const existingScript = document.querySelector(`script[src*="pagead2.googlesyndication.com"]`);
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
        console.log(`Google AdSense script dynamically injected with Client ID: ${publisherId}`);
      }
    } catch (err) {
      console.warn('Google AdSense script dynamic injection failed:', err);
    }
  }, []);

  // Simple state router
  const [activeView, setActiveView] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') || 'home';
    } catch {
      return 'home';
    }
  });
  const [selectedSlug, setSelectedSlug] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('slug') || null;
    } catch {
      return null;
    }
  });

  const [detectedCity, setDetectedCity] = useState<string>(() => {
    try {
      return localStorage.getItem('aff_preferred_city') || 'Chennai';
    } catch {
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
        }).catch(() => {});
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
        url.search = '';
      } else {
        url.searchParams.set('view', view);
        if (slug) {
          url.searchParams.set('slug', slug);
        } else {
          url.searchParams.delete('slug');
        }
      }
      
      // Store state in history to retrieve on back/forward
      window.history.pushState({ view, slug: slug || null }, '', url.toString());
    } catch (e) {
      console.warn("Could not sync window history:", e);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
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
        const view = params.get('view') || 'home';
        const slug = params.get('slug') || null;
        setActiveView(view);
        setSelectedSlug(slug);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Structural Header Navigation */}
      <Navbar currentView={activeView} onNavigate={navigateToView} />

      {/* Main viewport area */}
      <main className="flex-grow overflow-x-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView + (selectedSlug || '')}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="w-full h-full"
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Structural Footer */}
      <Footer onNavigate={navigateToView} isHomePage={activeView === 'home'} />
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
