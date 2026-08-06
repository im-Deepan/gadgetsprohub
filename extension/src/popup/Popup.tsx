import { useState, useEffect } from 'react';
import { 
  Laptop, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink, 
  Globe, 
  Database,
  UserCheck,
  RefreshCw,
  Sparkles,
  Search,
  Tag,
  DollarSign,
  Layers,
  Image as ImageIcon,
  Key,
  History,
  BarChart2,
  Command,
  Sun,
  Moon,
  Terminal,
  Eye,
  EyeOff
} from 'lucide-react';
import { ExtensionMessage, ExtensionResponse, ProductPayload } from '../types';
import { CONFIG } from '../config';
import { ENVIRONMENTS } from '../config/environments';
import { extensionStorage } from '../services/storage';
import { logger } from '../services/logger';
import { BulkImportTab } from './components/BulkImportTab';

interface TabInfo {
  url: string;
  title: string;
  isAmazon: boolean;
  contentScriptLoaded: boolean;
}

export default function Popup() {
  const [tabInfo, setTabInfo] = useState<TabInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapedProduct, setScrapedProduct] = useState<ProductPayload | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  
  // Settings & Connection States
  const [apiUrl, setApiUrl] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [pairingCodeInput, setPairingCodeInput] = useState<string>('');
  const [pairingLoading, setPairingLoading] = useState<boolean>(false);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [environment, setEnvironment] = useState<'Development' | 'Staging' | 'Production' | 'Custom'>('Production');
  const [debugMode, setDebugMode] = useState<boolean>(true);
  const [extVersion, setExtVersion] = useState<string>('1.0.0');
  const [features, setFeatures] = useState<any>({});
  
  // Customization States
  const [affiliateTag, setAffiliateTag] = useState<string>('gadgetsprohub-21');
  const [supportedDomains, setSupportedDomains] = useState<string>('amazon.com, amazon.in, amazon.co.uk, amazon.ca');
  const [popupWidth, setPopupWidth] = useState<number>(360);
  const [popupHeight, setPopupHeight] = useState<number>(420);
  const [showSettings, setShowSettings] = useState(false);
  const [showDevMode, setShowDevMode] = useState(false);
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [devModeLogs, setDevModeLogs] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);
  const [expiryWarning, setExpiryWarning] = useState<string | null>(null);

  // Tab Views
  const [activeTab, setActiveTab] = useState<'scraper' | 'bulk' | 'history' | 'analytics'>('scraper');

  // Duplicate Strategy Dialog States
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [, setDuplicateProductInfo] = useState<any>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<'skip' | 'update' | 'merge' | 'replace'>('update');
  const [overwriteDescription, setOverwriteDescription] = useState(false);
  const [overwriteImages, setOverwriteImages] = useState(false);

  // Import History States
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [historySearch, setHistorySearch] = useState('');
  const [historyResultFilter, setHistoryResultFilter] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Import Analytics States
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Theme & Command Palette States
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

  const fetchHistory = (page = 1, search = '', result = '') => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;
    setLoadingHistory(true);
    chrome.runtime.sendMessage({
      action: 'GET_IMPORT_HISTORY',
      payload: { page, limit: 5, search, result }
    }, (res) => {
      setLoadingHistory(false);
      if (res && res.success && res.data && res.data.success) {
        setHistoryLogs(res.data.data);
        setHistoryTotal(res.data.pagination.total);
        setHistoryPages(res.data.pagination.pages);
        setHistoryPage(res.data.pagination.page);
      }
    });
  };

  const fetchAnalytics = () => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;
    setLoadingAnalytics(true);
    chrome.runtime.sendMessage({
      action: 'GET_IMPORT_ANALYTICS'
    }, (res) => {
      setLoadingAnalytics(false);
      if (res && res.success && res.data && res.data.success) {
        setAnalytics(res.data.data);
      }
    });
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'history') {
        fetchHistory(1, historySearch, historyResultFilter);
      } else if (activeTab === 'analytics') {
        fetchAnalytics();
      }
    }
  }, [activeTab, isAuthenticated]);

  // Administrative login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Checks the active token expiration time and posts warnings
  const checkTokenExpiry = (expiresAt: number | null) => {
    if (!expiresAt) {
      setExpiryWarning(null);
      return;
    }
    const timeLeft = expiresAt - Date.now();
    if (timeLeft <= 0) {
      setExpiryWarning('Your login session has expired. Please log in again.');
      setIsAuthenticated(false);
      setAuthToken('');
      setTokenExpiresAt(null);
      extensionStorage.updateSettings({ authToken: null, tokenExpiresAt: null });
    } else if (timeLeft < 5 * 60 * 1000) {
      const minutesLeft = Math.ceil(timeLeft / 60000);
      setExpiryWarning(`Your login session will expire in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}. Please log in again soon.`);
    } else {
      setExpiryWarning(null);
    }
  };

  // Checks the active browser tab's status via message passing
  const checkCurrentTab = () => {
    setLoading(true);
    setImportSuccess(false);
    setScrapedProduct(null);
    setStatusMessage(null);
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Probe active tab via background coordinator
      chrome.runtime.sendMessage({ action: "PING_CONTENT_SCRIPT" }, (response: ExtensionResponse) => {
        if (response && response.success && response.data) {
          const data = response.data;
          setTabInfo({
            url: data.url || "",
            title: data.title || "",
            isAmazon: data.isAmazon || false,
            contentScriptLoaded: data.contentScriptLoaded !== false
          });
        } else {
          setTabInfo({
            url: "",
            title: "",
            isAmazon: false,
            contentScriptLoaded: false
          });
        }
        setLoading(false);
      });
    } else {
      // Offline fallback state for development environments & compilation validation
      setTimeout(() => {
        setTabInfo({
          url: "https://www.amazon.com/dp/B0CXF2K8Z7",
          title: "Apple iPhone 15 Pro Max (256GB, Blue Titanium)",
          isAmazon: true,
          contentScriptLoaded: true
        });
        setLoading(false);
      }, 600);
    }
  };

  // Loads settings & verifies remote session connectivity
  const initSession = async () => {
    const settings = await extensionStorage.getSettings();
    
    setApiUrl(settings.apiBaseUrl);
    setAuthToken(settings.authToken || '');
    setAdminEmail(settings.adminEmail || '');
    setEnvironment(settings.environment);
    setDebugMode(settings.debugMode);
    setExtVersion(settings.version);
    setFeatures(settings.features || {});
    setTokenExpiresAt(settings.tokenExpiresAt || null);
    checkTokenExpiry(settings.tokenExpiresAt || null);

    // Load custom configuration fields
    setAffiliateTag(settings.affiliateTag || 'gadgetsprohub-21');
    setSupportedDomains((settings.supportedDomains || ['amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.ca']).join(', '));
    setPopupWidth(settings.popupWidth || 360);
    setPopupHeight(settings.popupHeight || 420);

    if (settings.authToken) {
      verifyRemoteSession();
    }
  };

  useEffect(() => {
    if (popupWidth) {
      document.documentElement.style.width = `${popupWidth}px`;
      document.body.style.width = `${popupWidth}px`;
    }
  }, [popupWidth]);

  useEffect(() => {
    if (popupHeight) {
      document.documentElement.style.minHeight = `${popupHeight}px`;
      document.body.style.minHeight = `${popupHeight}px`;
    }
  }, [popupHeight]);

  const verifyRemoteSession = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: "GET_SESSION_STATUS" }, (response: ExtensionResponse) => {
        if (response && response.success && response.data) {
          const session = response.data;
          setIsAuthenticated(session.isAuthenticated);
          if (session.email) {
            setAdminEmail(session.email);
            extensionStorage.updateSettings({ adminEmail: session.email });
          }
        } else {
          setIsAuthenticated(false);
        }
      });
    } else {
      // Standalone web preview or test mode: dynamically read the secure persisted settings
      extensionStorage.getSettings().then((settings) => {
        if (settings.authToken && settings.adminEmail) {
          setIsAuthenticated(true);
          setAdminEmail(settings.adminEmail);
        } else {
          setIsAuthenticated(false);
        }
      }).catch(() => {
        setIsAuthenticated(false);
      });
    }
  };

  const runHealthCheck = async () => {
    setShowHealthCheck(true);
    setHealthStatus({ status: 'checking' });
    try {
      const sanitizedUrl = apiUrl ? apiUrl.replace(/\/$/, '') : '';
      const response = await fetch(`${sanitizedUrl}/api/health-check`);
      if (response.ok) {
        const data = await response.json();
        setHealthStatus({ status: 'ok', backendVersion: data.version || 'Unknown', env: environment });
      } else {
        setHealthStatus({ status: 'error', message: 'Backend returned an error' });
      }
    } catch (e: any) {
      setHealthStatus({ status: 'error', message: e.message });
    }
  };

  useEffect(() => {
    initSession();
    checkCurrentTab();

    const handleStorageChange = async (changes: any, areaName: string) => {
      if ((areaName === 'local' && changes.gph_settings) || (areaName === 'session' && changes.gph_auth_token)) {
        const settings = await extensionStorage.getSettings();
        if (settings) {
          setApiUrl(settings.apiBaseUrl);
          setAuthToken(settings.authToken || '');
          setAdminEmail(settings.adminEmail || '');
          setEnvironment(settings.environment);
          setDebugMode(settings.debugMode);
          setExtVersion(settings.version);
          setFeatures(settings.features || {});
          setTokenExpiresAt(settings.tokenExpiresAt || null);
          checkTokenExpiry(settings.tokenExpiresAt || null);
          
          setAffiliateTag(settings.affiliateTag || 'gadgetsprohub-21');
          setSupportedDomains((settings.supportedDomains || ['amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.ca']).join(', '));
          setPopupWidth(settings.popupWidth || 360);
          setPopupHeight(settings.popupHeight || 420);

          if (settings.authToken) {
            verifyRemoteSession();
          } else {
            setIsAuthenticated(false);
          }
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
    return () => {};
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Command Palette: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      
      // Close command palette on Escape
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }

      // Quick tab switching: Alt + 1, 2, 3, 4 (3 & 4 gated on auth)
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setActiveTab('scraper');
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        setActiveTab('bulk');
      }
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        if (isAuthenticated) setActiveTab('history');
      }
      if (e.altKey && e.key === '4') {
        e.preventDefault();
        if (isAuthenticated) setActiveTab('analytics');
      }

      // Toggle Theme: Alt + T
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setTheme(prev => {
          const next = prev === 'dark' ? 'light' : 'dark';
          extensionStorage.set('gph_theme', next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Load initial theme
    extensionStorage.get<'light' | 'dark'>('gph_theme', 'dark').then(savedTheme => {
      if (savedTheme) {
        setTheme(savedTheme);
      }
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      checkTokenExpiry(tokenExpiresAt);
    }, 10000);
    return () => clearInterval(timer);
  }, [tokenExpiresAt]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setStatusMessage({ type: 'error', text: 'Please fill in both fields.' });
      return;
    }
    setLoginLoading(true);
    setStatusMessage(null);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'EXECUTE_LOGIN',
        payload: { email, password }
      }, (response: ExtensionResponse) => {
        setLoginLoading(false);
        if (response && response.success) {
          setIsAuthenticated(true);
          if (response.data?.email) {
            setAdminEmail(response.data.email);
          }
          setStatusMessage({ type: 'success', text: 'Successfully logged in as administrator!' });
          // Clear inputs
          setEmail('');
          setPassword('');
        } else {
          setStatusMessage({ type: 'error', text: response?.error?.message || 'Authentication failed.' });
        }
      });
    } else {
      setLoginLoading(false);
      setStatusMessage({ type: 'error', text: 'Chrome extension runtime environment is required for administrator login.' });
    }
  };

  const handleLogoutClick = () => {
    setStatusMessage(null);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'EXECUTE_LOGOUT' }, (response: ExtensionResponse) => {
        if (response && response.success) {
          setIsAuthenticated(false);
          setAdminEmail('');
          setAuthToken('');
          setStatusMessage({ type: 'success', text: 'Successfully logged out.' });
        } else {
          setStatusMessage({ type: 'error', text: response?.error?.message || 'Logout failed.' });
        }
      });
    } else {
      // Direct offline clearing
      setIsAuthenticated(false);
      setAdminEmail('');
      setAuthToken('');
      extensionStorage.updateSettings({
        authToken: null,
        adminEmail: null
      }).then(() => {
        setStatusMessage({ type: 'success', text: 'Successfully logged out.' });
      });
    }
  };

  // Handle environment dropdown change
  const handleEnvChange = (env: 'Development' | 'Staging' | 'Production' | 'Custom') => {
    setEnvironment(env);
    if (env !== 'Custom') {
      const config = ENVIRONMENTS[env];
      setApiUrl(config.apiBaseUrl);
      setDebugMode(config.debugMode);
    }
  };

  // Update token or api url dynamically
  const saveSettings = async () => {
    try {
      const domainsArray = supportedDomains
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0);

      const updatedSettings = await extensionStorage.updateSettings({
        apiBaseUrl: apiUrl,
        authToken: authToken.trim() ? authToken : null,
        adminEmail: adminEmail.trim() ? adminEmail : null,
        environment: environment,
        debugMode: debugMode,
        version: extVersion,
        affiliateTag: affiliateTag.trim() || 'gadgetsprohub-21',
        supportedDomains: domainsArray,
        popupWidth: Number(popupWidth) || 360,
        popupHeight: Number(popupHeight) || 420
      });
      
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ 
          action: "SET_SESSION_TOKEN", 
          payload: { token: updatedSettings.authToken, email: updatedSettings.adminEmail } 
        });
      }
      
      setShowSettings(false);
      setStatusMessage({ type: 'success', text: 'Settings updated successfully!' });
      verifyRemoteSession();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to write settings: ' + err.message });
    }
  };

  const handlePairViaCode = async () => {
    if (pairingCodeInput.length !== 6) return;
    setPairingLoading(true);
    setStatusMessage(null);
    try {
      let targetApiUrl = apiUrl;
      if (environment !== 'Custom') {
        const config = ENVIRONMENTS[environment];
        targetApiUrl = config.apiBaseUrl;
      }
      
      const response = await fetch(`${targetApiUrl.replace(/\/$/, '')}/api/auth/pair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ pairingCode: pairingCodeInput })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setApiUrl(data.apiBaseUrl);
        setAuthToken(data.token);
        setAdminEmail(data.email);
        
        await extensionStorage.updateSettings({
          apiBaseUrl: data.apiBaseUrl,
          authToken: data.token,
          adminEmail: data.email,
          environment: 'Custom'
        });

        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ 
            action: "SET_SESSION_TOKEN", 
            payload: { token: data.token, email: data.email } 
          });
        }

        setIsAuthenticated(true);
        setPairingCodeInput('');
        setStatusMessage({ type: 'success', text: 'Extension successfully paired! You are now authenticated.' });
        setShowSettings(false);
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to pair. Please verify your pairing code and API URL.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Connection failed: ' + err.message });
    } finally {
      setPairingLoading(false);
    }
  };

  // Scrapes product information using content script DOM parser
  const handleScrapeProduct = () => {
    if (scraping || !tabInfo?.isAmazon) return;
    setScraping(true);
    setStatusMessage(null);

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id) {
          setScraping(false);
          setStatusMessage({ type: 'error', text: 'No active tab found' });
          return;
        }

        const msg: ExtensionMessage = { action: 'SCRAPE_AMAZON_PRODUCT' };
        chrome.tabs.sendMessage(activeTab.id, msg, (response: ExtensionResponse<ProductPayload>) => {
          setScraping(false);
          if (response && response.success && response.data) {
            setScrapedProduct(response.data);
            setStatusMessage({ type: 'success', text: 'Product parsed successfully! Review the extracted metadata.' });
          } else {
            const errorMsg = response?.error?.message || 'Content script failed to parse Amazon DOM. Please try reloading the Amazon tab.';
            logger.error('Scraping error response:', response);
            setStatusMessage({ type: 'error', text: errorMsg });
          }
        });
      });
    } else {
      // Offline mock parser for testing
      setTimeout(() => {
        setScraping(false);
        const mockProduct: ProductPayload = {
          name: "Apple iPhone 15 Pro Max (256GB, Blue Titanium)",
          brand: "Apple",
          asin: "B0CXF2K8Z7",
          currentPrice: 1199.00,
          originalPrice: 1299.00,
          discount: 8,
          currency: "USD",
          rating: 4.7,
          reviewCount: 3120,
          availability: true,
          description: "Stunning titanium design with powerful A17 Pro Chip and customizable Action Button.",
          bulletFeatures: [
            "FORGED IN TITANIUM — iPhone 15 Pro Max has a strong and light aerospace-grade titanium design.",
            "A17 PRO CHIP — A game-changing GPU delivers immersive gaming experiences and graphics.",
            "PRO CAMERA SYSTEM — Get incredible framing flexibility with 7 pro lenses."
          ],
          specifications: {
            "Model Name": "iPhone 15 Pro Max",
            "Storage Capacity": "256 GB",
            "Color": "Blue Titanium"
          },
          images: [
            "https://images-na.ssl-images-amazon.com/images/I/81+GIg6bOML._AC_SL1500_.jpg"
          ],
          productUrl: tabInfo?.url || "https://www.amazon.com/dp/B0CXF2K8Z7"
        };
        setScrapedProduct(mockProduct);
        setStatusMessage({ type: 'success', text: 'Parsed Mock product successfully!' });
      }, 1200);
    }
  };

  // Publishes extracted product payload directly to backend API
  const handleImport = () => {
    if (importing || !scrapedProduct) return;
    setImporting(true);
    setStatusMessage(null);

    let finalAffiliateLink = scrapedProduct.affiliateLink || scrapedProduct.productUrl || '';
    if (finalAffiliateLink && scrapedProduct.asin) {
      try {
        const urlObj = new URL(finalAffiliateLink);
        urlObj.searchParams.set('tag', affiliateTag);
        finalAffiliateLink = urlObj.toString();
      } catch (e) {
        // Fallback
      }
    }
    const importPayload = { ...scrapedProduct, affiliateLink: finalAffiliateLink };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const msg: ExtensionMessage = {
        action: 'EXECUTE_PRODUCT_IMPORT',
        payload: importPayload
      };
      
      chrome.runtime.sendMessage(msg, (response: ExtensionResponse) => {
        setImporting(false);
        if (response && response.success) {
          setImportSuccess(true);
          setScrapedProduct(null);
          setStatusMessage({ type: 'success', text: 'Successfully registered product on GadgetsProHub!' });
          extensionStorage.set(CONFIG.STORAGE_KEYS.LAST_IMPORTED_ASIN, scrapedProduct.asin);
        } else {
          const errorDetails = response?.error?.details;
          if (response?.error?.code === 'DUPLICATE_ASIN' || errorDetails?.code === 'DUPLICATE_ASIN' || (response?.error?.message && response.error.message.includes('already exists'))) {
            setDuplicateProductInfo(errorDetails?.existingProduct || { name: scrapedProduct.name });
            setShowDuplicateDialog(true);
            setStatusMessage({ type: 'info', text: 'Duplicate product detected. Please choose how to handle it below.' });
          } else {
            const errMsg = response?.error?.message || 'Remote database rejected product import.';
            setStatusMessage({ type: 'error', text: errMsg });
          }
        }
      });
    } else {
      // Offline fallback simulator
      setTimeout(() => {
        setImporting(false);
        setImportSuccess(true);
        setScrapedProduct(null);
        setStatusMessage({ type: 'success', text: 'Product registered successfully (Simulation Mode).' });
      }, 1500);
    }
  };

  // Resolves duplicates using selected strategy and options
  const handleApplyDuplicateStrategy = () => {
    if (importing || !scrapedProduct) return;
    setImporting(true);
    setShowDuplicateDialog(false);
    setStatusMessage(null);

    let finalAffiliateLink = scrapedProduct.affiliateLink || scrapedProduct.productUrl || '';
    if (finalAffiliateLink && scrapedProduct.asin) {
      try {
        const urlObj = new URL(finalAffiliateLink);
        urlObj.searchParams.set('tag', affiliateTag);
        finalAffiliateLink = urlObj.toString();
      } catch (e) {
        // Fallback
      }
    }
    const importPayload = { ...scrapedProduct, affiliateLink: finalAffiliateLink };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const msg: ExtensionMessage = {
        action: 'EXECUTE_PRODUCT_IMPORT',
        payload: {
          product: importPayload,
          strategy: selectedStrategy,
          options: {
            overwriteDescription,
            overwriteImages
          }
        }
      };
      
      chrome.runtime.sendMessage(msg, (response: ExtensionResponse) => {
        setImporting(false);
        if (response && response.success) {
          setImportSuccess(true);
          setScrapedProduct(null);
          setStatusMessage({ 
            type: 'success', 
            text: `Resolved duplicate successfully using strategy: ${selectedStrategy.toUpperCase()}!` 
          });
          extensionStorage.set(CONFIG.STORAGE_KEYS.LAST_IMPORTED_ASIN, scrapedProduct.asin);
        } else {
          const errMsg = response?.error?.message || 'Remote database rejected duplicate strategy resolution.';
          setStatusMessage({ type: 'error', text: errMsg });
        }
      });
    } else {
      setTimeout(() => {
        setImporting(false);
        setImportSuccess(true);
        setScrapedProduct(null);
        setStatusMessage({ 
          type: 'success', 
          text: `Resolved duplicate via simulated strategy: ${selectedStrategy.toUpperCase()}!` 
        });
      }, 1500);
    }
  };

  const handleTestParser = () => {
    setDevModeLogs('Running parser test...');
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id) {
          chrome.tabs.sendMessage(activeTab.id, { action: 'TEST_PARSER' }, (res) => {
            if (res?.success) {
               setDevModeLogs(JSON.stringify(res.data, null, 2));
            } else {
               setDevModeLogs(`Error: ${JSON.stringify(res?.error || 'Unknown error')}`);
            }
          });
        }
      });
    }
  };

  return (
    <div className={`flex flex-col min-h-[420px] transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* HEADER BAR */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white shadow-sm border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-violet-600 rounded-lg">
            <Laptop className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">GadgetsProHub</h1>
            <p className="text-[10px] text-slate-400">Affiliate Portal v1.0.0</p>
          </div>
        </div>
        
        {/* Settings Toggle & Connection Indicator */}
        <div className="flex items-center space-x-2">
          {features?.enableHealthCheck && (
            <button 
              onClick={() => { setShowHealthCheck(!showHealthCheck); setShowSettings(false); setShowDevMode(false); if (!showHealthCheck) runHealthCheck(); }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Health Check"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {features?.enableDeveloperMode && (
            <button 
              onClick={() => { setShowDevMode(!showDevMode); setShowSettings(false); setShowHealthCheck(false); }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Developer Mode"
            >
              <Database className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => { setShowSettings(!showSettings); setShowDevMode(false); setShowHealthCheck(false); }}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Configure connection settings"
          >
            <Key className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setTheme(prev => {
              const next = prev === 'dark' ? 'light' : 'dark';
              extensionStorage.set('gph_theme', next);
              return next;
            })}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme (Alt+T)`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={() => setShowCommandPalette(prev => !prev)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Command Palette (Ctrl+K)"
          >
            <Command className="w-4 h-4 text-indigo-400" />
          </button>
          
          <div className="flex items-center space-x-1.5 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
            <span className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="text-[9px] font-mono text-slate-300">
              {isAuthenticated ? "SSO ACTIVE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </header>

      {/* SESSION EXPIRATION WARNING BANNER */}
      {expiryWarning && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-2.5 text-[11px] text-amber-800 flex items-start gap-1.5 font-medium animate-fade-in shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>{expiryWarning}</span>
        </div>
      )}

      {/* TAB SELECTOR */}
      {isAuthenticated && !showHealthCheck && !showDevMode && !showSettings && (
        <div className="flex border-b border-slate-200 bg-white px-2 pt-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('scraper')}
            className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'scraper'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Scraper
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Analytics
          </button>
        </div>
      )}

      {/* DUPLICATE STRATEGY DIALOG */}
      {showDuplicateDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-[340px] w-full p-4 space-y-4 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">Duplicate Product Found</h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  ASIN <span className="font-mono font-bold text-slate-700">{scrapedProduct?.asin}</span> already exists. Select an overwrite strategy:
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {/* Strategy Selector */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Strategy</label>
                <select
                  value={selectedStrategy}
                  onChange={(e: any) => setSelectedStrategy(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs bg-white font-medium focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="skip">Skip (Do Nothing)</option>
                  <option value="update">Update (Incremental Fields)</option>
                  <option value="merge">Merge (Fill Missing Fields)</option>
                  <option value="replace">Force Replace (Overwrite All)</option>
                </select>
              </div>

              {/* Conditional Options for 'update' or 'replace' */}
              {(selectedStrategy === 'update' || selectedStrategy === 'replace') && (
                <div className="space-y-2 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="overwriteDesc"
                      checked={overwriteDescription}
                      onChange={(e) => setOverwriteDescription(e.target.checked)}
                      className="rounded text-violet-600 focus:ring-violet-500 cursor-pointer w-3.5 h-3.5"
                    />
                    <label htmlFor="overwriteDesc" className="text-[11px] font-medium text-slate-600 cursor-pointer">
                      Overwrite custom description
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="overwriteImg"
                      checked={overwriteImages}
                      onChange={(e) => setOverwriteImages(e.target.checked)}
                      className="rounded text-violet-600 focus:ring-violet-500 cursor-pointer w-3.5 h-3.5"
                    />
                    <label htmlFor="overwriteImg" className="text-[11px] font-medium text-slate-600 cursor-pointer">
                      Overwrite curated images
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={handleApplyDuplicateStrategy}
                disabled={importing}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg font-semibold shadow-xs transition duration-150 flex items-center justify-center gap-1"
              >
                {importing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Resolve Duplicate</span>
              </button>
              <button
                onClick={() => { setShowDuplicateDialog(false); setStatusMessage(null); }}
                className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CORE DISPLAY STAGE */}
      <main className="flex-1 p-4 flex flex-col justify-between">
        
        {showHealthCheck ? (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                System Health Check
              </span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Backend Connectivity</span>
                {healthStatus?.status === 'checking' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" /> : 
                 healthStatus?.status === 'ok' ? <span className="text-emerald-600 font-semibold">OK</span> : 
                 <span className="text-rose-600 font-semibold">Error</span>}
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Auth Status</span>
                <span className={isAuthenticated ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>{isAuthenticated ? 'Authenticated' : 'Offline / Guest'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Environment</span>
                <span className="text-slate-800 font-mono">{environment}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Extension Version</span>
                <span className="text-slate-800 font-mono">v{extVersion}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Backend Version</span>
                <span className="text-slate-800 font-mono">{healthStatus?.backendVersion || '-'}</span>
              </div>
              {healthStatus?.status === 'error' && (
                 <div className="p-2 bg-rose-50 text-rose-800 text-[10px] rounded border border-rose-100 mt-2">
                   {healthStatus.message}
                 </div>
              )}
            </div>
            <button onClick={runHealthCheck} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded text-xs transition-colors">
              Run Again
            </button>
          </div>
        ) : showDevMode ? (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3.5 max-h-[300px] overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Database className="w-4 h-4 text-violet-600" />
                Developer Mode
              </span>
            </h3>
            <div className="flex gap-2 mb-2">
               <button onClick={handleTestParser} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-1.5 rounded text-xs transition-colors">
                 Test Parser
               </button>
               <button onClick={() => {
                 if (scrapedProduct) {
                   setDevModeLogs(JSON.stringify(scrapedProduct, null, 2));
                 } else {
                   setDevModeLogs('No product extracted yet.');
                 }
               }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded text-xs transition-colors">
                 View Extracted JSON
               </button>
            </div>
            {devModeLogs && (
              <div className="relative">
                <pre className="bg-slate-900 text-slate-300 p-2 rounded text-[9px] font-mono overflow-x-auto whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                  {devModeLogs}
                </pre>
                <button 
                  onClick={() => navigator.clipboard.writeText(devModeLogs)}
                  className="absolute top-1 right-1 bg-slate-800 text-slate-400 hover:text-white p-1 rounded text-[10px]"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        ) : showSettings ? (
          /* SETTINGS CARD */
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3.5 text-slate-800">
            <h3 className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Key className="w-4 h-4 text-violet-600" />
                Settings & API Connection
              </span>
              <span className="text-[9px] font-mono text-slate-400 font-normal">v{extVersion}</span>
            </h3>

            {/* FAST-PAIR VIA CODE */}
            <div className="p-3 bg-violet-50 border border-violet-100 rounded-lg space-y-2">
              <label className="block text-[10px] font-bold text-violet-700 uppercase tracking-wider">Fast-Pair via 6-Digit Code</label>
              <p className="text-[10px] text-slate-500 leading-normal">
                Go to the Admin Portal Importer tab and copy the pairing code, then paste it here:
              </p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={pairingCodeInput}
                  onChange={(e) => setPairingCodeInput(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-2.5 py-1.5 rounded border border-violet-200 text-center font-mono text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 text-slate-800"
                />
                <button
                  type="button"
                  onClick={handlePairViaCode}
                  disabled={pairingCodeInput.length !== 6 || pairingLoading}
                  className="px-3 py-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 text-white font-bold rounded text-[11px] transition-colors shadow-xs"
                >
                  {pairingLoading ? 'Pairing...' : 'Pair'}
                </button>
              </div>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Environment</label>
                <select
                  value={environment}
                  onChange={(e) => handleEnvChange(e.target.value as any)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 text-[11px] bg-slate-50 font-medium focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="Development">Development (Localhost)</option>
                  <option value="Staging">Staging (AIS Pre-Prod)</option>
                  <option value="Production">Production (Render)</option>
                  <option value="Custom">Custom Override</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">API Base URL</label>
                <input 
                  type="text" 
                  value={apiUrl}
                  disabled={environment !== 'Custom'}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://your-api-endpoint.com"
                  className={`w-full px-2.5 py-1.5 rounded border font-mono text-[11px] focus:outline-none focus:border-violet-500 transition-colors ${
                    environment !== 'Custom' ? 'bg-slate-50 text-slate-500 border-slate-150 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-800'
                  }`} 
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Admin JWT Token</label>
                  <button 
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none flex items-center gap-1 text-[10px] transition-colors"
                  >
                    {showToken ? <EyeOff size={12} /> : <Eye size={12} />}
                    <span>{showToken ? "Mask" : "Reveal"}</span>
                  </button>
                </div>
                <textarea 
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  rows={2}
                  placeholder="Paste your admin web session JWT"
                  style={{ WebkitTextSecurity: showToken ? 'none' : 'disc' } as React.CSSProperties}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 font-mono text-[10px] focus:outline-none focus:border-violet-500 bg-white text-slate-800" 
                />
              </div>

              <div className="flex items-center space-x-2 pt-0.5">
                <input 
                  type="checkbox" 
                  id="debugMode"
                  checked={debugMode}
                  disabled={environment !== 'Custom'}
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className={`rounded text-violet-600 focus:ring-violet-500 ${environment !== 'Custom' ? 'cursor-not-allowed text-slate-400 bg-slate-100' : 'cursor-pointer'}`}
                />
                <label htmlFor="debugMode" className="text-[10px] font-medium text-slate-500 uppercase tracking-wider select-none cursor-pointer">
                  Debug Mode {environment !== 'Custom' && <span className="text-[9px] text-slate-400 font-normal italic lowercase">(Locked by Env)</span>}
                </label>
              </div>

              <div className="border-t border-slate-150 pt-3 mt-3 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Tag size={12} className="text-slate-400" />
                  Customization
                </h4>

                <div>
                  <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Affiliate Tag</label>
                  <input 
                    type="text" 
                    value={affiliateTag}
                    onChange={(e) => setAffiliateTag(e.target.value)}
                    placeholder="gadgetsprohub-21"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-[11px] bg-white text-slate-800 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Supported Amazon Domains</label>
                  <input 
                    type="text" 
                    value={supportedDomains}
                    onChange={(e) => setSupportedDomains(e.target.value)}
                    placeholder="amazon.com, amazon.in, amazon.co.uk, amazon.ca"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-[11px] bg-white text-slate-800 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Popup Width (px)</label>
                    <input 
                      type="number" 
                      min={300}
                      max={800}
                      value={popupWidth}
                      onChange={(e) => setPopupWidth(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-[11px] bg-white text-slate-800 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Popup Height (px)</label>
                    <input 
                      type="number" 
                      min={300}
                      max={600}
                      value={popupHeight}
                      onChange={(e) => setPopupHeight(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-[11px] bg-white text-slate-800 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={saveSettings}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
              >
                Save Configuration
              </button>
              <button 
                onClick={() => setShowSettings(false)}
                className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : loading ? (
          /* LOADER */
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-violet-600 animate-spin mb-2" />
            <p className="text-xs text-slate-500">Evaluating active tab environment...</p>
          </div>
        ) : !isAuthenticated ? (
          /* ADMINISTRATIVE LOGIN CARD */
          <form onSubmit={handleLoginSubmit} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
            <div className="text-center space-y-1">
              <div className="inline-flex p-2 bg-violet-50 text-violet-600 rounded-full">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Administrator Sign In</h3>
              <p className="text-[11px] text-slate-500">Authorized personnel only. Product imports require credentials.</p>
            </div>

            {statusMessage && (
              <div className={`p-2.5 rounded-lg text-[11px] border ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-100 text-rose-800'
                  : 'bg-blue-50 border-blue-100 text-blue-800'
              }`}>
                {statusMessage.text}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gadgetsprohub.com"
                  className="w-full px-3 py-2 rounded border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-violet-500 transition-colors" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-violet-500 transition-colors" 
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loginLoading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2 px-4 rounded-lg text-xs font-semibold shadow-xs transition duration-150 flex items-center justify-center space-x-2"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In Securely</span>
              )}
            </button>
          </form>
        ) : activeTab === 'scraper' ? (
          /* ACTIVE CARD FLOW */
          <div className="space-y-4">
            
            {/* CURRENT BROWSER STATE CARD */}
            <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Active Browser Tab
                </span>
                <button 
                  onClick={checkCurrentTab}
                  className="text-violet-600 hover:text-violet-800 flex items-center gap-0.5"
                  title="Rescan current page"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>

              <div className="space-y-1">
                <h2 className="text-xs font-semibold text-slate-800 line-clamp-1" title={tabInfo?.title}>
                  {tabInfo?.title || "No page loaded"}
                </h2>
                <p className="text-[10px] text-slate-500 truncate font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  {tabInfo?.url || "chrome://newtab/"}
                </p>
              </div>
            </div>

            {/* DYNAMIC MESSAGE STATUS FLOATER */}
            {statusMessage && (
              <div className={`p-2.5 rounded-lg text-[11px] border ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-100 text-rose-800'
                  : 'bg-blue-50 border-blue-100 text-blue-800'
              }`}>
                {statusMessage.text}
              </div>
            )}

            {/* SCRAPED PRODUCT REVIEW FORM */}
            {scrapedProduct ? (
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-sm max-h-[220px] overflow-y-auto">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Tag className="w-4 h-4 text-violet-600" />
                  Review Scraped Details
                </h3>

                <div className="space-y-2 text-[11px]">
                  <div className="border-b border-slate-100 pb-1.5">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Product Title</span>
                    <span className="text-slate-800 font-medium line-clamp-2">{scrapedProduct.name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide block">ASIN / ID</span>
                      <span className="text-slate-800 font-mono">{scrapedProduct.asin}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Brand</span>
                      <span className="text-slate-800 font-medium">{scrapedProduct.brand}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded border border-slate-100">
                    <div>
                      <span className="text-[9px] text-slate-400 block">List Price</span>
                      <span className="text-slate-800 font-semibold font-mono flex items-center gap-0.5">
                        <DollarSign className="w-2.5 h-2.5 text-slate-400" />
                        {scrapedProduct.originalPrice}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">Sale Price</span>
                      <span className="text-violet-600 font-semibold font-mono flex items-center gap-0.5">
                        <DollarSign className="w-2.5 h-2.5 text-violet-400" />
                        {scrapedProduct.currentPrice}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">Savings</span>
                      <span className="text-emerald-600 font-semibold font-mono">{scrapedProduct.discount}% OFF</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-400" />
                      {Object.keys(scrapedProduct.specifications).length} specs parsed
                    </span>
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-slate-400" />
                      {scrapedProduct.images.length} images found
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Confirm & Import</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setScrapedProduct(null)}
                    disabled={importing}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg text-xs"
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : tabInfo?.isAmazon ? (
              /* IS AMAZON, NOT SCRAPED YET */
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 space-y-3.5">
                <div className="flex items-start space-x-2.5">
                  <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 mt-0.5">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-800">Amazon Page Detected</h3>
                    <p className="text-[11px] text-emerald-700 leading-relaxed mt-0.5">
                      Ready to extract electronics, hardware, or specifications from this page.
                    </p>
                  </div>
                </div>

                {importSuccess ? (
                  <div className="bg-white border border-emerald-200 rounded-lg p-3 text-center space-y-2 shadow-xs">
                    <p className="text-[11px] font-medium text-emerald-800 flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Product added successfully!
                    </p>
                    <button 
                      onClick={() => setImportSuccess(false)}
                      className="text-[10px] text-violet-600 hover:underline"
                    >
                      Import another product
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleScrapeProduct}
                    disabled={scraping}
                    className="w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-semibold text-xs transition duration-150 flex items-center justify-center space-x-2 shadow-sm"
                  >
                    {scraping ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Extracting DOM Content...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Add Product to My Website</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              /* NON-AMAZON FALLBACK */
              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 space-y-3">
                <div className="flex items-start space-x-2.5">
                  <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-800">Unsupported Website</h3>
                    <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">
                      Navigate to any active Amazon product detail page to import details into your affiliate store.
                    </p>
                  </div>
                </div>

                <a 
                  href="https://www.amazon.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 px-4 rounded-lg font-semibold text-xs transition duration-150 flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Browse Amazon Products</span>
                  <ExternalLink className="w-3 h-3 text-amber-100" />
                </a>
              </div>
            )}
            
          </div>
        
        ) : activeTab === 'bulk' ? (
          <BulkImportTab />

        ) : activeTab === 'history' ? (
          /* IMPORT HISTORY VIEW */
          <div className="space-y-3.5 flex-1 flex flex-col justify-between w-full">
            {/* SEARCH AND FILTER BAR */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    fetchHistory(1, e.target.value, historyResultFilter);
                  }}
                  placeholder="Search ASIN or title..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] focus:outline-none focus:border-violet-500 text-slate-800"
                />
              </div>
              <select
                value={historyResultFilter}
                onChange={(e) => {
                  setHistoryResultFilter(e.target.value);
                  fetchHistory(1, historySearch, e.target.value);
                }}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] bg-white text-slate-700 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="">All Results</option>
                <option value="success">Success</option>
                <option value="skip">Skipped</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* HISTORY LIST */}
            <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto space-y-2 pr-1">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <RefreshCw className="w-6 h-6 text-violet-600 animate-spin mb-1" />
                  <span className="text-[10px] text-slate-400">Querying logs...</span>
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-12 text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  No import attempts logged yet.
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div key={log._id || log.id || log.timestamp} className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-3xs flex items-start justify-between gap-2.5 hover:border-slate-200 transition">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{log.asin}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${
                          log.result === 'success' ? 'bg-emerald-50 text-emerald-700' :
                          log.result === 'skip' ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {log.result}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate max-w-[200px]" title={log.productName}>
                        {log.productName || 'Unnamed Product'}
                      </p>
                      {log.strategy && log.strategy !== 'create' && (
                        <p className="text-[9px] text-slate-400 italic">
                          Strategy: <span className="font-semibold uppercase text-violet-600">{log.strategy}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right text-[8px] text-slate-400 shrink-0 self-center">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* PAGINATION */}
            {historyPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 shrink-0">
                <button
                  disabled={historyPage === 1}
                  onClick={() => fetchHistory(historyPage - 1, historySearch, historyResultFilter)}
                  className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] hover:bg-slate-200 disabled:opacity-50 transition"
                >
                  Prev
                </button>
                <span className="text-[10px] text-slate-500">
                  Page <strong>{historyPage}</strong> of {historyPages}
                </span>
                <button
                  disabled={historyPage === historyPages}
                  onClick={() => fetchHistory(historyPage + 1, historySearch, historyResultFilter)}
                  className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] hover:bg-slate-200 disabled:opacity-50 transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          /* IMPORT ANALYTICS VIEW */
          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[300px] w-full">
            {loadingAnalytics ? (
              <div className="flex flex-col items-center justify-center py-16">
                <RefreshCw className="w-6 h-6 text-violet-600 animate-spin mb-2" />
                <span className="text-xs text-slate-500">Retrieving intelligence analytics...</span>
              </div>
            ) : !analytics ? (
              <div className="text-center py-12 text-slate-400">
                Failed to load analytics.
              </div>
            ) : (
              <div className="space-y-3 w-full">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-3xs">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Actions</span>
                    <strong className="block text-lg font-bold text-slate-800 font-mono mt-0.5">{analytics.totalImports}</strong>
                    <span className="text-[9px] text-slate-400 font-medium">pipeline requests</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-3xs">
                    <span className="block text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Successful</span>
                    <strong className="block text-lg font-bold text-emerald-600 font-mono mt-0.5">{analytics.successfulImports}</strong>
                    <span className="text-[9px] text-emerald-500/80 font-medium">imports complete</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-3xs">
                    <span className="block text-[9px] font-bold text-rose-500 uppercase tracking-wider">Failed</span>
                    <strong className="block text-lg font-bold text-rose-600 font-mono mt-0.5">{analytics.failedImports}</strong>
                    <span className="text-[9px] text-rose-500/80 font-medium">validation & API drops</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-3xs">
                    <span className="block text-[9px] font-bold text-amber-500 uppercase tracking-wider">Avg Response Time</span>
                    <strong className="block text-lg font-bold text-amber-600 font-mono mt-0.5">{Math.round(analytics.averageProcessingTimeMs || 45)}ms</strong>
                    <span className="text-[9px] text-amber-500/80 font-medium">pipeline latency</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-3xs space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex justify-between">
                    <span>Duplicate Strategy Metrics</span>
                    <span className="font-mono text-[9px] text-slate-400">{analytics.duplicateAttempts} attempts</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-1.5 text-center pt-0.5">
                    <div className="bg-slate-50 p-1.5 rounded">
                      <span className="block text-[8px] text-slate-400 font-bold">UPDATED</span>
                      <strong className="block text-xs font-mono text-slate-700">{analytics.updatedProducts}</strong>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded">
                      <span className="block text-[8px] text-slate-400 font-bold">MERGED</span>
                      <strong className="block text-xs font-mono text-slate-700">{analytics.mergedProducts}</strong>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded">
                      <span className="block text-[8px] text-slate-400 font-bold">SKIPPED</span>
                      <strong className="block text-xs font-mono text-slate-700">{analytics.skippedProducts}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      }

        {/* BOTTOM AUTHENTICATION/DB METADATA STRIP */}
        <div className="border-t border-slate-100 pt-3 mt-4 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
            <div className="flex items-center space-x-1">
              <UserCheck className={`w-3.5 h-3.5 ${isAuthenticated ? 'text-violet-600' : 'text-slate-400'}`} />
              <span>Session: <strong className="text-slate-700 truncate max-w-[110px] inline-block align-bottom">{isAuthenticated ? (adminEmail || "Admin") : "Guest"}</strong></span>
              {isAuthenticated && (
                <button 
                  onClick={handleLogoutClick}
                  className="ml-1.5 text-rose-500 hover:text-rose-700 font-semibold uppercase text-[9px] tracking-wide focus:outline-none"
                >
                  Logout
                </button>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <Database className="w-3.5 h-3.5 text-violet-600" />
              <span>Host: <strong className="text-slate-700 font-mono">Dev</strong></span>
            </div>
          </div>
        </div>

      </main>

      {/* COMMAND PALETTE OVERLAY */}
      {showCommandPalette && (() => {
        const commands = [
          { label: 'Switch to Product Scraper Tab', icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />, action: () => { setActiveTab('scraper'); setShowCommandPalette(false); } },
          { label: 'Switch to Bulk Import Queue Tab', icon: <Layers className="w-3.5 h-3.5 text-sky-400" />, action: () => { setActiveTab('bulk'); setShowCommandPalette(false); } },
          { label: 'Switch to Scraper History Tab', icon: <History className="w-3.5 h-3.5 text-amber-400" />, action: () => { setActiveTab('history'); setShowCommandPalette(false); } },
          { label: 'Switch to Scraper Analytics Tab', icon: <BarChart2 className="w-3.5 h-3.5 text-pink-400" />, action: () => { setActiveTab('analytics'); setShowCommandPalette(false); } },
          { label: `Toggle Visual Theme (Current: ${theme.toUpperCase()})`, icon: theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-yellow-400" /> : <Moon className="w-3.5 h-3.5 text-slate-400" />, action: () => { setTheme(prev => { const next = prev === 'dark' ? 'light' : 'dark'; extensionStorage.set('gph_theme', next); return next; }); setShowCommandPalette(false); } },
          { label: 'Open Server Connection Settings', icon: <Key className="w-3.5 h-3.5 text-violet-400" />, action: () => { setShowSettings(true); setShowDevMode(false); setShowHealthCheck(false); setShowCommandPalette(false); } },
          { label: 'Run Automated Health Diagnostics', icon: <CheckCircle className="w-3.5 h-3.5 text-teal-400" />, action: () => { setShowHealthCheck(true); setShowSettings(false); setShowDevMode(false); runHealthCheck(); setShowCommandPalette(false); } },
          { label: 'Trigger Active Browser Parser Scraping', icon: <Terminal className="w-3.5 h-3.5 text-rose-400" />, action: () => { checkCurrentTab(); setShowCommandPalette(false); } }
        ];
        const filteredCommands = commands.filter(cmd => cmd.label.toLowerCase().includes(commandSearch.toLowerCase()));

        return (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex flex-col p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[350px] overflow-hidden">
              <div className="flex items-center px-3 py-2.5 border-b border-slate-800">
                <Command className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Type a command or search action..."
                  autoFocus
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-100 outline-none placeholder-slate-500"
                />
                <button 
                  onClick={() => setShowCommandPalette(false)}
                  className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded hover:text-white"
                >
                  ESC
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                {filteredCommands.map((cmd, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={cmd.action}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-[11px] text-slate-300 hover:text-white hover:bg-indigo-950/40 border border-transparent hover:border-indigo-900/40 rounded-lg text-left transition cursor-pointer"
                  >
                    {cmd.icon}
                    <span className="flex-1">{cmd.label}</span>
                    <span className="text-[9px] text-slate-500 font-mono">⌘{i + 1}</span>
                  </button>
                ))}
                
                {filteredCommands.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs">No command matched your request. Try another term!</div>
                )}
              </div>
              
              <div className="bg-slate-950 px-3 py-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
                <span>Use shortcuts <strong className="text-indigo-400">Alt+1/2/3/4</strong> for tab switching</span>
                <span>Press <strong className="text-indigo-400">ESC</strong> to exit</span>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
