import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Product, Category, Blog, Message, User } from '../types';
import { Plus, Edit, Trash2, MailOpen, MailCheck, Coins, MousePointerClick, Mail, RefreshCcw, Database, TrendingUp, Globe, Users, ChevronDown, ChevronUp, Instagram, Linkedin, Download } from 'lucide-react';
import { useDeviceType } from '../hooks/useDeviceType';
import { TabErrorView } from '../components/admin/TabErrorView';
import { getDistrictEmoji } from '../utils/emoji';
import { mapErrorToFriendly } from '../utils/errorMapper';
import { apiFetch, clearApiCache } from '../utils/apiClient';
import { parseSpecificationsString } from '../utils/specParser';
import { generateSlug } from '../utils/slug';
import { TAMIL_NADU_DISTRICTS } from '../utils/districts';

const DEFAULT_AFFILIATE_CODE = '';
const BLANK_PROD_FORM = {
  name: '',
  slug: '',
  brand: '',
  price: '',
  originalPrice: '',
  discount: '',
  category: '',
  subcategory: '',
  description: '',
  longDescription: '',
  affiliateLink: '',
  affiliateCode: '',
  images: '',
  features: '',
  specKeyVal: '',
  pros: '',
  cons: '',
  inStock: true,
  trending: false,
  featured: false
};

import { AlertDialog } from '../components/admin/AlertDialog';
import { ConfirmDialog } from '../components/admin/ConfirmDialog';
import { N8nStatusIndicator } from '../components/admin/N8nStatusIndicator';
import { ExtensionImporter } from '../components/admin/ExtensionImporter';
import { MediaLibrary } from '../components/MediaLibrary';
import { SeoDashboard } from '../components/admin/SeoDashboard';
import AiContentDashboard from '../components/admin/AiContentDashboard';
import SyncDashboard from '../components/admin/SyncDashboard';
import { SecurityConsole } from '../components/admin/SecurityConsole';

interface AdminProps {
  onNavigate: (view: string, slug?: string) => void;
}

export const Admin: React.FC<AdminProps> = ({ onNavigate }) => {
  const { token, user, loading: authLoading } = useAuth();
  const { isMobile } = useDeviceType();
  const tabContainerRef = useRef<HTMLDivElement>(null);
  
  // Tab selector
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'blogs' | 'messages' | 'telemetry' | 'scheduler' | 'users' | 'security-logs' | 'importer' | 'media' | 'seo' | 'ai-content' | 'sync-dashboard' | 'security-console' | 'adsense-settings'>('products');
  
  // AdSense & Site Settings states
  const [siteSettingsForm, setSiteSettingsForm] = useState({
    adsenseClientId: 'ca-pub-1234567890123456',
    adsenseEnabled: true,
    headerBannerSlot: '6223881151',
    productDetailSlot: '7898031267',
    blogSlot: '1223904982',
    sidebarSlot: '9876543210',
    homeSlot: '6223881151',
    siteName: 'gadgetsprohub',
    supportEmail: 'support@gadgetsprohub.com'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);
  const [settingsErrorMsg, setSettingsErrorMsg] = useState<string | null>(null);
  const [messagesFilter, setMessagesFilter] = useState<'all' | 'unread'>('all');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [sentReplySuccess, setSentReplySuccess] = useState<string | null>(null);
  const [expandedVisitorId, setExpandedVisitorId] = useState<string | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Security audit trail States
  const [securityLogs, setSecurityLogs] = useState<Array<{ _id?: string; date?: string; userId?: string; user?: { name?: string; email?: string }; action?: string; ipAddress?: string; location?: string; details?: string; timestamp?: string | Date; adminEmail?: string; targetId?: string; userAgent?: string; id?: string }>>([]);
  const [securityLogsError, setSecurityLogsError] = useState<string | null>(null);
  
  // Sunday automation States
  const [sundayLogs, setSundayLogs] = useState<Array<{ _id?: string; sundayDate?: string; productsAdded?: Array<{ name?: string } | string>; status?: string; runType?: string; emailSent?: boolean }>>([]);
  const [sundayLogsError, setSundayLogsError] = useState<string | null>(null);
  const [simulatingSunday, setSimulatingSunday] = useState(false);
  
  // Resource Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab-specific Error states for robust fault-isolation
  const [productsError, setProductsError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [blogsError, setBlogsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');

  // Custom Dialog & Alert simulation to bypass iframe sandboxed confirm() and alert() restrictions
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDestructive: false
  });

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const requestConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: { confirmText?: string; cancelText?: string; isDestructive?: boolean }
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText: options?.confirmText || 'Confirm',
      cancelText: options?.cancelText || 'Cancel',
      isDestructive: options?.isDestructive ?? false
    });
  };

  const triggerAlert = (title: string, message: string) => {
    let finalTitle = title;
    let finalMessage = message;
    
    // Check if title or message indicates an error
    const isError = title.toLowerCase().includes('fail') || 
                    title.toLowerCase().includes('error') || 
                    message.toLowerCase().includes('fail') ||
                    message.toLowerCase().includes('error') ||
                    message.toLowerCase().includes('rejected') || 
                    message.toLowerCase().includes('invalid');
                    
    if (isError) {
      const friendly = mapErrorToFriendly(message);
      finalMessage = friendly.message;
      if (title === 'Error' || title === 'Action Failed' || title === 'Submission Failed' || title === 'Submission Error') {
        finalTitle = friendly.category || 'System Status';
      }
    }

    setAlertDialog({
      isOpen: true,
      title: finalTitle,
      message: finalMessage
    });
  };
  
  const [analyticsData, setAnalyticsData] = useState<Array<{ _id?: string; date?: string; activeVisitors?: number; platform?: string; bounceRate?: string; path?: string; sessionDuration?: string; event?: string; timestamp?: string | Date; pageUrl?: string; productId?: { name?: string }; browser?: string; device?: string; ipAddress?: string; stayDuration?: number; userId?: { name?: string; email?: string }; eventType?: string; timeSpent?: number; district?: string }>>([]);
  const [refreshingTraffic, setRefreshingTraffic] = useState(false);

  // Stats Counters
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalConversions: 0,
    estimatedEarnings: 0,
    unreadMessages: 0,
    totalVisitors: 0
  });

  const [districtStats, setDistrictStats] = useState<Record<string, number>>(() => {
    const stats: Record<string, number> = {};
    TAMIL_NADU_DISTRICTS.forEach(d => {
      stats[d] = 0;
    });
    return stats;
  });

  const [showAllDistricts, setShowAllDistricts] = useState(false);
  const [socialClicks, setSocialClicks] = useState({ instagram: 0, linkedin: 0 });

  const resolvedProducts = useMemo(() => {
    return products.map(p => ({
      ...p,
      clicks: p?.clicks || 0,
      conversions: p?.conversions || 0
    }));
  }, [products]);

  // Modals show control
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [autoCloseEditorial, setAutoCloseEditorial] = useState(true);
  const [modalFormTab, setModalFormTab] = useState<'basics' | 'dealsSpecs' | 'editorial'>('basics');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [isSubcatDropdownOpen, setIsSubcatDropdownOpen] = useState(false);

  // Form Fields for Products
  const [prodForm, setProdForm] = useState(BLANK_PROD_FORM);

  // Slug Checking state
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugCheckError, setSlugCheckError] = useState('');
  const [suggestedSlug, setSuggestedSlug] = useState('');
  const [slugVerified, setSlugVerified] = useState(false);

  useEffect(() => {
    const rawVal = prodForm.slug || prodForm.name;
    if (!rawVal || rawVal.trim().length < 3) {
      setSlugCheckError('');
      setSuggestedSlug('');
      setSlugChecking(false);
      setSlugVerified(false);
      return;
    }

    const proposed = generateSlug(rawVal);
    if (!proposed) {
      setSlugCheckError('');
      setSuggestedSlug('');
      setSlugChecking(false);
      setSlugVerified(false);
      return;
    }

    // Indicate that checking is in progress immediately upon changes (during the 500ms debounce window)
    setSlugChecking(true);
    setSlugVerified(false);
    setSlugCheckError('');
    setSuggestedSlug('');

    const delayDebounce = setTimeout(async () => {
      try {
        const excludeQuery = editingProduct ? `&excludeId=${editingProduct._id}` : '';
        const res = await apiFetch(`/api/admin/check-slug?slug=${encodeURIComponent(proposed)}&type=product${excludeQuery}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setSlugCheckError(`⚠️ This Web Link Name already exists.`);
            setSuggestedSlug(data.suggestedSlug);
            setSlugVerified(false);
          } else {
            setSlugCheckError('');
            setSuggestedSlug('');
            setSlugVerified(true);
          }
        }
      } catch (err) {
        console.warn('Silent slug checking failed:', err);
      } finally {
        setSlugChecking(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [prodForm.slug, prodForm.name, editingProduct, token]);

  // Form fields for categories/blogs
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catSlug, setCatSlug] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catSubcategories, setCatSubcategories] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form fields for manual blogs
  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogCategory, setBlogCategory] = useState('');
  const [blogExcerpt, setBlogExcerpt] = useState('');
  const [blogAuthor, setBlogAuthor] = useState('');
  const [blogFeaturedImage, setBlogFeaturedImage] = useState('');
  const [blogTags, setBlogTags] = useState('');
  const [blogPublished, setBlogPublished] = useState(true);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  // States for Security Logs Tab (declared at top-level to comply with Rules of Hooks)
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [securitySearchQuery, setSecuritySearchQuery] = useState<string>('');
  const [localLogsPage, setLocalLogsPage] = useState<number>(1);

  // Check Admin clearance
  useEffect(() => {
    if (authLoading) return; // Do not redirect while loading is pending
    
    const isAdminUser = user?.role === 'admin';

    if (!token || !isAdminUser) {
      onNavigate('home');
    }
  }, [token, user, authLoading]);

  // Fetch tab-specific data whenever activeTab, productPage, or token changes
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    loadAdminMetrics(controller.signal);
    return () => {
      controller.abort();
    };
  }, [token, activeTab, productPage]);



  const fetchSettings = useCallback(async () => {
    if (!token) return;
    try {
      setSettingsLoading(true);
      const res = await apiFetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSiteSettingsForm({
          adsenseClientId: data.data.adsenseClientId || 'ca-pub-1234567890123456',
          adsenseEnabled: data.data.adsenseEnabled !== undefined ? data.data.adsenseEnabled : true,
          headerBannerSlot: data.data.adsenseSlots?.headerBannerSlot || '6223881151',
          productDetailSlot: data.data.adsenseSlots?.productDetailSlot || '7898031267',
          blogSlot: data.data.adsenseSlots?.blogSlot || '1223904982',
          sidebarSlot: data.data.adsenseSlots?.sidebarSlot || '9876543210',
          homeSlot: data.data.adsenseSlots?.homeSlot || '6223881151',
          siteName: data.data.siteName || 'gadgetsprohub',
          supportEmail: data.data.supportEmail || 'support@gadgetsprohub.com'
        });
      }
    } catch (e: any) {
      setSettingsErrorMsg('Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'adsense-settings') {
      fetchSettings();
    }
  }, [activeTab, fetchSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccessMsg(null);
    setSettingsErrorMsg(null);
    setSettingsLoading(true);
    try {
      const res = await apiFetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adsenseClientId: siteSettingsForm.adsenseClientId,
          adsenseEnabled: siteSettingsForm.adsenseEnabled,
          adsenseSlots: {
            headerBannerSlot: siteSettingsForm.headerBannerSlot,
            productDetailSlot: siteSettingsForm.productDetailSlot,
            blogSlot: siteSettingsForm.blogSlot,
            sidebarSlot: siteSettingsForm.sidebarSlot,
            homeSlot: siteSettingsForm.homeSlot
          },
          siteName: siteSettingsForm.siteName,
          supportEmail: siteSettingsForm.supportEmail
        })
      });
      const json = await res.json();
      if (json.success) {
        setSettingsSuccessMsg(json.message || 'Settings saved successfully!');
        triggerAlert('Settings Saved', 'Site & AdSense settings saved and applied across the platform!');
      } else {
        setSettingsErrorMsg(json.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setSettingsErrorMsg(err.message || 'Error communicating with server');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Polling for general user list synchronization
  useEffect(() => {
    if (!token || activeTab !== 'users') return;

    const pollInterval = setInterval(async () => {
      try {
        const usersRes = await apiFetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (usersRes.ok) {
          const uData = await usersRes.json();
          setUsers(Array.isArray(uData) ? uData : (uData?.users || []));
        }
      } catch (err: unknown) {
        // silent catch
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [token, activeTab]);

  // Tab-specific modular data fetchers for optimal network performance
  const fetchOverviewData = async (signal?: AbortSignal) => {
    try {
      const [analyticsRes, msgRes, catRes] = await Promise.all([
        apiFetch('/api/admin/analytics', { signal }).catch(() => null),
        apiFetch('/api/admin/messages', { signal }).catch(() => null),
        apiFetch('/api/categories', { signal }).catch(() => null)
      ]);

      if (signal?.aborted) return;

      if (analyticsRes && analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalyticsData(aData.analytics || []);
        if (aData.socialClicks) setSocialClicks(aData.socialClicks);
        if (aData.districts) setDistrictStats(prev => ({ ...prev, ...(aData.districts || {}) }));

        const visitors = aData.summary?.visitors || 0;
        const clicks = aData.summary?.clicks || 0;
        const conversions = aData.summary?.conversions || 0;
        const estimated = (clicks > 0 || conversions > 0) ? Number((clicks * 0.08 + conversions * 4.5).toFixed(2)) : 0;

        setStats(prev => ({
          ...prev,
          totalVisitors: visitors,
          totalClicks: clicks,
          totalConversions: conversions,
          estimatedEarnings: estimated
        }));
      }

      if (msgRes && msgRes.ok) {
        const mData = await msgRes.json();
        const msgList = Array.isArray(mData) ? mData : [];
        setMessages(msgList);
        const unreads = msgList.filter((m: any) => !m?.read).length;
        setStats(prev => ({ ...prev, unreadMessages: unreads }));
      }

      if (catRes && catRes.ok) {
        const cData = await catRes.json();
        setCategories(Array.isArray(cData) ? cData : []);
      }
    } catch (err) {
      console.warn('Overview data fetch error:', err);
    }
  };

  const fetchProductsTabData = async (page: number, signal?: AbortSignal) => {
    setProductsError(null);
    try {
      const [res, catRes] = await Promise.all([
        apiFetch(`/api/products?page=${page}&limit=10`, { signal }),
        apiFetch('/api/categories', { signal }).catch(() => null)
      ]);
      if (signal?.aborted) return;

      if (res.ok) {
        const d = await res.json();
        if (signal?.aborted) return;
        const pData = d.products || [];
        setProducts(Array.isArray(pData) ? pData : []);
        setTotalProducts(d.total || (Array.isArray(pData) ? pData.length : 0));
        setTotalPages(d.pages || 1);
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (signal?.aborted) return;
        setProductsError(errJson.error || `Failed to fetch Catalog: Status ${res.status}`);
      }

      if (catRes && catRes.ok) {
        const cData = await catRes.json();
        setCategories(Array.isArray(cData) ? cData : []);
      }
    } catch (e: unknown) {
      if (signal?.aborted) return;
      const errorObj = e as { message?: string };
      setProductsError(errorObj.message || "Failed to connect to Catalog server.");
    }
  };

  const fetchCategoriesTabData = async (signal?: AbortSignal) => {
    setCategoriesError(null);
    try {
      const res = await apiFetch('/api/categories', { signal });
      if (signal?.aborted) return;
      if (res.ok) {
        const cData = await res.json();
        setCategories(Array.isArray(cData) ? cData : []);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setCategoriesError(errJson.error || `Failed to fetch Categories: Status ${res.status}`);
      }
    } catch (e: unknown) {
      if (signal?.aborted) return;
      setCategoriesError((e as any).message || "Failed to connect to Categories server.");
    }
  };

  const fetchBlogsTabData = async (signal?: AbortSignal) => {
    setBlogsError(null);
    try {
      const res = await apiFetch('/api/blogs', { signal });
      if (signal?.aborted) return;
      if (res.ok) {
        const d = await res.json();
        setBlogs(Array.isArray(d.blogs) ? d.blogs : (Array.isArray(d) ? d : []));
      } else {
        const errJson = await res.json().catch(() => ({}));
        setBlogsError(errJson.error || `Failed to fetch Manual Guides: Status ${res.status}`);
      }
    } catch (e: unknown) {
      if (signal?.aborted) return;
      setBlogsError((e as any).message || "Failed to connect to Manual Guides server.");
    }
  };

  const fetchMessagesTabData = async (signal?: AbortSignal) => {
    setMessagesError(null);
    try {
      const res = await apiFetch('/api/admin/messages', { signal });
      if (signal?.aborted) return;
      if (res.ok) {
        const mData = await res.json();
        const msgList = Array.isArray(mData) ? mData : [];
        setMessages(msgList);
        setStats(prev => ({ ...prev, unreadMessages: msgList.filter((m: any) => !m?.read).length }));
      } else {
        const errJson = await res.json().catch(() => ({}));
        setMessagesError(errJson.error || `Failed to fetch Messages: Status ${res.status}`);
      }
    } catch (e: unknown) {
      if (signal?.aborted) return;
      setMessagesError((e as any).message || "Failed to connect to Messages server.");
    }
  };

  const fetchAnalyticsTabData = async (signal?: AbortSignal) => {
    setTelemetryError(null);
    try {
      const res = await apiFetch('/api/admin/analytics', { signal });
      if (signal?.aborted) return;
      if (res.ok) {
        const aData = await res.json();
        setAnalyticsData(aData.analytics || []);
        if (aData.socialClicks) setSocialClicks(aData.socialClicks);
        if (aData.districts) setDistrictStats(prev => ({ ...prev, ...(aData.districts || {}) }));
      } else {
        const errJson = await res.json().catch(() => ({}));
        setTelemetryError(errJson.error || `Failed to fetch Traffic logs: Status ${res.status}`);
      }
    } catch (e: unknown) {
      if (signal?.aborted) return;
      setTelemetryError((e as any).message || "Failed to connect to Traffic Analytics server.");
    }
  };

  const fetchUsersTabData = async (signal?: AbortSignal) => {
    setUsersError(null);
    try {
      const res = await apiFetch('/api/admin/users', { signal });
      if (signal?.aborted) return;
      if (res.ok) {
        const uData = await res.json();
        setUsers(Array.isArray(uData) ? uData : (uData?.users || []));
      } else {
        const errData = await res.json().catch(() => ({}));
        setUsersError(errData.error || `Failed to fetch User Accounts: status ${res.status}`);
      }
    } catch (e: unknown) {
      if (signal?.aborted) return;
      setUsersError((e as any).message || "Failed to connect to User Accounts server.");
    }
  };

  const fetchSundayLogsTabData = async (signal?: AbortSignal) => {
    setSundayLogsError(null);
    try {
      const res = await apiFetch('/api/admin/sunday-logs', { signal });
      if (signal?.aborted) return;
      if (res.ok) {
        const logsData = await res.json();
        setSundayLogs(Array.isArray(logsData) ? logsData : (Array.isArray(logsData?.logs) ? logsData.logs : []));
      } else {
        const errData = await res.json().catch(() => ({}));
        setSundayLogsError(errData.error || `Failed to fetch Sunday Logs: status ${res.status}`);
      }
    } catch (err: unknown) {
      if (signal?.aborted) return;
      setSundayLogsError((err as any).message || 'Failed code connection for automated scheduler logs.');
    }
  };

  const fetchSecurityLogsTabData = async (signal?: AbortSignal) => {
    setSecurityLogsError(null);
    try {
      const res = await apiFetch('/api/admin/security-logs', { signal });
      if (signal?.aborted) return;
      if (res.ok) {
        const secData = await res.json();
        setSecurityLogs(Array.isArray(secData) ? secData : (Array.isArray(secData?.logs) ? secData.logs : (Array.isArray(secData?.data) ? secData.data : [])));
      } else {
        const errData = await res.json().catch(() => ({}));
        setSecurityLogsError(errData.error || `Failed to fetch Security Logs: status ${res.status}`);
      }
    } catch (err: unknown) {
      if (signal?.aborted) return;
      setSecurityLogsError((err as any).message || 'Failed code connection for security logs.');
    }
  };

  const loadAdminMetrics = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      await fetchOverviewData(signal);
      if (activeTab === 'products') await fetchProductsTabData(productPage, signal);
      else if (activeTab === 'categories') await fetchCategoriesTabData(signal);
      else if (activeTab === 'blogs') await fetchBlogsTabData(signal);
      else if (activeTab === 'messages') await fetchMessagesTabData(signal);
      else if (activeTab === 'telemetry') await fetchAnalyticsTabData(signal);
      else if (activeTab === 'scheduler') await fetchSundayLogsTabData(signal);
      else if (activeTab === 'users') await fetchUsersTabData(signal);
      else if (activeTab === 'security-logs') await fetchSecurityLogsTabData(signal);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const handleReloadTraffic = async () => {
    setRefreshingTraffic(true);
    try {
      await fetchAnalyticsTabData();
      await fetchOverviewData();
    } catch (err: unknown) {
      console.warn('Silent metrics reload error:', err);
    } finally {
      setRefreshingTraffic(false);
    }
  };

  const handleExportAnalyticsCSV = () => {
    if (!analyticsData || analyticsData.length === 0) {
      triggerAlert('Export Notice', 'No analytics or traffic log data is available to export.');
      return;
    }

    const headers = [
      'Record ID',
      'ISO Timestamp',
      'Formatted Date',
      'Event Type',
      'Visitor Name',
      'Visitor Email',
      'District / Location',
      'Target Page / Product',
      'Time Spent (seconds)',
      'Browser',
      'Device Type',
      'IP Address'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Neutralize leading Excel/Sheets formula injection triggers (=, +, -, @, \t, \r)
      if (/^[=\-+\@\t\r]/.test(str)) {
        str = "'" + str;
      }
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = analyticsData.map((item, idx) => {
      const recordId = item._id || `log_${idx + 1}`;
      const timestampIso = item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString();
      const formattedDate = item.timestamp ? new Date(item.timestamp).toLocaleString() : new Date().toLocaleString();
      
      let eventTypeLabel = item.eventType || 'page_visit';
      if (eventTypeLabel === 'page_visit') eventTypeLabel = 'Page View';
      else if (eventTypeLabel === 'click') eventTypeLabel = 'Store Link Click';
      else if (eventTypeLabel === 'conversion') eventTypeLabel = 'Affiliate Exit';
      else if (eventTypeLabel === 'view') eventTypeLabel = 'Product View';

      const visitorName = item.userId ? (item.userId.name || 'Explorer Member') : 'Guest Visitor';
      const visitorEmail = item.userId ? (item.userId.email || 'N/A') : 'N/A';
      const location = item.district || 'Unspecified';
      const target = item.eventType === 'page_visit' 
        ? (item.pageUrl || 'Home') 
        : (item.productId?.name || item.pageUrl || 'Product Item');
      
      const timeSpent = typeof item.timeSpent === 'number' 
        ? item.timeSpent 
        : (item.stayDuration || 0);
      
      const browser = item.browser || 'Chrome';
      const device = item.device || 'Desktop';
      const ip = item.ipAddress || 'N/A';

      return [
        recordId,
        timestampIso,
        formattedDate,
        eventTypeLabel,
        visitorName,
        visitorEmail,
        location,
        target,
        timeSpent,
        browser,
        device,
        ip
      ].map(escapeCsv).join(',');
    });

    const summaryHeader = [
      'ANALYTICS SUMMARY',
      `Total Visitors: ${stats.totalVisitors}`,
      `Total Clicks: ${stats.totalClicks}`,
      `Total Conversions: ${stats.totalConversions}`,
      `Estimated Earnings Projection (Flat Rate Model: ₹0.08/click, ₹4.5/conv): ₹${stats.estimatedEarnings}`,
      `Export Date: ${new Date().toLocaleString()}`
    ].map(escapeCsv).join(',');

    const csvContent = [
      summaryHeader,
      '',
      headers.join(','),
      ...rows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    triggerAlert('Report Exported Successfully', `Downloaded ${analyticsData.length} analytics records as a CSV report.`);
  };



  // Handle Mark Message read
  const handleMarkRead = async (msgId: string) => {
    try {
      const res = await apiFetch(`/api/admin/messages/read/${msgId}`, { method: 'POST' });
      if (res.ok) {
        clearApiCache();
        setMessages(prev => prev.map(m => m?._id === msgId ? { ...m, read: true } : m));
        setStats(prev => ({ ...prev, unreadMessages: Math.max(prev.unreadMessages - 1, 0) }));
      } else {
        const err = await res.json().catch(() => ({}));
        triggerAlert("Action Failed", err.error || "The server rejected the message status update request.");
      }
    } catch (e: unknown) {
      const errorObj = e as { message?: string };
      triggerAlert("Network Error", errorObj.message || "Failed to communicate with the message status update server.");
    }
  };

  // Helper specification mapping builders
  const parseSpecs = (specsStr: string) => {
    return parseSpecificationsString(specsStr);
  };

  // Dedicated save function with onSuccess callback trigger
  const saveProductApi = async (
    url: string,
    method: string,
    payload: any,
    onSuccess: () => void
  ) => {
    clearApiCache();
    const response = await apiFetch(url, {
      method,
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      clearApiCache();
      onSuccess();
    }
    return response;
  };

  // Create or Edit Product POST proxy handler
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prodForm.name || prodForm.name.trim().length === 0) {
      triggerAlert("Validation Error", "A valid product name is required.");
      return;
    }

    if (!prodForm.affiliateLink || (!prodForm.affiliateLink.startsWith('http://') && !prodForm.affiliateLink.startsWith('https://'))) {
      triggerAlert("Validation Error", "A valid affiliate URL starting with http:// or https:// is required.");
      return;
    }

    if (prodForm.affiliateLink.includes('B501...') || prodForm.affiliateLink.includes('example.com') || prodForm.affiliateLink.toLowerCase().includes('placeholder')) {
      triggerAlert("Validation Error", "Placeholder sample affiliate URLs are not allowed. Please enter a real product link.");
      return;
    }

    if (prodForm.affiliateCode === 'AFFIL_HUB_26') {
      triggerAlert("Validation Error", "Placeholder affiliate code AFFIL_HUB_26 is not allowed. Please enter a custom affiliate tracking code.");
      return;
    }

    const parsedPrice = parseFloat(prodForm.price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      triggerAlert("Validation Error", "A valid positive price is required.");
      return;
    }

    if (prodForm.originalPrice) {
      const parsedOrigPrice = parseFloat(prodForm.originalPrice);
      if (isNaN(parsedOrigPrice) || parsedOrigPrice < 0) {
        triggerAlert("Validation Error", "Original price cannot be negative.");
        return;
      }
    }

    const imagesList = prodForm.images
      .split(/[\n,;]+/)
      .map(img => img.trim())
      .filter(img => img.length > 0);

    if (imagesList.length === 0) {
      triggerAlert("Validation Error", "At least one product image URL is required.");
      return;
    }

    if (!prodForm.description || prodForm.description.trim().length === 0) {
      triggerAlert("Validation Error", "Short description is required.");
      return;
    }

    if (!prodForm.longDescription || prodForm.longDescription.trim().length === 0) {
      triggerAlert("Validation Error", "Long editorial description is required.");
      return;
    }
    
    // Construct specifications map
    const specificationsObj = parseSpecs(prodForm.specKeyVal);
    const featuresList = prodForm.features.split(',').map(f => f.trim()).filter(Boolean);
    const prosList = prodForm.pros.split(',').map(p => p.trim()).filter(Boolean);
    const consList = prodForm.cons.split(',').map(c => c.trim()).filter(Boolean);
    
    const slugCalculated = generateSlug(prodForm.slug || prodForm.name);

    const parsePrice = (val: string): number | undefined => {
      if (!val || val.trim() === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) || num < 0 ? undefined : num;
    };

    const payload = {
      name: prodForm.name,
      slug: slugCalculated,
      brand: prodForm.brand,
      price: parsePrice(prodForm.price) ?? 0,
      originalPrice: parsePrice(prodForm.originalPrice),
      discount: parsePrice(prodForm.discount),
      category: prodForm.category || categories?.[0]?._id || '',
      subcategory: prodForm.subcategory || undefined,
      description: prodForm.description,
      longDescription: prodForm.longDescription,
      images: imagesList,
      specifications: specificationsObj,
      features: featuresList,
      pros: prosList,
      cons: consList,
      affiliateLink: prodForm.affiliateLink,
      affiliateCode: prodForm.affiliateCode || DEFAULT_AFFILIATE_CODE,
      inStock: prodForm.inStock !== false,
      trending: prodForm.trending,
      featured: prodForm.featured
    };

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct._id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const successHandler = async () => {
        // Reset the panel's active ID state via onSuccess callback
        setEditingProduct(null);
        
        // State-based toggle that automatically closes the editorial panel upon receiving a successful save response
        if (autoCloseEditorial) {
          setShowProductModal(false);
          setModalFormTab('basics');
        }
        await loadAdminMetrics();
      };

      const res = await saveProductApi(url, method, payload, successHandler);

      if (res.ok) {
        const nameSaved = prodForm.name;
        triggerAlert("Submission Successful", `The product "${nameSaved}" was successfully fed to the storefront catalog database!`);
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.code === 'SLUG_COLLISION' && err.suggestedSlug) {
          requestConfirmation(
            "Slug Collision Detected",
            `The web link name (slug) is already in use. Would you like to auto-fix and save this product as "${err.suggestedSlug}"?`,
            async () => {
              setProdForm(prev => ({ ...prev, slug: err.suggestedSlug }));
              const rePayload = { ...payload, slug: err.suggestedSlug };
              try {
                const reRes = await saveProductApi(url, method, rePayload, successHandler);
                if (reRes.ok) {
                  const nameSaved = prodForm.name;
                  triggerAlert("Submission Successful", `The product "${nameSaved}" was successfully fed to the storefront catalog database with unique slug: "${err.suggestedSlug}"!`);
                } else {
                  const reErr = await reRes.json().catch(() => ({}));
                  triggerAlert("Submission Failed", reErr.error || "The server rejected the product submission.");
                }
              } catch (reErr: unknown) {
                const errorObj = reErr as { message?: string };
                triggerAlert("Submission Error", "An error occurred during submission: " + errorObj.message);
              }
            },
            { confirmText: "Use Suggested Suffix", cancelText: "Cancel" }
          );
        } else {
          triggerAlert("Submission Failed", err.error || "The server rejected the product submission. Please verify fields format.");
        }
      }
    } catch (err: unknown) {
      triggerAlert("Submission Error", "An error occurred during submission: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Trigger Open Add popup
  const openAddProduct = () => {
    setEditingProduct(null);
    setModalFormTab('basics');
    setProdForm({
      ...BLANK_PROD_FORM,
      category: categories?.[0]?._id || ''
    });
    setShowProductModal(true);
  };

  // Open Edit Product popup
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setModalFormTab('basics');
    
    // Map specifications keys back to semicolon string format
    let specStr = '';
    if (p.specifications) {
      if (typeof p.specifications === 'string') {
        specStr = p.specifications;
      } else if (p.specifications instanceof Map) {
        specStr = Array.from((p.specifications as Map<any, any>).entries())
          .map(([k, v]) => `${k}=${v}`)
          .join(';');
      } else if (typeof p.specifications === 'object') {
        specStr = Object.entries(p.specifications)
          .map(([k, v]) => `${k}=${v}`)
          .join(';');
      }
    }
    
    setProdForm({
      name: p?.name,
      slug: p.slug,
      brand: p.brand || '',
      price: String(p?.price),
      originalPrice: String(p.originalPrice || ''),
      discount: String(p.discount || ''),
      category: typeof p?.category === 'object' && p?.category !== null ? p?.category._id : p?.category,
      subcategory: p.subcategory || '',
      description: p.description,
      longDescription: p.longDescription || '',
      affiliateLink: p?.affiliateLink,
      affiliateCode: p.affiliateCode || DEFAULT_AFFILIATE_CODE,
      images: Array.isArray(p.images) ? p.images.join("\n") : "",
      features: Array.isArray(p.features) ? p.features.join(', ') : '',
      specKeyVal: specStr,
      pros: Array.isArray(p.pros) ? p.pros.join(', ') : '',
      cons: Array.isArray(p.cons) ? p.cons.join(', ') : '',
      inStock: p.inStock !== false,
      trending: p.trending || false,
      featured: p.featured || false
    });
    setShowProductModal(true);
  };

  // Delete product row
  const handleDeleteProduct = (id: string) => {
    requestConfirmation(
      "Confirm Deletion",
      "Are you sure you want to remove this catalog product entry from the storefront database?",
      async () => {
        try {
          clearApiCache();
          const res = await apiFetch(`/api/admin/products/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            clearApiCache();
            setProducts(prev => prev.filter(p => p?._id !== id));
            await loadAdminMetrics();
          } else {
            const err = await res.json().catch(() => ({}));
            triggerAlert("Deletion Failed", err.error || "The server rejected the deletion request.");
          }
        } catch (e: unknown) {
          const errorObj = e as { message?: string };
          triggerAlert("Network Error", errorObj.message || "Failed to make deletion request to the database server.");
        }
      },
      { isDestructive: true, confirmText: 'Yes, Delete' }
    );
  };

  // Category Add/Edit/Delete handles
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;

    try {
      const url = editingCategory ? `/api/admin/categories/${editingCategory._id}` : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      clearApiCache();
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          name: catName,
          slug: generateSlug(catSlug || catName),
          icon: catIcon || '📦',
          description: catDescription || 'Custom added curator category',
          image: catImage || undefined,
          subcategories: catSubcategories.split(',').map(sub => sub.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        clearApiCache();
        const nameSaved = catName;
        setCatName('');
        setCatIcon('📦');
        setCatSlug('');
        setCatDescription('');
        setCatImage('');
        setCatSubcategories('');
        setEditingCategory(null);
        await loadAdminMetrics();
        triggerAlert("Category Saved", `The category "${nameSaved}" has been successfully fed to the database!`);
      } else {
        const err = await res.json().catch(() => ({}));
        triggerAlert("Failed to Save Category", err.error || "The server rejected the category request.");
      }
    } catch (err: unknown) {
      triggerAlert("Error", "An error occurred while saving the category: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const startEditCategory = (c: Category) => {
    setEditingCategory(c);
    setCatName(c?.name);
    setCatIcon(c?.icon || '📦');
    setCatSlug(c?.slug);
    setCatDescription(c.description || '');
    setCatImage(c.image || '');
    setCatSubcategories(c?.subcategories && Array.isArray(c.subcategories) ? c.subcategories.join(', ') : '');
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatIcon('📦');
    setCatSlug('');
    setCatDescription('');
    setCatImage('');
    setCatSubcategories('');
  };

  const handleDeleteCategory = (id: string) => {
    requestConfirmation(
      "Confirm Category Removal",
      "Are you sure you want to delete this Category/Classifier? Products under this category might remain set but won't belong to an active category.",
      async () => {
        try {
          clearApiCache();
          const res = await apiFetch(`/api/admin/categories/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            clearApiCache();
            await loadAdminMetrics();
          } else {
            const err = await res.json().catch(() => ({}));
            triggerAlert("Deletion Failed", err.error || "The server rejected the category deletion request.");
          }
        } catch (e: unknown) {
          const errorObj = e as { message?: string };
          triggerAlert("Network Error", errorObj.message || "Failed to contact the backend server.");
        }
      },
      { isDestructive: true, confirmText: 'Yes, Delete Category' }
    );
  };

  // Blog Add/Edit/Delete handles
  const handleAddBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      clearApiCache();
      const url = editingBlog ? `/api/admin/blogs/${editingBlog._id}` : '/api/admin/blogs';
      const method = editingBlog ? 'PUT' : 'POST';
      const parsedTags = blogTags.split(',').map(t => t.trim()).filter(Boolean);
      
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: blogTitle,
          content: blogContent,
          category: blogCategory,
          excerpt: blogExcerpt,
          author: blogAuthor || 'Admin',
          featured_image: blogFeaturedImage,
          tags: parsedTags,
          published: blogPublished
        })
      });
      
      if (res.ok) {
        clearApiCache();
        const saved = await res.json();
        await fetchBlogsTabData();
        setBlogTitle('');
        setBlogContent('');
        setBlogCategory('');
        setBlogExcerpt('');
        setBlogAuthor('');
        setBlogFeaturedImage('');
        setBlogTags('');
        setBlogPublished(true);
        setEditingBlog(null);
        triggerAlert("Blog Saved", `The blog manual "${saved.title || 'Untitled'}" has been successfully saved to the database!`);
      } else {
        const err = await res.json().catch(() => ({}));
        triggerAlert("Failed to Save Blog", err.error || "The server rejected the blog manual request.");
      }
    } catch (e: unknown) {
      const errorObj = e as { message?: string };
      triggerAlert("Network Error", errorObj.message || "Failed to communicate with the database server.");
    }
  };

  const startEditBlog = (b: Blog) => {
    setEditingBlog(b);
    setBlogTitle(b.title || '');
    setBlogContent(b.content || '');
    setBlogCategory(b.category || '');
    setBlogExcerpt(b.excerpt || '');
    setBlogAuthor(b.author || '');
    setBlogFeaturedImage(b.featured_image || b.imageUrl || '');
    setBlogTags(Array.isArray(b.tags) ? b.tags.join(', ') : '');
    setBlogPublished(b.published !== false);
  };

  const cancelEditBlog = () => {
    setEditingBlog(null);
    setBlogTitle('');
    setBlogContent('');
    setBlogCategory('');
    setBlogExcerpt('');
    setBlogAuthor('');
    setBlogFeaturedImage('');
    setBlogTags('');
    setBlogPublished(true);
  };

  const handleDeleteBlog = (id: string) => {
    requestConfirmation(
      "Confirm Blog Deletion",
      "Are you sure you want to delete this blog manual? This action cannot be undone.",
      async () => {
        try {
          clearApiCache();
          const res = await apiFetch(`/api/admin/blogs/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            clearApiCache();
            await fetchBlogsTabData();
            triggerAlert("Blog Deleted", "The blog manual has been removed successfully.");
          } else {
            const err = await res.json().catch(() => ({}));
            triggerAlert("Deletion Failed", err.error || "The server rejected the deletion request.");
          }
        } catch (e: unknown) {
          const errorObj = e as { message?: string };
          triggerAlert("Network Error", errorObj.message || "Failed to contact the backend server.");
        }
      },
      { isDestructive: true, confirmText: 'Yes, Delete Blog' }
    );
  };

  const handleUpdateUserRole = (userId: string, targetRole: 'user' | 'admin', userEmail: string) => {
    const actionText = targetRole === 'admin' ? "Promote to Administrator" : "Revoke Administrator Privilege";
    const bodyText = targetRole === 'admin' 
      ? `Are you sure you want to promote ${userEmail} to a full Platform Administrator? They will have full read/write and security capabilities.`
      : `Are you sure you want to securely revoke administrator credentials for ${userEmail}? This will instantly demote them to a Standard User.`;
    
    requestConfirmation(
      actionText,
      bodyText,
      async () => {
        try {
          clearApiCache();
          const res = await apiFetch(`/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: targetRole })
          });
          if (res.ok) {
            clearApiCache();
            await fetchUsersTabData();
            triggerAlert("Security Action Complete", `The user's privilege has been successfully updated to ${targetRole}.`);
          } else {
            const err = await res.json().catch(() => ({}));
            triggerAlert("Action Failed", err.error || "The server rejected the user role update request.");
          }
        } catch (e: unknown) {
          const errorObj = e as { message?: string };
          triggerAlert("Network Error", errorObj.message || "Failed to contact the backend server.");
        }
      },
      { isDestructive: targetRole === 'user', confirmText: targetRole === 'user' ? 'Yes, Revoke Privilege' : 'Yes, Promote User' }
    );
  };

  const handleSimulateSunday = async (targetSundayStr?: string, forceEmail?: boolean) => {
    setSimulatingSunday(true);
    try {
      clearApiCache();
      const res = await apiFetch('/api/admin/sunday-logs/simulate', {
        method: 'POST',
        body: JSON.stringify({ targetSundayStr, forceEmail })
      });
      if (res.ok) {
        clearApiCache();
        const bodyObj = await res.json();
        triggerAlert("Simulation Completed", `Sunday automated scheduler event completed! Created ${bodyObj.log?.productsAdded?.length || 0} product items and published them directly to the storefront catalog.`);
        await loadAdminMetrics();
      } else {
        const errJson = await res.json().catch(() => ({}));
        triggerAlert("Simulation Blocked", errJson.error || "The server rejected the simulation trigger.");
      }
    } catch (e: unknown) {
      const errorObj = e as { message?: string };
      triggerAlert("Simulation Failure", errorObj.message || "Failed to trigger Sunday scheduling routine.");
    } finally {
      setSimulatingSunday(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <RefreshCcw className="h-10 w-10 text-indigo-500 animate-spin shrink-0" />
        <p className="text-sm text-slate-400 font-medium animate-pulse">Authorizing administrative clearance...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 transition-colors duration-300">
      
      <div className="flex justify-end mb-4 md:px-4">
        <N8nStatusIndicator token={token} />
      </div>

      {/* SEED DATA & ANALYTICS DOUBLE BOX PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 md:px-4">
        
        {/* Box 1: Manual Catalog Manager */}
        <div className="rounded-3xl border border-slate-100/60 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500">
                  <Database className="h-5 w-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Manual Catalog Manager</h3>
                  <p className="text-[11px] text-slate-300 font-medium">Curate and publish reviews for your affiliate listings item by item.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-950/70 p-4 rounded-2xl border border-slate-105 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400"></span>
                </span>
                <span>Direct Live Storefront Mode Active</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-300 leading-relaxed font-sans">
                Automated weekly catalog updates are actively managed by the Sunday scheduler. Bulk catalog wipe functions and database seed routines are strictly protected by administrative confirmation to prevent unintended data loss.
              </p>
              <div className="text-[10px] text-slate-300 flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-lg p-2 font-mono">
                <span>ℹ Mode: Secure Manual Entry Enabled</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={openAddProduct}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white dark:bg-indigo-400 dark:hover:bg-indigo-500 py-3 text-xs font-bold transition-all duration-300 cursor-pointer active:scale-95 shadow-sm shadow-indigo-50 dark:shadow-none"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Add Custom Product Card</span>
              </button>
            </div>
          </div>
          
          <div className="mt-4 border-t pt-2.5 border-slate-50 dark:border-slate-700 flex items-center justify-between text-[11px] font-mono text-slate-300">
            <span>Manual Curator Mode: Active</span>
            <span className="font-bold text-indigo-400 dark:text-indigo-300">{products.length} Items Live</span>
          </div>
        </div>

        {/* Box 2: Click & Regional Interest Analytics */}
        <div className="rounded-3xl border border-slate-100/60 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 shadow-xs flex flex-col justify-between">
          <div className="space-y-4 col-span-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500">
                  <TrendingUp className="h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Click & Regional Interest Analytics</h3>
                  <p className="text-[11px] text-slate-300">Track which product links have been clicked, alongside regional interest distribution.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportAnalyticsCSV}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-all duration-300 cursor-pointer active:scale-95 shadow-2xs shrink-0"
              >
                <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Export Report</span>
              </button>
            </div>

            {/* Region of Interest Tracker */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-slate-300" />
                <span>Popular Districts Analysis (Tamil Nadu)</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {(() => {
                  const statsObj = (districtStats || {}) as Record<string, number>;
                  const dtotal = Object.values(statsObj).reduce((acc: number, c) => acc + (typeof c === 'number' ? c : 0), 0);
                  const sortedDis = Object.entries(statsObj)
                    .map(([name, count]) => ({ name, count: count as number }))
                    .sort((a, b) => b.count - a.count);
                  
                  const topFour = sortedDis.slice(0, 4);
                  const remaining = sortedDis.slice(4);

                  const { activeCount, inactiveCount } = remaining.reduce(
                    (acc: { activeCount: number; inactiveCount: number }, r) => {
                      if (r.count > 0) acc.activeCount++;
                      else acc.inactiveCount++;
                      return acc;
                    },
                    { activeCount: 0, inactiveCount: 0 }
                  );

                  return (
                    <div className="col-span-2 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {topFour.map(({ name, count }) => {
                          const pct = dtotal === 0 ? 0 : Math.round((count / dtotal) * 100);
                          return (
                            <div key={name} className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl flex items-center justify-between border border-slate-50 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all duration-300 shadow-2xs">
                              <span className="flex items-center gap-1.5 font-sans font-bold text-slate-800 dark:text-slate-100">
                                {getDistrictEmoji(name)} {name}
                              </span>
                              <span className="font-semibold text-emerald-500 dark:text-emerald-300 font-mono">
                                {pct}% ({count})
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {showAllDistricts && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-3 border-t border-dashed border-slate-50 dark:border-slate-700/80 max-h-[220px] overflow-y-auto pr-1">
                          {remaining.map(({ name, count }) => {
                            const pct = dtotal === 0 ? 0 : Math.round((count / dtotal) * 100);
                            return (
                              <div key={name} className="bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-lg flex items-center justify-between border border-slate-50 dark:border-slate-700/40 hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-all duration-300">
                                <span className="flex items-center gap-1 font-sans text-[11px] text-slate-500 dark:text-slate-300">
                                  {getDistrictEmoji(name)} {name}
                                </span>
                                <span className="font-semibold text-slate-400 dark:text-slate-300 font-mono text-[11px]">
                                  {pct}% ({count})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowAllDistricts(!showAllDistricts)}
                        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-indigo-500 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-200 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-xl transition-all duration-300 cursor-pointer border border-dashed border-slate-100 dark:border-slate-700"
                      >
                        <span>
                          {showAllDistricts 
                            ? "Show Less" 
                            : `See More (${activeCount} active + ${inactiveCount} other Tamil Nadu districts)`
                          }
                        </span>
                        {showAllDistricts ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Click Links Tracker items list */}
            <div className="space-y-2 pt-1">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Targeted Product Affiliate Click Counts</h4>
              <div className="divide-y divide-slate-50 dark:divide-slate-700 text-[11px] font-sans max-h-[140px] overflow-y-auto pr-1">
                {resolvedProducts.filter(p => (p?.clicks || 0) > 0).length === 0 ? (
                  <p className="text-xs text-slate-300 italic py-2">No product clicks recorded yet in this session. Go browse the homepage and click authorized store links to log click telemetry!</p>
                ) : (
                  [...resolvedProducts].filter(p => (p?.clicks || 0) > 0).sort((a,b) => (b?.clicks || 0) - (a?.clicks || 0)).slice(0, 4).map((p, index) => {
                    const clickCount = p.clicks || 0;
                    const convRating = p.conversions || 0;
                    return (
                      <div key={p?._id} className="py-2 flex items-center justify-between gap-4">
                        <div className="truncate max-w-[180px] sm:max-w-[260px]">
                          <span className="font-bold text-slate-700 dark:text-slate-100">{index + 1}. {p?.name}</span>
                          <span className="block font-mono text-[9px] text-indigo-400 truncate" title={p?.affiliateLink}>{p?.affiliateLink}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-center shrink-0">
                          <div>
                            <span className="block font-black text-slate-700 dark:text-white">{clickCount}</span>
                            <span className="block text-[8px] uppercase text-slate-300">clicks</span>
                          </div>
                          <div>
                            <span className="block font-black text-emerald-400">~{convRating}</span>
                            <span className="block text-[8px] uppercase text-slate-300">convs</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t pt-3 border-slate-50 dark:border-slate-700 flex items-center justify-between text-[11px] font-mono text-slate-300">
            <span>Telemetry logging: Active</span>
            <span className="font-bold text-emerald-400">Overall Clicks: {stats.totalClicks}</span>
          </div>
        </div>

      </div>

      {/* 1. TOP STATS METRIC INDEX PANEL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 md:px-4">
        {/* KPI: Unique Visitors */}
        <button
          onClick={() => {
            setActiveTab('telemetry');
            setTimeout(() => {
              tabContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          className="rounded-2xl border border-slate-50 bg-white p-5 hover:border-violet-400 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 text-left w-full focus:outline-none focus:ring-2 focus:ring-violet-400 group"
          aria-label="View unique visitors telemetry"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1 group-hover:text-violet-500 transition-colors duration-300">
              <span>Unique Site Visitors</span>
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-ping"></span>
            </p>
            <h3 className="text-lg font-mono font-black text-violet-500 dark:text-violet-300">{stats.totalVisitors} Visitors</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform duration-300">
            <Users className="h-5 w-5 shrink-0" />
          </div>
        </button>

        {/* KPI: Clicks */}
        <button
          onClick={() => {
            setActiveTab('products');
            setTimeout(() => {
              tabContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          className="rounded-2xl border border-slate-50 bg-white p-5 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 text-left w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 group"
          aria-label="View total click CTR metrics"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 group-hover:text-indigo-500 transition-colors duration-300">Total Tracked Click CTR</p>
            <h3 className="text-lg font-mono font-black text-indigo-500 dark:text-indigo-300">{stats.totalClicks} Clicks</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform duration-300">
            <MousePointerClick className="h-5 w-5 animate-pulse shrink-0" />
          </div>
        </button>

        {/* Estimated Earnings */}
        <button
          onClick={() => {
            setActiveTab('products');
            setTimeout(() => {
              tabContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          className="rounded-2xl border border-slate-50 bg-white p-5 hover:border-teal-300 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 text-left w-full focus:outline-none focus:ring-2 focus:ring-teal-400 group"
          aria-label="View estimated curator commissions"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 group-hover:text-teal-500 transition-colors duration-300">Estimated Earnings (Projection)</p>
            <h3 className="text-lg font-mono font-black text-teal-500 dark:text-teal-300">₹{stats.estimatedEarnings}</h3>
            <span className="text-[9px] text-slate-400 block font-sans font-medium mt-0.5 leading-tight">Flat simulation model (₹0.08/click + ₹4.50/conv)</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform duration-300">
            <Coins className="h-5 w-5 shrink-0" />
          </div>
        </button>

        {/* Message counts */}
        <button
          onClick={() => {
            setActiveTab('messages');
            setMessagesFilter('unread');
            setTimeout(() => {
              tabContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          className="rounded-2xl border border-slate-50 bg-white p-5 hover:border-amber-300 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 text-left w-full focus:outline-none focus:ring-2 focus:ring-amber-400 group"
          aria-label="View unread customer messages"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1 group-hover:text-amber-500 transition-colors duration-300">
              <span>Customer Mail Desk</span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
            </p>
            <h3 className="text-lg font-mono font-black text-amber-500 dark:text-amber-300">{stats.unreadMessages} Unread</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500 select-none group-hover:scale-110 transition-transform duration-300">
            <Mail className="h-5 w-5 shrink-0" />
          </div>
        </button>
      </div>

      {/* 1.5. FOOTER SOCIAL CLICKS DISPLAY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 md:px-4">
        {/* Instagram click counter */}
        <div className="rounded-2xl border border-pink-50 bg-white p-5 dark:border-pink-950/20 dark:bg-slate-800/40 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5 font-mono">
              <span className="h-2 w-2 rounded-full bg-pink-400 animate-pulse"></span>
              Instagram Footer Logo clicks
            </span>
            <p className="text-xl font-mono font-black text-slate-700 dark:text-pink-300">
              {socialClicks.instagram} <span className="text-xs font-sans font-medium text-slate-300">Total Redirects</span>
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center text-pink-400">
            <Instagram className="h-5 w-5 shrink-0" />
          </div>
        </div>

        {/* LinkedIn click counter */}
        <div className="rounded-2xl border border-blue-50 bg-white p-5 dark:border-blue-950/20 dark:bg-slate-800/40 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 font-mono">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
              LinkedIn Footer Logo clicks
            </span>
            <p className="text-xl font-mono font-black text-slate-700 dark:text-blue-300">
              {socialClicks.linkedin} <span className="text-xs font-sans font-medium text-slate-300">Total Redirects</span>
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-400">
            <Linkedin className="h-5 w-5 shrink-0" />
          </div>
        </div>
      </div>

      {/* 2. ADMIN VIEW NAVIGATION TABS */}
      <div ref={tabContainerRef} className="relative z-30 overflow-x-auto whitespace-nowrap scrollbar-none flex flex-nowrap sm:flex-wrap border-b border-slate-50 pb-3 gap-2 md:px-4 mb-8 dark:border-slate-700 max-w-full">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 shrink-0 ${activeTab === 'products' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          📦 Catalog specs ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 shrink-0 ${activeTab === 'categories' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          📁 Classifications ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('blogs')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 shrink-0 ${activeTab === 'blogs' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          📖 Manual guides ({blogs.length})
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 shrink-0 ${activeTab === 'messages' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          ✉ Help Inquiries ({messages.length})
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 shrink-0 ${activeTab === 'telemetry' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          📊 Traffic Track logs ({analyticsData.length})
        </button>
        <button
          onClick={() => setActiveTab('scheduler')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 shrink-0 ${activeTab === 'scheduler' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          🕒 Sunday Scheduler
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 shrink-0 ${activeTab === 'users' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          👥 No of Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('security-logs')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 shrink-0 ${activeTab === 'security-logs' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          🛡️ Audit Logs ({securityLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('importer')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 shrink-0 ${activeTab === 'importer' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          🔌 Extension Importer
        </button>
      
        <button
          onClick={() => setActiveTab('media')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 ${activeTab === 'media' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          🖼️ Media Library
        </button>

        <button
          onClick={() => setActiveTab('seo')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 ${activeTab === 'seo' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          🔍 SEO & Publishing
        </button>

        <button
          onClick={() => setActiveTab('ai-content')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 ${activeTab === 'ai-content' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          ✨ AI Content
        </button>

        <button
          onClick={() => setActiveTab('sync-dashboard')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 ${activeTab === 'sync-dashboard' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          🔄 Monitoring & Sync
        </button>

        <button
          onClick={() => setActiveTab('security-console')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 ${activeTab === 'security-console' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          🛡️ Security & Telemetry
        </button>

        <button
          onClick={() => setActiveTab('adsense-settings')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 ${activeTab === 'adsense-settings' ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
        >
          💰 AdSense & Site Settings
        </button>
      </div>

      {/* 3. DYNAMIC WORKVIEW SECTION GRID TABLES */}
      <div className="md:px-4">
        
        {loading ? (
          <div className="rounded-2xl border border-slate-50 bg-white overflow-hidden shadow-xs dark:border-slate-700 dark:bg-zinc-800/40 animate-pulse">
            <div className="p-4 border-b border-slate-50 dark:border-slate-700 flex justify-between">
              <div className="h-5 w-32 bg-slate-100 dark:bg-slate-700 rounded"></div>
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-700 rounded-lg"></div>
            </div>
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, idx) => (
                <div key={`admin-prod-skeleton-${idx}`} className="flex gap-4 items-center justify-between">
                  <div className="flex gap-3 items-center flex-grow">
                    <div className="h-10 w-10 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0"></div>
                    <div className="space-y-1.5 flex-grow">
                      <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-700 rounded"></div>
                      <div className="h-3 w-1/4 bg-slate-100 dark:bg-slate-700 rounded"></div>
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-slate-100 dark:bg-slate-700 rounded shrink-0"></div>
                  <div className="h-8 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          
          /* VIEW TAB : PRODUCTS LIST */
          activeTab === 'products' ? (
            productsError ? (
              <TabErrorView 
                title="Catalog Specifications Sourcing Error" 
                message={productsError} 
                onRetry={() => loadAdminMetrics()} 
              />
            ) : (() => {
              const totalProductPages = totalPages || 1;
              const currentProductPage = productPage;
              const totalCount = totalProducts || resolvedProducts.length;
              const startIndex = (currentProductPage - 1) * 10;
              const paginatedProducts = resolvedProducts;
              const catMap = new Map<string, string>();
              categories.forEach(c => catMap.set(String(c?._id), c?.name));

              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">Review specifications index</h4>
                    <button
                      onClick={openAddProduct}
                      className="flex items-center gap-1 text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white py-1.5 px-3 rounded-lg shadow-md cursor-pointer transition-colors duration-300"
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      Add Curation Specs
                    </button>
                  </div>

                  {isMobile ? (
                    <div className="grid grid-cols-1 gap-4">
                      {paginatedProducts.map((p, idx) => (
                        <div key={p?._id || `prod-mob-${idx}`} className="bg-white dark:bg-zinc-800/30 p-4 rounded-2xl border border-slate-50 dark:border-slate-700 shadow-xs space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="font-bold text-slate-800 dark:text-white text-xs leading-snug">{p?.name}</h5>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-200 shrink-0">
                              {(() => {
                                if (!p?.category) return 'Curated Line';
                                if (typeof p?.category === 'object' && p?.category !== null && p?.category) {
                                  if (p?.category.name) return p?.category.name;
                                  const catId = p?.category._id || '';
                                  return catMap.get(String(catId)) || 'Curated Line';
                                }
                                return catMap.get(String(p?.category)) || 'Curated Line';
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t border-dashed border-slate-50 dark:border-slate-700 pt-2.5 text-xs font-mono">
                            <div className="flex gap-4">
                              <div>
                                <span className="text-slate-300 text-[9px] block font-sans uppercase font-bold tracking-wider">Price</span>
                                <span className="font-bold text-slate-700 dark:text-slate-100">₹{p?.price}</span>
                              </div>
                              <div>
                                <span className="text-slate-300 text-[9px] block font-sans uppercase font-bold tracking-wider">CTR Clicks</span>
                                <span className="font-semibold text-indigo-400 dark:text-indigo-300">{p.clicks || 0}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditProduct(p)}
                                className="text-indigo-500 hover:text-indigo-700 p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg shadow-xs"
                                title="Edit specifications"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p?._id)}
                                className="text-rose-500 hover:text-rose-700 p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg shadow-xs"
                                title="Delete specifications"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-50 bg-white overflow-hidden shadow-xs dark:border-slate-700 dark:bg-zinc-800/40">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans text-xs">
                          <thead className="bg-slate-50 border-b border-slate-50 text-slate-400 uppercase tracking-wider font-bold dark:bg-slate-700/40 dark:border-slate-700">
                            <tr>
                              <th className="py-2.5 px-4 font-bold">Name</th>
                              <th className="py-2.5 px-4 font-bold">Catalog Class</th>
                              <th className="py-2.5 px-4 font-mono font-bold">Price</th>
                              <th className="py-2.5 px-4 font-mono font-bold">CTR clicks</th>
                              <th className="py-2.5 px-4 font-bold">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {paginatedProducts.map((p, idx) => (
                              <tr key={p?._id || `prod-desk-${idx}`} className="hover:bg-slate-50/20 transition-all duration-300">
                                <td className="py-3 px-4 font-bold text-slate-800 dark:text-white truncate max-w-xs">{p?.name}</td>
                                <td className="py-3 px-4 text-slate-400">
                                  {(() => {
                                    if (!p?.category) return 'Curated Line';
                                    if (typeof p?.category === 'object' && p?.category !== null && p?.category) {
                                      if (p?.category.name) return p?.category.name;
                                      const catId = p?.category._id || '';
                                      return catMap.get(String(catId)) || 'Curated Line';
                                    }
                                    return catMap.get(String(p?.category)) || 'Curated Line';
                                  })()}
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-100">₹{p?.price}</td>
                                <td className="py-3 px-4 font-mono font-semibold text-indigo-400">{p.clicks || 0}</td>
                                <td className="py-3 px-4">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => openEditProduct(p)}
                                      className="text-indigo-500 hover:text-indigo-600 p-1 bg-indigo-50 dark:bg-indigo-950/40 rounded shadow-xs"
                                      title="Edit specifications"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(p?._id)}
                                      className="text-rose-500 hover:text-rose-700 p-1 bg-rose-50 dark:bg-rose-950/40 rounded shadow-xs"
                                      title="Delete specifications"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalProductPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-50 p-4 dark:border-slate-700 bg-slate-50/40 dark:bg-zinc-950/20 rounded-2xl gap-4">
                      <div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-300 font-medium">
                          Showing <span className="font-extrabold text-slate-800 dark:text-white font-mono">{startIndex + 1}</span> to{' '}
                          <span className="font-extrabold text-slate-800 dark:text-white font-mono">
                            {Math.min(startIndex + paginatedProducts.length, totalCount)}
                          </span>{' '}
                          of <span className="font-extrabold text-slate-800 dark:text-white font-mono">{totalCount}</span> curation specs
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setProductPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentProductPage === 1}
                          className="px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-700 enabled:cursor-pointer disabled:opacity-40 select-none transition-all duration-200 active:scale-95"
                        >
                          &larr; Previous
                        </button>
                        
                        <div className="flex gap-1">
                          {(() => {
                            const range = [];
                            const start = Math.max(1, currentProductPage - 2);
                            const end = Math.min(totalProductPages, start + 4);
                            for (let i = Math.max(1, end - 4); i <= end; i++) {
                              if (i > 0) range.push(i);
                            }
                            return range;
                          })().map(pageNumber => (
                            <button
                              key={pageNumber}
                              type="button"
                              onClick={() => setProductPage(pageNumber)}
                              className={`h-7 w-7 rounded-lg text-xs font-bold font-mono transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center ${
                                currentProductPage === pageNumber
                                  ? 'bg-indigo-500 text-white shadow-xs'
                                  : 'border border-slate-100 dark:border-slate-700 bg-white dark:bg-zinc-800 text-slate-500 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-700'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setProductPage(prev => Math.min(prev + 1, totalProductPages))}
                          disabled={currentProductPage === totalProductPages}
                          className="px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-700 enabled:cursor-pointer disabled:opacity-40 select-none transition-all duration-200 active:scale-95"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) :

          /* VIEW TAB : CATEGORIES LIST */
          activeTab === 'categories' ? (
            categoriesError ? (
              <TabErrorView 
                title="Classification Sourcing Error" 
                message={categoriesError} 
                onRetry={() => loadAdminMetrics()} 
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Category form */}
                <div className="rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-zinc-800/40 col-span-1 space-y-4 h-fit">
                  <h4 className="text-xs font-bold uppercase text-slate-700 mb-2 dark:text-white">
                    {editingCategory ? 'Edit Classifier' : 'Add Classifier'}
                  </h4>
                  <form onSubmit={handleAddCategory} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Classifier Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Gaming Devices"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Classifier Icon</label>
                      <input
                        type="text"
                        placeholder="e.g. 📱 or 🎮"
                        value={catIcon}
                        onChange={(e) => setCatIcon(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Classifier Slug (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. gaming-devices (Auto-calculated if empty)"
                        value={catSlug}
                        onChange={(e) => setCatSlug(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Subcategories (Comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. Mobiles, Laptops, Accessories"
                        value={catSubcategories}
                        onChange={(e) => setCatSubcategories(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Classifier Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Premium quality laptops and tablets"
                        value={catDescription}
                        onChange={(e) => setCatDescription(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Classifier Image URL (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. https://images.unsplash.com/..."
                        value={catImage}
                        onChange={(e) => setCatImage(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 rounded-xl bg-slate-950 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 cursor-pointer transition-colors duration-300"
                      >
                        {editingCategory ? 'Update Classifier' : 'Create Classifier'}
                      </button>
                      {editingCategory && (
                        <button
                          type="button"
                          onClick={cancelEditCategory}
                          className="rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-3 py-2.5 cursor-pointer transition-colors duration-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Table list */}
                <div className="rounded-2xl border border-slate-50 bg-white overflow-hidden shadow-xs dark:border-slate-700 dark:bg-zinc-800/40 col-span-2">
                  {isMobile ? (
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/80 p-5 space-y-4">
                      {categories.map((c, idx) => (
                        <div key={c._id || `cat-mob-${idx}`} className="pt-4 first:pt-0 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl shrink-0 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl">{c?.icon || '📦'}</span>
                            <div>
                               <h5 className="font-bold text-slate-800 dark:text-white text-xs">{c?.name}</h5>
                               <span className="font-mono text-[10px] text-slate-300 block truncate max-w-[140px]">{c?.slug}</span>
                               {c?.subcategories && Array.isArray(c.subcategories) && c.subcategories.length > 0 && (
                                 <div className="flex flex-wrap gap-1 mt-1 max-w-[180px]">
                                   {c.subcategories.map((sub, sIdx) => (
                                     <span key={`${sub || 'sub'}-${sIdx}`} className="text-[8px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 rounded font-semibold">{sub}</span>
                                   ))}
                                 </div>
                               )}
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditCategory(c)}
                              className="text-indigo-500 hover:text-indigo-600 p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl shadow-xs cursor-pointer"
                              title="Edit Classifier"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteCategory(c._id as string); }}
                              className="text-rose-500 hover:text-rose-600 p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl shadow-xs cursor-pointer"
                              title="Delete Classifier"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-xs">
                        <thead className="bg-slate-50 border-b border-slate-50 text-slate-400 uppercase tracking-wider font-bold dark:bg-slate-700/40 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-4 text-left">Icon</th>
                            <th className="py-2.5 px-4 text-left">Classifier Name</th>
                            <th className="py-2.5 px-4 text-left font-mono">Classifier Slug</th>
                            <th className="py-2.5 px-4 text-left">Subcategories</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                          {categories.map((c, idx) => (
                            <tr key={c._id || `cat-desk-${idx}`} className="hover:bg-slate-50/20">
                              <td className="py-3 px-4 font-semibold text-lg">{c?.icon || '📦'}</td>
                              <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">{c?.name}</td>
                              <td className="py-3 px-4 text-slate-400 font-mono text-[11px] font-semibold">{c?.slug}</td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {c?.subcategories && Array.isArray(c.subcategories) && c.subcategories.length > 0 ? (
                                    c.subcategories.map((sub, sIdx) => (
                                      <span key={`${sub || 'sub'}-${sIdx}`} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 rounded font-semibold">{sub}</span>
                                    ))
                                  ) : (
                                    <span className="text-slate-300 italic text-[10px]">None</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => startEditCategory(c)}
                                    className="text-indigo-500 hover:text-indigo-600 p-1 bg-indigo-50 dark:bg-indigo-950/40 rounded shadow-xs cursor-pointer"
                                    title="Edit Classifier"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(c._id as string); }}
                                    className="text-rose-500 hover:text-rose-600 p-1 bg-rose-50 dark:bg-rose-950/40 rounded shadow-xs cursor-pointer"
                                    title="Delete Classifier"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

            </div>
            )
          ) :

          /* VIEW TAB : RECENT BLOGS MANUALS */
          activeTab === 'blogs' ? (
            blogsError ? (
              <TabErrorView 
                title="Blog Manual Guides Sourcing Error" 
                message={blogsError} 
                onRetry={() => loadAdminMetrics()} 
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Blog form */}
                <div className="rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-zinc-800/40 col-span-1 space-y-4 h-fit">
                  <h4 className="text-xs font-bold uppercase text-slate-700 mb-2 dark:text-white">
                    {editingBlog ? 'Edit Blog Manual' : 'Add Blog Manual'}
                  </h4>
                  <form onSubmit={handleAddBlog} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Best Noise Cancelling Headphones"
                        value={blogTitle}
                        onChange={(e) => setBlogTitle(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Category</label>
                      <input
                        type="text"
                        placeholder="e.g. Headphones"
                        value={blogCategory}
                        onChange={(e) => setBlogCategory(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Author</label>
                      <input
                        type="text"
                        placeholder="e.g. Admin or TechSpec Curators"
                        value={blogAuthor}
                        onChange={(e) => setBlogAuthor(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Excerpt</label>
                      <input
                        type="text"
                        placeholder="e.g. A quick summary of the manual post"
                        value={blogExcerpt}
                        onChange={(e) => setBlogExcerpt(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Featured Image URL</label>
                      <input
                        type="text"
                        placeholder="e.g. https://images.unsplash.com/..."
                        value={blogFeaturedImage}
                        onChange={(e) => setBlogFeaturedImage(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Tags (Comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. tech, audio, guides"
                        value={blogTags}
                        onChange={(e) => setBlogTags(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Content (Markdown / HTML / Plain text)</label>
                      <textarea
                        rows={5}
                        placeholder="Enter full blog article body content..."
                        value={blogContent}
                        onChange={(e) => setBlogContent(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="blogPublished"
                        checked={blogPublished}
                        onChange={(e) => setBlogPublished(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500"
                      />
                      <label htmlFor="blogPublished" className="text-xs font-bold text-slate-700 dark:text-slate-200">Publish immediately</label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 rounded-xl bg-slate-950 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 cursor-pointer transition-colors duration-300"
                      >
                        {editingBlog ? 'Update Blog' : 'Create Blog'}
                      </button>
                      {editingBlog && (
                        <button
                          type="button"
                          onClick={cancelEditBlog}
                          className="rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-3 py-2.5 cursor-pointer transition-colors duration-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Table list */}
                <div className="rounded-2xl border border-slate-50 bg-white overflow-hidden shadow-xs dark:border-slate-700 dark:bg-zinc-800/40 col-span-2">
                  {isMobile ? (
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/80 p-5 space-y-4">
                      {blogs.map((b, idx) => (
                        <div key={b?._id || `blog-mob-${idx}`} className="pt-4 first:pt-0 space-y-2">
                          <h5 className="font-bold text-slate-800 dark:text-white text-xs leading-snug">{b?.title}</h5>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                            <span className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-200">{b?.category}</span>
                            <span className="font-mono text-indigo-500 dark:text-indigo-300">👀 {b?.views || 0} views</span>
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              onClick={() => startEditBlog(b)}
                              className="text-indigo-500 hover:text-indigo-600 p-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded cursor-pointer"
                              title="Edit Blog"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBlog(b._id)}
                              className="text-rose-500 hover:text-rose-600 p-1.5 bg-rose-50 dark:bg-rose-950/40 rounded cursor-pointer"
                              title="Delete Blog"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-xs">
                        <thead className="bg-slate-50 border-b border-slate-50 text-slate-400 uppercase tracking-wider font-bold dark:bg-slate-700/40 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-4 font-bold">Guides Name</th>
                            <th className="py-2.5 px-4 font-bold">Category</th>
                            <th className="py-2.5 px-4 font-mono font-bold">Views</th>
                            <th className="py-2.5 px-4 font-bold">Author</th>
                            <th className="py-2.5 px-4 font-bold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                          {blogs.map((b, idx) => (
                            <tr key={b?._id || `blog-desk-${idx}`} className="hover:bg-slate-50/20">
                              <td className="py-3 px-4 font-bold text-slate-800 truncate max-w-xs dark:text-white">{b?.title}</td>
                              <td className="py-3 px-4 text-slate-400 font-semibold">{b?.category}</td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-200">{b?.views || 0}</td>
                              <td className="py-3 px-4 text-slate-300 font-semibold">{b?.author || 'Admin'}</td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => startEditBlog(b)}
                                    className="text-indigo-500 hover:text-indigo-600 p-1 bg-indigo-50 dark:bg-indigo-950/40 rounded shadow-xs cursor-pointer"
                                    title="Edit Blog"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBlog(b._id)}
                                    className="text-rose-500 hover:text-rose-600 p-1 bg-rose-50 dark:bg-rose-950/40 rounded shadow-xs cursor-pointer"
                                    title="Delete Blog"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : activeTab === 'messages' ? (
            messagesError ? (
              <TabErrorView 
                title="Help Inquiries Sourcing Error" 
                message={messagesError} 
                onRetry={() => loadAdminMetrics()} 
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">User Messages & Inquiries</h4>
                  
                  {/* Filter tabs */}
                  <div className="flex bg-slate-50 p-1 rounded-xl dark:bg-slate-700 text-[11px] font-bold w-fit">
                    <button
                      type="button"
                      onClick={() => setMessagesFilter('all')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-300 ${messagesFilter === 'all' ? 'bg-white text-indigo-500 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:text-slate-300'}`}
                    >
                      All Messages ({messages.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessagesFilter('unread')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-300 flex items-center gap-1.5 ${messagesFilter === 'unread' ? 'bg-white text-indigo-500 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:text-slate-300'}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                      Unread ({stats.unreadMessages})
                    </button>
                  </div>
                </div>
                
                {(() => {
                  const displayedMessages = messagesFilter === 'unread' 
                    ? messages.filter(m => !m?.read) 
                    : messages;

                  if (displayedMessages.length === 0) {
                    return (
                      <div className="border border-dashed border-slate-100 p-8 rounded-2xl text-center dark:border-slate-700">
                        <MailOpen className="h-6 w-6 text-slate-200 mx-auto" />
                        <p className="text-xs text-slate-300 mt-2 italic">
                          {messagesFilter === 'unread' 
                            ? "You have read all user messages! No unread inquiries left." 
                            : "Mailbox is completely quiet. No customer inquiries submitted."}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {displayedMessages.map((m, idx) => {
                        const isReplying = activeReplyId === m?._id;
                        const replyText = replyTextMap[m?._id] || '';
                        
                        return (
                          <div
                            key={m?._id || `msg-${idx}`}
                            className={`rounded-2xl border p-5 space-y-3.5 transition-all duration-300 ${!m?.read ? 'bg-indigo-50/40 border-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800 shadow-xs' : 'bg-slate-50/20 border-slate-100 dark:border-slate-700'}`}
                          >
                            <div className="flex items-center justify-between gap-4 border-b pb-2 dark:border-slate-700">
                              <div>
                                <span className="text-[9px] text-slate-300 font-bold font-mono">Date: {new Date(m?.createdAt).toLocaleString()}</span>
                                <h4 className="text-xs font-black text-slate-800 dark:text-white mt-1">Sender: {m.name} ({m.email})</h4>
                              </div>

                              {!m?.read ? (
                                <button
                                  onClick={() => handleMarkRead(m?._id)}
                                  className="flex items-center gap-1 rounded bg-indigo-500 hover:bg-indigo-600 text-white px-2.5 py-1 text-[10px] font-bold shadow-xs cursor-pointer"
                                >
                                  <MailCheck className="h-3.5 w-3.5 shrink-0" />
                                  Mark as Read
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-bold block bg-slate-50 px-2 py-0.5 rounded-sm dark:bg-slate-700">Read</span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-300 font-bold">Subject: <span className="text-slate-700 dark:text-slate-50">{m?.subject}</span></p>
                            <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-200 italic">"{m.message}"</p>

                            {/* Actions bar */}
                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-50/50 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeReplyId === m?._id) {
                                    setActiveReplyId(null);
                                  } else {
                                    setActiveReplyId(m?._id);
                                    if (!replyTextMap[m?._id]) {
                                      setReplyTextMap(prev => ({
                                        ...prev,
                                        [m?._id]: `Hi ${m.name},\n\nThank you for reaching out to gadgetsprohub! Regarding your query about "${m?.subject}":\n\n`
                                      }));
                                    }
                                  }
                                }}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-300 cursor-pointer ${
                                  isReplying 
                                    ? 'bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-800' 
                                    : 'bg-slate-50 hover:bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span>{isReplying ? 'Cancel Reply' : 'Reply with Draft'}</span>
                              </button>

                              <a
                                href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m?.subject}`)}&body=${encodeURIComponent(`Hi ${m.name},\n\n`)}`}
                                className="flex items-center gap-1.5 rounded-lg bg-teal-50 hover:bg-teal-50 text-teal-700 px-3 py-1.5 text-xs font-bold transition-all duration-300 cursor-pointer dark:bg-teal-950/20 dark:text-teal-200 dark:hover:bg-teal-905"
                              >
                                <span className="text-xs">✉</span>
                                <span>Direct Email Link</span>
                              </a>
                            </div>

                            {/* Reply Form */}
                            {isReplying && (
                              <div className="mt-4 p-4 rounded-xl border border-slate-100/80 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-950/40 space-y-3">
                                <span className="text-[10px] font-bold text-slate-300 uppercase block">Compose Reply email draft</span>
                                <textarea
                                  rows={5}
                                  className="w-full text-xs p-3 rounded-lg border border-slate-100 bg-white text-slate-800 focus:border-indigo-400 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                  value={replyText}
                                  onChange={(e) => {
                                    setReplyTextMap(prev => ({
                                      ...prev,
                                      [m?._id]: e.target.value
                                    }));
                                  }}
                                  placeholder="Type your email response here..."
                                />

                                {sentReplySuccess === m?._id ? (
                                  <div className="text-[11px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-300 p-2.5 rounded-lg flex items-center gap-1.5">
                                    <span>✓ Email response sent successfully and marked read!</span>
                                  </div>
                                ) : (
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!replyText.trim()) {
                                          triggerAlert("Empty Reply", "Please write an email response draft first!");
                                          return;
                                        }
                                        
                                        try {
                                          const res = await apiFetch(`/api/admin/messages/reply/${m?._id}`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ replyText: replyText.trim() })
                                          });

                                          if (res.ok) {
                                            const resData = await res.json().catch(() => ({}));
                                            clearApiCache();
                                            setMessages(prev => prev.map(msg => msg?._id === m?._id ? { ...msg, read: true, replied: true } : msg));
                                            
                                            if (resData.emailSent === false) {
                                              const warnMsg = resData.smtpError || 'SMTP server is not configured or failed to deliver email.';
                                              triggerAlert("Reply Saved (Email Failed)", `Message reply was saved in database, but email delivery failed: ${warnMsg}`);
                                            } else {
                                              setSentReplySuccess(m?._id);
                                            }

                                            setTimeout(() => {
                                              setSentReplySuccess(null);
                                              setActiveReplyId(null);
                                              setReplyTextMap(prev => {
                                                const copy = { ...prev };
                                                delete copy[m?._id];
                                                return copy;
                                              });
                                            }, 2500);
                                          } else {
                                            const errData = await res.json().catch(() => ({ error: 'Failed to send reply' }));
                                            triggerAlert("Reply Error", errData.error || "Failed to send email reply.");
                                          }
                                        } catch (e: any) {
                                          triggerAlert("Network Error", e.message || "Failed to reach server.");
                                        }
                                      }}
                                      className="rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all duration-300 active:scale-95 flex items-center gap-1.5"
                                    >
                                      <span>Send & Mark Read</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )
          ) : activeTab === 'scheduler' ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5 dark:text-indigo-300">
                    <span>🕒 Sunday Automation & Scheduler Portal</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 font-sans font-medium">Auto-manage trending product lifespans, schedule weekly additions, and trigger author reminder emails.</p>
                </div>
                
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSimulateSunday()}
                    disabled={simulatingSunday}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 text-xs font-bold transition-all duration-300 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCcw className={`h-3.5 w-3.5 shrink-0 ${simulatingSunday ? 'animate-spin' : ''}`} />
                    <span>{simulatingSunday ? 'Executing Simulation...' : 'Simulate Sunday robot addition'}</span>
                  </button>
                </div>
              </div>

              {/* Status and summary card */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {/* System specifications rules */}
                  <div className="rounded-2xl border border-slate-50 bg-linear-to-br from-indigo-50/20 to-violet-50/10 p-5 dark:border-slate-700 dark:bg-zinc-800/10 space-y-3.5">
                    <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider">Automated Scheduler Rules & Policies</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-white/80 p-3 rounded-xl border border-indigo-50 dark:border-indigo-950/40 dark:bg-zinc-950/40 space-y-1.5">
                        <span className="font-bold text-slate-700 dark:text-orange-200 block">⏱ 7-Day Trending Lifespan</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                          Products marked as **Trending** automatically age out back to normal catalogue files exactly 7 days after insertion. This check runs automatically whenever anyone requests products or the trending list.
                        </p>
                      </div>

                      <div className="bg-white/80 p-3 rounded-xl border border-indigo-50 dark:border-indigo-950/40 dark:bg-zinc-950/40 space-y-1.5">
                        <span className="font-bold text-slate-700 dark:text-emerald-200 block">📬 Automatic Weekly Notification</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                          Every Sunday, a detailed automation run is triggered. It appends **2 brand-new premium items** as unpublished drafts queued for review and automatically emails the designated administrator's mailbox with a complete status update.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Logs registry */}
                  <h5 className="text-xs font-black uppercase text-slate-300 tracking-wider">Scheduled Run History Log ({sundayLogs.length})</h5>

                  {sundayLogsError && (
                    <div className="bg-red-50 text-red-500 p-4 rounded-xl text-xs dark:bg-red-950/20 dark:text-red-300">
                      Error sourcing logs: {sundayLogsError}
                    </div>
                  )}

                  {sundayLogs.length === 0 ? (
                    <div className="border border-dashed border-slate-100 p-8 rounded-2xl text-center dark:border-slate-700 bg-white dark:bg-zinc-950/20">
                      <p className="text-xs text-slate-300 italic">No automated scheduler logs recorded yet. Click "Simulate Sunday robot addition" above to execute and log your first automated weekly run!</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-50 bg-white overflow-hidden shadow-2xs dark:border-slate-700 dark:bg-zinc-800/40 animate-in fade-in duration-300">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans text-xs">
                          <thead className="bg-slate-50 border-b border-slate-50 text-slate-400 uppercase tracking-wider font-bold dark:bg-slate-700/40 dark:border-slate-700">
                            <tr>
                              <th className="py-2.5 px-4 font-bold">Execution Date</th>
                              <th className="py-2.5 px-4 font-bold">Automation Type</th>
                              <th className="py-2.5 px-4 font-bold">Notification Mail Status</th>
                              <th className="py-2.5 px-4 font-bold">New Products Appended</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {sundayLogs.map((log, idx: number) => (
                              <tr key={log._id || log.sundayDate || `log-${idx}`} className="hover:bg-slate-50/20 dark:hover:bg-slate-700/20">
                                <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-zinc-100">
                                  {log.sundayDate}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="inline-block rounded bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-bold dark:bg-indigo-950/40 dark:text-indigo-200">
                                    {log.runType || 'Sunday Seeding'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono">
                                  {log.emailSent ? (
                                    <span className="text-emerald-500 dark:text-emerald-300 font-bold">✓ Gmail alert sent</span>
                                  ) : (
                                    <span className="text-slate-300 italic">Mail simulated</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 max-w-[200px] truncate">
                                  <span className="text-slate-700 dark:text-slate-200 font-sans font-medium">
                                    {Array.isArray(log?.productsAdded) 
                                      ? log?.productsAdded?.map((p) => typeof p === 'object' && p !== null ? (p as { name?: string }).name : String(p)).join(', ')
                                      : log?.productsAdded || 'N/A'
                                    }
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar configuration card */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-100/80 bg-white p-5 dark:border-slate-700 dark:bg-zinc-800/30 shadow-xs space-y-4">
                    <h5 className="text-[11px] font-black uppercase text-indigo-600 tracking-wider dark:text-indigo-300">Default Target Mailbox</h5>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-indigo-50/40 p-3 rounded-xl border border-indigo-50/30 dark:bg-indigo-950/20 dark:border-indigo-800/20 w-full min-w-0">
                        <span className="text-lg shrink-0">📧</span>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <span className="text-[10px] text-slate-300 font-semibold block uppercase">ADMIN GMAIL</span>
                          <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-100 break-all select-all block leading-tight">
                            (Loaded via Environment Profile)
                          </span>
                        </div>
                      </div>
                    </div>

                    <h5 className="text-[11px] font-black uppercase text-indigo-600 tracking-wider dark:text-indigo-300 pt-2">Schedule Heartbeat status</h5>
                    <div className="rounded-xl border border-slate-50 p-3 dark:border-slate-700 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Next Expected Run:</span>
                        <span className="font-bold text-slate-700 dark:text-zinc-100">Next Sunday</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Heartbeat interval:</span>
                        <span className="font-bold text-indigo-500 dark:text-indigo-300">12 hours</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'users' ? (
            usersError ? (
              <TabErrorView 
                title="Member Profiles Sourcing Error" 
                message={usersError} 
                onRetry={() => loadAdminMetrics()} 
              />
            ) : (() => {
              const filteredUsers = users.filter(usr => {
                const matchesSearch = 
                  (usr?.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                  (usr?.name || '').toLowerCase().includes(userSearchQuery.toLowerCase());
                
                const matchesRole = 
                  userRoleFilter === 'all' || 
                  usr?.role === userRoleFilter;

                return matchesSearch && matchesRole;
              });

              return (
                <div className="space-y-6 text-slate-700 dark:text-slate-50 text-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5 dark:text-indigo-300">
                        <span>👥 Total Registered Platform Members</span>
                      </h4>
                      <p className="text-[11px] text-zinc-300 mt-0.5 font-sans font-medium">
                        A comprehensive overview of registered members. Revoke administrator credentials securely using a security challenge.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadAdminMetrics()}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-100/85 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-200 transition-all duration-300 cursor-pointer active:scale-95 shadow-xs"
                      >
                        <RefreshCcw className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" />
                        <span>Refresh accounts list</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Bento Grid Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-105 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Total registered members</span>
                        <h4 className="text-sm font-mono font-black text-slate-700 dark:text-slate-100 mt-1">{users.length} Account(s)</h4>
                      </div>
                      <div className="h-9 w-9 rounded-lg bg-slate-50 dark:bg-slate-700/40 flex items-center justify-center text-slate-400 font-bold">
                        👥
                      </div>
                    </div>

                    <div className="rounded-2xl border border-indigo-50 bg-indigo-50/10 p-4 dark:border-indigo-950/20 dark:bg-slate-800 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">Active Administrators</span>
                        <h4 className="text-sm font-mono font-black text-indigo-500 dark:text-indigo-300 mt-1">
                          {users.filter(u => u.role === 'admin').length} Admin(s)
                        </h4>
                      </div>
                      <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-400 font-bold">
                         🛡️
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-50 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Standard Users</span>
                        <h4 className="text-sm font-mono font-black text-slate-600 dark:text-slate-200 mt-1 block">
                          {users.filter(u => u.role !== 'admin').length} User(s)
                        </h4>
                      </div>
                      <div className="h-9 w-9 rounded-lg bg-slate-50 dark:bg-slate-700/40 flex items-center justify-center text-slate-300 font-bold">
                         👤
                      </div>
                    </div>
                  </div>



                  {/* Filter and Search Utility Box */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/50 p-4 rounded-2xl dark:bg-zinc-800/40 border border-slate-50 dark:border-slate-700">
                    <div className="relative w-full sm:max-w-xs">
                      <input
                        type="text"
                        placeholder="Search by email address or name..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-3.5 pr-8 py-2 text-xs rounded-xl border border-slate-100 bg-white placeholder-slate-300 text-slate-700 focus:outline-hidden focus:ring-1.5 focus:ring-slate-800 dark:border-slate-700 dark:bg-zinc-950 dark:text-slate-50 dark:focus:ring-slate-200"
                      />
                      {userSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setUserSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-slate-300 hover:text-slate-500 text-xs font-mono font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <span className="text-[11px] font-bold uppercase text-slate-300 whitespace-nowrap">Filter Role:</span>
                      <div className="flex bg-white dark:bg-zinc-950 p-1 rounded-xl border border-slate-100 dark:border-slate-700 gap-1">
                        {(['all', 'admin', 'user'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setUserRoleFilter(r)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer capitalize transition-all duration-300 ${userRoleFilter === r ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800' : 'text-slate-300 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Users Admin Control Table */}
                  <div className="rounded-2xl border border-slate-50 bg-white overflow-hidden shadow-xs dark:border-slate-700 dark:bg-zinc-800/40 w-full">
                    {filteredUsers.length === 0 ? (
                      <div className="py-12 text-center text-slate-300 italic text-xs font-medium">
                        No registered users found matching the query filters.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-50 text-slate-300 uppercase text-[10px] tracking-wider dark:bg-slate-800/20 dark:border-slate-700">
                              <th className="py-3 px-4 font-bold">Member Information</th>
                              <th className="py-3 px-4 font-bold">Region/District</th>
                              <th className="py-3 px-4 font-bold">Role Privilege</th>
                              <th className="py-3 px-4 font-bold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {filteredUsers.map((usr: User, idx: number) => {
                              const usrId = usr?._id || usr?.id || `usr-${idx}`;
                              const isSelf = usrId === user?._id || usrId === (user as { id?: string })?.id;
                              const isCurrentAdmin = usr?.role === 'admin';

                              return (
                                <tr key={usrId} className="hover:bg-slate-50/20 dark:hover:bg-slate-700/20 transition-colors duration-300">
                                  <td className="py-3.5 px-4 animate-fadeIn">
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-full bg-slate-50 text-slate-600 font-bold items-center justify-center flex border border-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600">
                                        {usr.profileImage ? (
                                          <img
                                            src={usr.profileImage}
                                            alt={usr?.name}
                                            referrerPolicy="no-referrer"
                                            className="h-full w-full rounded-full object-cover"
                                          />
                                        ) : (
                                          <span>{(usr?.name || usr?.email || 'U')[0].toUpperCase()}</span>
                                        )}
                                      </div>
                                      <div className="space-y-0.5">
                                        <div className="font-bold text-slate-700 dark:text-slate-50 flex items-center gap-1.5">
                                          <span>{usr?.name || 'Anonymous User'}</span>
                                          {isSelf && (
                                            <span className="text-[9px] bg-slate-800 text-white rounded px-1.5 py-0.2 font-extrabold dark:bg-slate-50 dark:text-slate-800 uppercase">
                                              You
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-300 font-mono font-medium">{usr?.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-zinc-300">
                                    <span className="inline-flex items-center gap-1 text-[11px]">
                                      <span>{getDistrictEmoji(usr.district || 'Unspecified')}</span>
                                      <span>{usr.district || 'Unspecified'}</span>
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {isCurrentAdmin ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-black text-rose-500 border border-rose-50 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/30 font-sans uppercase">
                                        🛡️ Administrator
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-100 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-700/50 font-sans uppercase">
                                        👤 Standard User
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    {isSelf ? (
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">Self (Unmodifiable)</span>
                                    ) : isCurrentAdmin ? (
                                      <button
                                        onClick={() => handleUpdateUserRole(String(usrId), 'user', usr?.email || 'N/A')}
                                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 px-2.5 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-300 cursor-pointer transition-colors animate-fadeIn"
                                      >
                                        Revoke Admin
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleUpdateUserRole(String(usrId), 'admin', usr?.email || 'N/A')}
                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-300 cursor-pointer transition-colors animate-fadeIn"
                                      >
                                        Promote Admin
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : activeTab === 'security-logs' ? (
            securityLogsError ? (
              <TabErrorView 
                title="Security Logs Sourcing Error" 
                message={securityLogsError} 
                onRetry={() => loadAdminMetrics()} 
              />
            ) : (() => {
              const filteredLogs = securityLogs.filter(log => {
                const matchesAction = selectedActionType === 'all' || log?.action === selectedActionType;
                const matchesSearch = 
                  (log?.adminEmail || '').toLowerCase().includes(securitySearchQuery.toLowerCase()) ||
                  (log?.action || '').toLowerCase().includes(securitySearchQuery.toLowerCase()) ||
                  (log?.targetId || '').toLowerCase().includes(securitySearchQuery.toLowerCase()) ||
                  JSON.stringify(log?.details || {}).toLowerCase().includes(securitySearchQuery.toLowerCase());
                return matchesAction && matchesSearch;
              });

              const LOGS_PER_PAGE = 15;
              const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
              const currentPage = Math.min(localLogsPage, Math.max(1, totalPages));
              const startIndex = (currentPage - 1) * LOGS_PER_PAGE;
              const paginatedLogs = filteredLogs.slice(startIndex, startIndex + LOGS_PER_PAGE);

              const actionTypes = Array.from(new Set(securityLogs.map(l => l.action)));

              const getActionBadgeClass = (action: string) => {
                if (action.endsWith('_DELETED') || action === 'DATABASE_CLEARED') {
                  return 'bg-rose-50 text-rose-600 border-rose-50 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40';
                }
                if (action.endsWith('_CREATED') || action.endsWith('_SEEDED')) {
                  return 'bg-emerald-50 text-emerald-600 border-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40';
                }
                if (action.endsWith('_UPDATED') || action.endsWith('_RESEEDED')) {
                  return 'bg-amber-50 text-amber-600 border-amber-50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40';
                }
                return 'bg-indigo-50 text-indigo-600 border-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40';
              };

              return (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-black uppercase text-indigo-500 tracking-wider">Security & Compliance Audit Trail</h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 font-sans font-medium">Rolling 90-day compliance audit trail recording sensitive administrative actions and privilege changes.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="rounded-lg bg-slate-50 border border-slate-50 px-3 py-1.5 dark:bg-slate-800 dark:border-slate-700">
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-300 uppercase">
                          TOTAL AUDITED ACTIONS: {securityLogs.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Filters bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-50 dark:bg-zinc-800/20 dark:border-slate-700">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Search Logs</label>
                      <input 
                        type="text"
                        placeholder="Search actor, target, metadata..."
                        value={securitySearchQuery}
                        onChange={(e) => { setSecuritySearchQuery(e.target.value); setLocalLogsPage(1); }}
                        className="w-full text-xs bg-white dark:bg-zinc-800 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-600 dark:text-slate-300 focus:outline-hidden focus:border-indigo-400 font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Filter Action Type</label>
                      <select
                        value={selectedActionType}
                        onChange={(e) => { setSelectedActionType(e.target.value); setLocalLogsPage(1); }}
                        className="w-full text-xs bg-white dark:bg-zinc-800 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-600 dark:text-slate-300 focus:outline-hidden focus:border-indigo-400 font-sans"
                      >
                        <option value="all">All Audited Actions ({securityLogs.length})</option>
                        {actionTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => { setSelectedActionType('all'); setSecuritySearchQuery(''); setLocalLogsPage(1); }}
                        className="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-600 hover:underline dark:text-indigo-300 transition-all duration-300 px-2 py-2"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>

                  {/* Table area */}
                  <div className="rounded-2xl border border-slate-50 bg-white overflow-hidden shadow-xs dark:border-slate-700 dark:bg-zinc-800/40">
                    {paginatedLogs.length === 0 ? (
                      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                        <span className="text-3xl">🛡️</span>
                        <div className="space-y-1">
                          <h5 className="text-xs font-black uppercase text-slate-600 dark:text-slate-200">No Security Logs Found</h5>
                          <p className="text-[11px] text-slate-300 font-medium max-w-sm">
                            {securityLogs.length === 0 
                              ? "No security events have been logged yet. Create, edit, delete products/categories/blogs or modify user roles to generate security entries." 
                              : "No logs matched your active filters. Try loosening your search criteria."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/50 text-[10px] font-black uppercase text-slate-300 tracking-wider dark:border-slate-700 dark:bg-zinc-800/20">
                              <th className="py-3 px-4 font-black">Timestamp</th>
                              <th className="py-3 px-4 font-black">Actor (Admin Email)</th>
                              <th className="py-3 px-4 font-black">Action Event</th>
                              <th className="py-3 px-4 font-black">IP & Location</th>
                              <th className="py-3 px-4 font-black">Target ID</th>
                              <th className="py-3 px-4 font-black">Metadata / Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {paginatedLogs.map((log, index) => {
                              return (
                                <tr key={log._id || log.id || index} className="text-xs hover:bg-slate-50/50 transition-colors duration-300 dark:hover:bg-zinc-700/20">
                                  <td className="py-3.5 px-4 font-mono text-[10px] text-slate-300 dark:text-slate-400">
                                    {log?.timestamp ? new Date(log?.timestamp).toLocaleString() : 'N/A'}
                                  </td>
                                  <td className="py-3.5 px-4 font-sans font-bold text-slate-700 dark:text-zinc-100">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] bg-slate-50 text-slate-600 rounded px-1.5 py-0.5 dark:bg-slate-700 dark:text-slate-300 font-mono">
                                        {log?.adminEmail}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-mono font-black uppercase ${getActionBadgeClass(log?.action || '')}`}>
                                      {log?.action}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400 dark:text-slate-400">
                                    <div>IP: {log.ipAddress || 'N/A'}</div>
                                    <div className="text-[9px] text-slate-300 dark:text-slate-500">UA: {(log.userAgent || '').substring(0, 20)}...</div>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                                    {log?.targetId || 'N/A'}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-50 dark:bg-zinc-800/50 dark:border-slate-700/80 font-mono text-slate-500 dark:text-slate-300 max-w-xs overflow-x-auto">
                                      {log?.details ? JSON.stringify(log?.details) : 'None'}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination footer */}
                    {totalPages > 1 && (
                      <div className="p-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                          Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setLocalLogsPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="rounded-lg border border-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40 disabled:opacity-50 cursor-pointer active:scale-95 transition-all duration-300"
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            onClick={() => setLocalLogsPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="rounded-lg border border-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40 disabled:opacity-50 cursor-pointer active:scale-95 transition-all duration-300"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          
          ) : activeTab === 'seo' ? (
            <SeoDashboard token={token || ''} />
          ) : activeTab === 'media' ? (
            <MediaLibrary token={token} />
          ) : activeTab === 'importer' ? (
            <ExtensionImporter token={token || ''} />
          ) : activeTab === 'ai-content' ? (
            <AiContentDashboard token={token || ''} showNotice={(type, message) => triggerAlert(type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info', message)} />
          ) : activeTab === 'sync-dashboard' ? (
            <SyncDashboard token={token || ''} showNotice={(type, message) => triggerAlert(type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info', message)} />
          ) : activeTab === 'security-console' ? (
            <SecurityConsole token={token} triggerAlert={triggerAlert} />
          ) : activeTab === 'adsense-settings' ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    💰 Google AdSense & Site Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Configure real-time publisher client IDs, banner slots, and dynamic ads.txt crawler authorization.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchSettings}
                    disabled={settingsLoading}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    {settingsLoading ? 'Refreshing...' : '🔄 Sync Latest'}
                  </button>
                </div>
              </div>

              {settingsSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-between">
                  <span>✓ {settingsSuccessMsg}</span>
                  <button onClick={() => setSettingsSuccessMsg(null)} className="text-xs font-bold">✕</button>
                </div>
              )}

              {settingsErrorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center justify-between">
                  <span>⚠️ {settingsErrorMsg}</span>
                  <button onClick={() => setSettingsErrorMsg(null)} className="text-xs font-bold">✕</button>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* SECTION 1: PUBLISHER CLIENT ID & TOGGLE */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Google AdSense Account Authorization
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Enter your verified AdSense Publisher ID (e.g. <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-[11px]">ca-pub-XXXXXXXXXXXXXXXX</code>)
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={siteSettingsForm.adsenseEnabled}
                        onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, adsenseEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                      <span className="ml-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {siteSettingsForm.adsenseEnabled ? 'Ads Active' : 'Ads Paused'}
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      AdSense Client Publisher ID
                    </label>
                    <input
                      type="text"
                      value={siteSettingsForm.adsenseClientId}
                      onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, adsenseClientId: e.target.value }))}
                      placeholder="ca-pub-1234567890123456"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Saved to database immediately. Active upon the next page reload for slot renderers, while crawler <code className="text-indigo-400">/ads.txt</code> authorization is subject to standard Google AdSense caching delays (up to 24 hours).
                    </p>
                  </div>
                </div>

                {/* SECTION 2: AD SLOT CONFIGURATION */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Ad Placement Slot Reference IDs
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure specific slot IDs created in your Google AdSense console for each surface.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Header Banner Slot ID
                      </label>
                      <input
                        type="text"
                        value={siteSettingsForm.headerBannerSlot}
                        onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, headerBannerSlot: e.target.value }))}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Product Detail Page Slot ID
                      </label>
                      <input
                        type="text"
                        value={siteSettingsForm.productDetailSlot}
                        onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, productDetailSlot: e.target.value }))}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Blog & Article Page Slot ID
                      </label>
                      <input
                        type="text"
                        value={siteSettingsForm.blogSlot}
                        onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, blogSlot: e.target.value }))}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Home Catalog Feed Slot ID
                      </label>
                      <input
                        type="text"
                        value={siteSettingsForm.homeSlot}
                        onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, homeSlot: e.target.value }))}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: REAL-TIME ADS.TXT PREVIEW */}
                <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Real-Time /ads.txt Crawler Endpoint Output
                    </h4>
                    <a
                      href="/ads.txt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-300 hover:text-indigo-200 underline font-mono"
                    >
                      Open Live /ads.txt &rarr;
                    </a>
                  </div>
                  <pre className="p-3 bg-slate-950 rounded-xl text-emerald-300 font-mono text-xs overflow-x-auto border border-slate-800">
                    {`google.com, ${siteSettingsForm.adsenseClientId.replace('ca-', '')}, DIRECT, f08c47fec0942fa0`}
                  </pre>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Google AdSense crawlers periodically request <code className="text-emerald-400 font-mono">/ads.txt</code> to verify domain ownership and ad revenue authorization.
                  </p>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {settingsLoading ? 'Saving to Database...' : '💾 Save Settings to Real-Time Storage'}
                  </button>
                </div>
              </form>
            </div>
          ) : (

          /* VIEW TAB : TELEMETRY TRAFFIC LOGS */
          telemetryError ? (
            <TabErrorView 
              title="Traffic Logs Sourcing Error" 
              message={telemetryError} 
              onRetry={() => loadAdminMetrics()} 
            />
          ) : (() => {
            const ITEMS_PER_PAGE = 10;
            const totalPages = Math.ceil(analyticsData.length / ITEMS_PER_PAGE);
            const currentLogsPage = Math.min(logsPage, Math.max(1, totalPages));
            const startIndex = (currentLogsPage - 1) * ITEMS_PER_PAGE;
            const paginatedLogs = analyticsData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

            return (
              <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black uppercase text-indigo-500 tracking-wider">Visitor Traffic & Click Logs</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 font-sans font-medium">Real-time record of visitor page views, time spent, browser type, and district location.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleExportAnalyticsCSV}
                  className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-all duration-300 cursor-pointer active:scale-95 shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Export Report (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={handleReloadTraffic}
                  disabled={refreshingTraffic}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all duration-300 cursor-pointer active:scale-95 disabled:opacity-50 shadow-sm"
                >
                  <RefreshCcw className={`h-3 w-3 text-indigo-500 dark:text-indigo-300 ${refreshingTraffic ? 'animate-spin' : ''}`} />
                  <span>{refreshingTraffic ? 'Refreshing...' : 'Reload Traffic'}</span>
                </button>
                <div className="rounded-lg bg-indigo-50 px-3 py-1.5 dark:bg-indigo-950/40">
                  <span className="text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-300 uppercase">
                    Connected Records Count: {analyticsData.length}
                  </span>
                </div>
              </div>
            </div>

            {analyticsData.length === 0 ? (
              <div className="border border-dashed border-slate-100 p-12 rounded-3xl text-center dark:border-slate-700 bg-slate-50/40 dark:bg-slate-950/20 max-w-lg mx-auto my-6">
                <Globe className="h-10 w-10 text-indigo-400 dark:text-indigo-300 mx-auto mb-4 stroke-[1.5]" />
                <h5 className="text-sm font-bold text-slate-700 dark:text-slate-100 mb-1">No Active Traffic Logs Captured</h5>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  No page views, product clicks, or external store affiliate redirects have been logged in the database yet. All organic traffic analytics capture runs live and real-time across devices.
                </p>
              </div>
            ) : (
              isMobile ? (
                <div className="space-y-4">
                  {paginatedLogs.map((a, idx) => {
                    const isPage = a?.eventType === 'page_visit';
                    const isClick = a?.eventType === 'click';
                    const isConv = a?.eventType === 'conversion';
                    const isView = a?.eventType === 'view';
                    const absoluteIndex = startIndex + idx;
                    const recordId = `log-mob-${a._id || absoluteIndex}-${idx}`;
                    const isExpanded = expandedVisitorId === recordId;

                    // Display nice status color badge
                    let statusColor = "bg-slate-50 text-slate-400 dark:bg-slate-700/60 dark:text-slate-300";
                    let statusLabel = a?.eventType;
                    if (isPage) {
                      statusColor = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-300";
                      statusLabel = "Page View";
                    } else if (isClick) {
                      statusColor = "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-300";
                      statusLabel = "Store Link Click";
                    } else if (isConv) {
                      statusColor = "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-300";
                      statusLabel = "Affiliate Exit";
                    } else if (isView) {
                      statusColor = "bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-300";
                      statusLabel = "Product View";
                    }

                    // Display stayed time nicely
                    let stayDisplay = "—";
                    if (isPage && typeof a?.timeSpent === "number") {
                      if (a?.timeSpent === 0) {
                        stayDisplay = "Instant visit";
                      } else if (a?.timeSpent < 60) {
                        stayDisplay = `${a?.timeSpent} sec`;
                      } else {
                        const mins = Math.floor(a?.timeSpent / 60);
                        const secs = a?.timeSpent % 60;
                        stayDisplay = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
                      }
                    }

                    const visitorPlace = a?.district || "Unspecified";
                    const visitorName = a.userId ? (a.userId.name || 'Explorer Member') : 'Guest Visitor';

                    return (
                      <div 
                        key={recordId} 
                        className={`bg-white dark:bg-zinc-800/30 rounded-2xl border border-slate-50 dark:border-slate-700 p-4 shadow-xs space-y-3 transition-all duration-200 cursor-pointer ${isExpanded ? 'ring-1 ring-indigo-400 bg-indigo-50/10 dark:bg-indigo-950/10' : ''}`}
                        onClick={() => setExpandedVisitorId(isExpanded ? null : recordId)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono bg-slate-50 dark:bg-slate-700 text-slate-400 rounded-md px-1.5 py-0.5 font-bold">#{absoluteIndex + 1}</span>
                            <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-black tracking-wide uppercase ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-1 text-[10px] bg-slate-50 dark:bg-slate-700 text-slate-400 px-2 py-1 rounded-md font-bold">
                            <span>{isExpanded ? 'Hide' : 'Details'}</span>
                            {isExpanded ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-300 text-[9px] uppercase tracking-wider block font-bold">Visitor</span>
                            <span className="font-bold text-slate-700 dark:text-slate-105 truncate block">
                              {visitorName}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-300 text-[9px] uppercase tracking-wider block font-bold">Location</span>
                            <span className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300">
                              <span>{getDistrictEmoji(visitorPlace)}</span>
                              <span>{visitorPlace}</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-300 text-[9px] uppercase tracking-wider block font-bold">Timestamp</span>
                            <span className="font-mono text-[10px] text-slate-400 font-bold block">
                              {new Date(a?.timestamp || Date.now()).toLocaleTimeString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-300 text-[9px] uppercase tracking-wider block font-bold">Target</span>
                            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-300 truncate block" title={isPage ? a?.pageUrl : (a?.productId?.name || "Product")}>
                              {isPage ? (a?.pageUrl || "home") : (a?.productId?.name || "Product Item")}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-dashed border-slate-50 dark:border-slate-700 pt-3 mt-1 space-y-3">
                            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-50 dark:bg-slate-950/40 dark:border-slate-700 gap-2 grid grid-cols-2 text-[10px]">
                              <div>
                                <div className="text-slate-300 uppercase font-bold tracking-wider text-[8px]">Device Stack</div>
                                <div className="font-bold text-slate-600 dark:text-slate-200 mt-0.5">{a.browser || "Chrome"}</div>
                                <div className="text-indigo-500 dark:text-indigo-300 font-bold font-mono tracking-tighter mt-0.5">{a.device || "Desktop"}</div>
                              </div>
                              <div>
                                <div className="text-slate-300 uppercase font-bold tracking-wider text-[8px]">IP Address</div>
                                <div className="font-mono font-bold text-slate-600 dark:text-slate-200 mt-1">{a?.ipAddress || "N/A"}</div>
                              </div>
                              <div className="col-span-2 pt-1">
                                <div className="text-slate-300 uppercase font-bold tracking-wider text-[8px]">Action Type & Stay Time</div>
                                <div className="font-bold text-slate-700 dark:text-slate-100 mt-0.5">{statusLabel} ({stayDisplay})</div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center gap-2 pt-1">
                              <span className="text-[9px] text-slate-300 dark:text-slate-400 italic">ID: {a._id || `sim_${absoluteIndex}`}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerAlert("Host Diagnostic Info", `Recorded Host IP: ${a?.ipAddress || "N/A"}\nLocation: ${visitorPlace} District\nBrowser: ${a?.browser || "N/A"}\nDevice: ${a?.device || "N/A"}`);
                                }}
                                className="text-[9px] rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-500 font-bold px-2 py-1 transition-all duration-300 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                Inspect Host IP
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Pagination Navigation Bar for Mobile */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border border-slate-50 px-4 py-3 dark:border-slate-700 bg-slate-50/25 dark:bg-zinc-800/10 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                        disabled={currentLogsPage === 1}
                        className="relative inline-flex items-center rounded-xl border border-slate-100 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:bg-zinc-700 dark:border-slate-600 dark:text-slate-200 disabled:opacity-50 cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogsPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentLogsPage === totalPages}
                        className="relative ml-3 inline-flex items-center rounded-xl border border-slate-100 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:bg-zinc-700 dark:border-slate-600 dark:text-slate-200 disabled:opacity-50 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-xs dark:border-slate-700 dark:bg-zinc-800/40 pb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-widest font-black text-[9px] dark:bg-slate-700/40 dark:border-slate-700 select-none">
                        <tr>
                          <th className="py-3 px-3 text-center w-12">S.No</th>
                          <th className="py-3 px-4">Visitor Name</th>
                          <th className="py-3 px-4">Visitor Place</th>
                          <th className="py-3 px-4">Timestamp & IP</th>
                          <th className="py-3 px-4">Event Type</th>
                          <th className="py-3 px-4">Action Target/Page</th>
                          <th className="py-3 px-4">Platform & Device</th>
                          <th className="py-3 px-4 font-mono text-center">Stay Time</th>
                          <th className="py-3 px-4 text-center">Sole Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-700/60 font-semibold text-slate-500 dark:text-slate-200">
                        {paginatedLogs.map((a, idx) => {
                          const isPage = a?.eventType === 'page_visit';
                          const isClick = a?.eventType === 'click';
                          const isConv = a?.eventType === 'conversion';
                          const isView = a?.eventType === 'view';
                          const absoluteIndex = startIndex + idx;
                          const recordId = `log-desk-${a._id || absoluteIndex}-${idx}`;
                          const isExpanded = expandedVisitorId === recordId;

                          // Display nice status color badge
                          let statusColor = "bg-slate-50 text-slate-400 dark:bg-slate-700/60 dark:text-slate-300";
                          let statusLabel = a?.eventType;
                          if (isPage) {
                            statusColor = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-300";
                            statusLabel = "Page View";
                          } else if (isClick) {
                            statusColor = "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-300";
                            statusLabel = "Store Link Click";
                          } else if (isConv) {
                            statusColor = "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-300";
                            statusLabel = "Affiliate Exit";
                          } else if (isView) {
                            statusColor = "bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-300";
                            statusLabel = "Product View";
                          }

                          // Display stayed time nicely
                          let stayDisplay = "—";
                          if (isPage && typeof a?.timeSpent === "number") {
                            if (a?.timeSpent === 0) {
                              stayDisplay = "Instant visit";
                            } else if (a?.timeSpent < 60) {
                              stayDisplay = `${a?.timeSpent} sec`;
                            } else {
                              const mins = Math.floor(a?.timeSpent / 60);
                              const secs = a?.timeSpent % 60;
                              stayDisplay = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
                            }
                          }

                          const visitorPlace = a?.district || "Unspecified";
                          const visitorName = a.userId ? (a.userId.name || 'Explorer Member') : 'Guest Visitor';

                          return (
                            <React.Fragment key={recordId}>
                              <tr
                                onClick={() => setExpandedVisitorId(isExpanded ? null : recordId)}
                                className={`hover:bg-indigo-50/20 dark:hover:bg-slate-700/30 transition-colors duration-300 cursor-pointer select-none ${isExpanded ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}
                              >
                                {/* S.No */}
                                <td className="py-3.5 px-3 text-center text-slate-300 font-mono text-[11px]">
                                  {absoluteIndex + 1}
                                </td>

                                {/* Visitor Name */}
                                <td className="py-3.5 px-4">
                                  {a.userId ? (
                                    <div className="space-y-0.5">
                                      <span className="font-bold text-slate-800 block dark:text-white leading-tight flex items-center gap-1">
                                        <span className="text-[10px]">👤</span>
                                        {a.userId.name || 'Explorer'}
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-300 tracking-tight block">
                                        {a.userId.email}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-[11px] font-sans text-slate-300 italic leading-tight">
                                      <span className="text-[10px]">🌐</span>
                                      <span>Guest Visitor</span>
                                    </div>
                                  )}
                                </td>

                                {/* Visitor Place */}
                                <td className="py-3.5 px-4">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-200 border border-slate-50/40 dark:border-slate-700">
                                    <span>{getDistrictEmoji(visitorPlace)}</span>
                                    <span>{visitorPlace}</span>
                                  </span>
                                </td>

                                {/* Timestamp & IP */}
                                <td className="py-3.5 px-4 font-normal">
                                  <span className="text-[9px] font-mono font-bold block text-slate-300 dark:text-slate-400 leading-tight">
                                    {new Date(a?.timestamp || Date.now()).toLocaleString()}
                                  </span>
                                  <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300">
                                    {a?.ipAddress || "N/A"}
                                  </span>
                                </td>

                                {/* Event Type */}
                                <td className="py-3.5 px-4">
                                  <span className={`inline-block rounded-md px-2 py-0.5 text-[9px] font-black tracking-wide uppercase ${statusColor}`}>
                                    {statusLabel}
                                  </span>
                                </td>

                                {/* Action Target/Page */}
                                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 dark:text-slate-300 max-w-[180px] truncate" title={isPage ? a?.pageUrl : (a?.productId?.name || "Product")}>
                                  {isPage ? (
                                    a?.pageUrl || "home"
                                  ) : (
                                    a?.productId?.name || "Product Item"
                                  )}
                                </td>

                                {/* Platform & Device */}
                                <td className="py-3.5 px-4 font-bold text-slate-400 text-[10px] dark:text-slate-300 space-y-0.5">
                                  <span className="block text-slate-600 dark:text-slate-200 font-sans">{a.browser || "Chrome"}</span>
                                  <span className="block text-[8px] font-mono tracking-tighter uppercase font-black text-slate-300">{a.device || "Desktop"}</span>
                                </td>

                                {/* Stay Time */}
                                <td className="py-3.5 px-4 font-mono font-bold text-center text-slate-600 dark:text-slate-300">
                                  {stayDisplay}
                                </td>

                                {/* Sole Details Trigger Action */}
                                <td className="py-3.5 px-4 text-center">
                                  <div className="inline-flex items-center gap-1 text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-500 px-2 py-1 rounded-md transition-colors duration-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 font-bold">
                                    <span>{isExpanded ? 'Hide' : 'Show'}</span>
                                    {isExpanded ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                                  </div>
                                </td>
                              </tr>

                              {/* EXPANSIBLE SOLE DETAILS BLOCK CONTAINER */}
                              {isExpanded && (
                                <tr className="bg-slate-50/60 dark:bg-slate-800/60 transition-all duration-300">
                                  <td colSpan={9} className="p-5 border-t border-b border-indigo-50/50 dark:border-indigo-950/50">
                                    <div className="rounded-2xl border border-slate-100/80 bg-white p-5 dark:border-slate-700 dark:bg-slate-950/40 shadow-xs space-y-4">
                                      <div className="flex items-center justify-between border-b border-slate-50 pb-3 dark:border-slate-700/80">
                                        <div className="flex items-center gap-2">
                                          <div className="h-2.5 w-2.5 rounded-full bg-violet-400 animate-pulse"></div>
                                          <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">
                                            Sole Visitor Audit Record (S.No. {absoluteIndex + 1})
                                          </h5>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-300 dark:text-slate-400">Record ID: {a._id || `sim_${absoluteIndex}`}</span>
                                      </div>

                                      {/* Bento Specs grid */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {/* Col 1: Identity specifications */}
                                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-50 dark:bg-slate-800/40 dark:border-slate-700 space-y-2">
                                          <div className="text-[10px] uppercase font-bold text-slate-300">Visitor Identity</div>
                                          <div className="space-y-1">
                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                              <span>👤</span> {visitorName}
                                            </div>
                                            {a.userId && (
                                              <div className="text-[10px] text-slate-400 font-mono italic">{a.userId.email}</div>
                                            )}
                                            <div className="text-[10px] text-slate-400 font-mono">User Class: {a.userId ? "Registered Member" : "Guest / Browsing Web Agent"}</div>
                                          </div>
                                        </div>

                                        {/* Col 2: Geographic specifications */}
                                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 dark:bg-slate-800/40 dark:border-slate-700 space-y-2">
                                          <div className="text-[10px] uppercase font-bold text-slate-300">Visitor Place / Location</div>
                                          <div className="space-y-1">
                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                              <span>{getDistrictEmoji(visitorPlace)}</span>
                                              <span>{visitorPlace} District</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 leading-normal">
                                              Estimated Region: Tamil Nadu, South India Registry
                                            </div>
                                            <div className="text-[10px] text-zinc-300 font-mono">
                                              Region Matcher ID: {visitorPlace.toUpperCase()}_DIS_2026
                                            </div>
                                          </div>
                                        </div>

                                        {/* Col 3: Browser Stack details */}
                                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 dark:bg-slate-800/40 dark:border-slate-700 space-y-2">
                                          <div className="text-[10px] uppercase font-bold text-slate-300">Device Hardware & Engine</div>
                                          <div className="space-y-1 text-slate-600 dark:text-slate-200">
                                            <div className="text-xs font-bold font-sans">
                                              🖥️ {a.browser || "Chrome Standard Web Client"}
                                            </div>
                                            <div className="text-[10px] font-mono text-indigo-500 dark:text-indigo-300 uppercase font-black">
                                              Hardware Group: {a.device || "Desktop Terminal"}
                                            </div>
                                            <div className="text-[10px] text-slate-300 leading-tight block">
                                              Proxy Mask IP: {a?.ipAddress || "N/A"}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Col 4: Session Metrics & actions */}
                                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 dark:bg-slate-800/40 dark:border-slate-700 space-y-2">
                                          <div className="text-[10px] uppercase font-bold text-slate-300">Action & Stay Context</div>
                                          <div className="space-y-1">
                                            <div className="text-xs font-bold flex items-center gap-1">
                                              <span className="h-1.5 w-1.5 rounded-full bg-violet-500"></span>
                                              <span>Type: {statusLabel}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-semibold font-mono leading-tight">
                                              Duration: {stayDisplay} (Seconds: {a?.timeSpent || 0}s)
                                            </div>
                                            <div className="text-[10px] text-indigo-600 font-bold dark:text-indigo-300 truncate max-w-xs" title={isPage ? a?.pageUrl : (a?.productId?.name || "Product")}>
                                              Target: {isPage ? (a?.pageUrl || "/") : (a?.productId?.name || "Affiliate Hub Item")}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Action Footnote with dynamic simulation button */}
                                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-50 dark:border-slate-700/85">
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                                          <span className="text-emerald-400 font-bold">✓ Logged Telemetry</span>
                                          <span>Interaction record logged from client application session.</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            triggerAlert("Host Diagnostic Info", `Recorded Host IP: ${a?.ipAddress || "N/A"}\nLocation: ${visitorPlace} District\nBrowser: ${a?.browser || "N/A"}\nDevice: ${a?.device || "N/A"}`);
                                          }}
                                          className="text-[10px] rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-500 font-bold px-3 py-1.5 transition-all duration-300 dark:border-slate-600 dark:text-slate-305 dark:hover:bg-slate-700 cursor-pointer"
                                        >
                                          Inspect Host IP Registry
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Navigation Bar */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-50 px-4 py-3.5 dark:border-slate-700 bg-slate-50/20 dark:bg-zinc-800/10">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <button
                          type="button"
                          onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                          disabled={currentLogsPage === 1}
                          className="relative inline-flex items-center rounded-xl border border-slate-100 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:bg-zinc-700 dark:border-slate-600 dark:text-slate-200 disabled:opacity-50 cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogsPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentLogsPage === totalPages}
                          className="relative ml-2 inline-flex items-center rounded-xl border border-slate-100 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:bg-zinc-700 dark:border-slate-600 dark:text-slate-200 disabled:opacity-50 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs text-slate-400 dark:text-slate-300">
                            Showing <span className="font-semibold text-slate-800 dark:text-white">{startIndex + 1}</span> to{' '}
                            <span className="font-semibold text-slate-800 dark:text-white">
                              {Math.min(startIndex + ITEMS_PER_PAGE, analyticsData.length)}
                            </span>{' '}
                            of <span className="font-semibold text-slate-800 dark:text-white">{analyticsData.length}</span> logs
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-xl bg-white dark:bg-zinc-700 p-0.5 border border-slate-100/60 dark:border-slate-600" aria-label="Pagination">
                            <button
                              type="button"
                              onClick={() => setLogsPage(1)}
                              disabled={currentLogsPage === 1}
                              className="relative inline-flex items-center rounded-lg px-2 py-1.5 text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-600/60 disabled:opacity-30 cursor-pointer text-[11px] font-bold"
                            >
                              « First
                            </button>
                            <button
                              type="button"
                              onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                              disabled={currentLogsPage === 1}
                              className="relative inline-flex items-center rounded-lg px-2.5 py-1.5 text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-600/60 disabled:opacity-30 cursor-pointer text-[11px] font-bold"
                            >
                              ‹ Prev
                            </button>

                            {(() => {
                              const pages = new Set<number>();
                              pages.add(1);
                              pages.add(totalPages);
                              for (let i = Math.max(1, currentLogsPage - 1); i <= Math.min(totalPages, currentLogsPage + 1); i++) {
                                pages.add(i);
                              }
                              return Array.from(pages).sort((a, b) => a - b);
                            })()
                              .map((p, index, arr) => {
                                const showEllipsisBefore = index > 0 && p - arr[index - 1] > 1;
                                const isCurrent = p === currentLogsPage;
                                return (
                                  <React.Fragment key={p}>
                                    {showEllipsisBefore && (
                                      <span className="relative inline-flex items-center px-3 py-1.5 text-xs font-bold text-slate-300">
                                        ...
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setLogsPage(p)}
                                      className={`relative inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-black transition-all duration-300 cursor-pointer ${
                                        isCurrent
                                          ? 'bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800 scale-102 shadow-2xs'
                                          : 'text-slate-500 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-zinc-600/75'
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  </React.Fragment>
                                );
                              })}

                            <button
                              type="button"
                              onClick={() => setLogsPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentLogsPage === totalPages}
                              className="relative inline-flex items-center rounded-lg px-2.5 py-1.5 text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-600/60 disabled:opacity-30 cursor-pointer text-[11px] font-bold"
                            >
                              Next ›
                            </button>
                            <button
                              type="button"
                              onClick={() => setLogsPage(totalPages)}
                              disabled={currentLogsPage === totalPages}
                              className="relative inline-flex items-center rounded-lg px-2 py-1.5 text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-600/60 disabled:opacity-30 cursor-pointer text-[11px] font-bold"
                            >
                              Last »
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
          );
          })()

          )

        )}

      </div>

      {/* 4. MODAL POPUP: CREATE OR UPDATE PRODUCT SPECIFICATION CARD */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/75 animate-in fade-in duration-200 overflow-y-auto pt-10">
          <div className="max-w-xl w-full bg-white rounded-3xl p-6 border border-slate-50 shadow-2xl dark:bg-zinc-950 dark:border-slate-700 space-y-4 my-8 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-widest uppercase">
                {editingProduct ? 'Edit Product Details' : 'Add New Product'}
              </h3>
              <button
                onClick={() => { setShowProductModal(false); setModalFormTab('basics'); }}
                className="text-slate-300 hover:text-slate-500 font-black cursor-pointer text-sm shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-slate-50 dark:border-slate-700 mb-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setModalFormTab('basics')}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${modalFormTab === 'basics' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-slate-300'}`}
              >
                Basics
              </button>
              <button
                type="button"
                onClick={() => setModalFormTab('dealsSpecs')}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${modalFormTab === 'dealsSpecs' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-slate-300'}`}
              >
                Specs & Media
              </button>
              <button
                type="button"
                onClick={() => setModalFormTab('editorial')}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${modalFormTab === 'editorial' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-slate-300'}`}
              >
                Editorial
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4 text-xs">
              
              {modalFormTab === 'basics' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Product Name</label>
                      <input
                        type="text"
                        required
                        value={prodForm.name}
                        onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Web Link Name (Slug)</label>
                      <input
                        type="text"
                        placeholder="Auto-derived on submit if empty"
                        value={prodForm.slug}
                        onChange={(e) => setProdForm({ ...prodForm, slug: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                      {slugChecking && <p className="text-[10px] text-indigo-400 mt-1 animate-pulse font-semibold">Checking link availability...</p>}
                      {slugCheckError && (
                        <div className="mt-1.5 space-y-1 bg-amber-400/5 border border-amber-400/10 p-2 rounded-lg">
                          <p className="text-[10px] text-amber-500 dark:text-amber-300 font-bold">{slugCheckError}</p>
                          {suggestedSlug && (
                            <button
                              type="button"
                              onClick={() => {
                                setProdForm(prev => ({ ...prev, slug: suggestedSlug }));
                                setSlugCheckError('');
                                setSuggestedSlug('');
                              }}
                              className="text-[9px] bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-white font-black px-2.5 py-1 rounded-md cursor-pointer transition-all duration-300 block w-fit shadow-xs uppercase tracking-wider mt-1"
                            >
                              Auto-fix using: <span className="font-mono underline lowercase">{suggestedSlug}</span>
                            </button>
                          )}
                        </div>
                      )}
                      {!slugChecking && !slugCheckError && slugVerified && (prodForm.slug || prodForm.name).trim().length >= 3 && (
                        <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">✓ Web Link Name is available!</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Brand Name</label>
                      <input
                        type="text"
                        value={prodForm.brand}
                        onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Sale Price (₹)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="999999"
                        step="0.01"
                        value={prodForm.price}
                        onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Product Category</label>
                      <div 
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 cursor-pointer flex justify-between items-center focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                        onClick={() => {
                          setIsCatDropdownOpen(!isCatDropdownOpen);
                          setIsSubcatDropdownOpen(false);
                        }}
                      >
                        <span className="truncate">
                          {categories.find(c => String(c._id) === String(prodForm.category))?.name || "Select Category"}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {isCatDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full z-[100] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
                          {categories.map(c => (
                            <div 
                              key={c._id} 
                              className={`px-3 py-2 text-xs cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700 ${String(prodForm.category) === String(c._id) ? 'bg-indigo-50 dark:bg-slate-700 font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}
                              onClick={() => {
                                setProdForm({ ...prodForm, category: c._id || '', subcategory: "" });
                                setIsCatDropdownOpen(false);
                              }}
                            >
                              {c?.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Product Subcategory</label>
                      <div 
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 cursor-pointer flex justify-between items-center focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                        onClick={() => {
                          setIsSubcatDropdownOpen(!isSubcatDropdownOpen);
                          setIsCatDropdownOpen(false);
                        }}
                      >
                        <span className="truncate">
                          {prodForm.subcategory || "No Subcategory"}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isSubcatDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      {isSubcatDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full z-[100] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
                          <div 
                            className={`px-3 py-2 text-xs cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700 ${!prodForm.subcategory ? 'bg-indigo-50 dark:bg-slate-700 font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}
                            onClick={() => {
                              setProdForm({ ...prodForm, subcategory: "" });
                              setIsSubcatDropdownOpen(false);
                            }}
                          >
                            -- No Subcategory --
                          </div>
                          {(() => {
                            const activeCatId = prodForm.category || categories?.[0]?._id || '';
                            const activeCat = categories.find(c => String(c._id) === String(activeCatId));
                            const subcats = activeCat?.subcategories && Array.isArray(activeCat.subcategories) ? activeCat.subcategories : [];
                            return subcats.map(sub => (
                              <div 
                                key={sub} 
                                className={`px-3 py-2 text-xs cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700 ${prodForm.subcategory === sub ? 'bg-indigo-50 dark:bg-slate-700 font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}
                                onClick={() => {
                                  setProdForm({ ...prodForm, subcategory: sub });
                                  setIsSubcatDropdownOpen(false);
                                }}
                              >
                                {sub}
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Original Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        max="999999"
                        step="0.01"
                        value={prodForm.originalPrice}
                        onChange={(e) => setProdForm({ ...prodForm, originalPrice: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Active Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={prodForm.discount}
                        onChange={(e) => setProdForm({ ...prodForm, discount: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono text-center"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalFormTab === 'dealsSpecs' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Affiliate Referral Link URL</label>
                      <input
                        type="url"
                        required
                        value={prodForm.affiliateLink}
                        onChange={(e) => setProdForm({ ...prodForm, affiliateLink: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono text-[10px]"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Amazon Associate / Affiliate Tag</label>
                      <input
                        type="text"
                        placeholder="e.g. AFFIL_HUB_26"
                        value={prodForm.affiliateCode}
                        onChange={(e) => setProdForm({ ...prodForm, affiliateCode: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono text-center"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Product Image Link(s) (One URL per line, or comma-separated)</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                      value={prodForm.images}
                      onChange={(e) => setProdForm({ ...prodForm, images: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono text-[10px]"
                    />
                    <p className="text-[9px] text-slate-300 leading-tight">
                      Add multiple image URLs for a dynamic multi-image carousel on the detail sheet (loops every 10 seconds).
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Specifications (separated by Semicolon, e.g., Weight=200g;ANC=Active;Battery=30h)</label>
                    <input
                      type="text"
                      placeholder="e.g. Weight=200g;ANC=Mode-1;Drivers=2"
                      value={prodForm.specKeyVal}
                      onChange={(e) => setProdForm({ ...prodForm, specKeyVal: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Key Features list (Separated by Comma)</label>
                    <input
                      type="text"
                      placeholder="e.g. Ultra ANC, Bluetooth 5.3, Long Battery"
                      value={prodForm.features}
                      onChange={(e) => setProdForm({ ...prodForm, features: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-sans"
                    />
                  </div>
                </>
              )}

              {modalFormTab === 'editorial' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-405 block">Pros / Key Good Points (Comma split)</label>
                      <textarea
                        rows={2}
                        value={prodForm.pros}
                        onChange={(e) => setProdForm({ ...prodForm, pros: e.target.value })}
                        className="w-full text-[11px] rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Cons / Key Negatives (Comma split)</label>
                      <textarea
                        rows={2}
                        value={prodForm.cons}
                        onChange={(e) => setProdForm({ ...prodForm, cons: e.target.value })}
                        className="w-full text-[11px] rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Short Description</label>
                    <input
                      type="text"
                      required
                      value={prodForm.description}
                      onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Detailed Description & Review</label>
                    <textarea
                      rows={4}
                      required
                      maxLength={20000}
                      value={prodForm.longDescription}
                      onChange={(e) => setProdForm({ ...prodForm, longDescription: e.target.value.slice(0, 20000) })}
                      className="w-full text-xs rounded-lg border border-slate-100 bg-slate-50 text-slate-800 p-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                    />
                    <p className="text-[10px] text-slate-300 text-right mt-0.5 font-mono">{(prodForm.longDescription || '').length}/20,000</p>
                  </div>

                  <div className="flex items-center gap-6 py-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={prodForm.inStock !== false}
                        onChange={(e) => setProdForm({ ...prodForm, inStock: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-200 text-indigo-500 focus:ring-indigo-400"
                      />
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-widest text-[10px]">In Stock</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={prodForm.trending}
                        onChange={(e) => setProdForm({ ...prodForm, trending: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-200 text-indigo-500 focus:ring-indigo-400"
                      />
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-widest text-[10px]">Trending Choice</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={prodForm.featured}
                        onChange={(e) => setProdForm({ ...prodForm, featured: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-200 text-indigo-500 focus:ring-indigo-400"
                      />
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-widest text-[10px]">Featured Collection</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none border-l border-slate-100 dark:border-slate-800 pl-4" id="auto-close-editorial-toggle">
                      <input
                        type="checkbox"
                        id="auto-close-editorial-input"
                        checked={autoCloseEditorial}
                        onChange={(e) => setAutoCloseEditorial(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-200 text-indigo-500 focus:ring-indigo-400 cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest text-[10px]">Auto-Close on Save</span>
                    </label>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs py-3 cursor-pointer shadow-md transition-all duration-300 active:scale-97"
              >
                Save Product to Catalog
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Custom Confirmation Modal overlay (bypassing sandboxed confirm blocker) */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDestructive={!!confirmDialog.isDestructive}
        cancelText={confirmDialog.cancelText || ''}
        confirmText={confirmDialog.confirmText || ''}
        onConfirm={confirmDialog.onConfirm || (() => {})}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />



      {/* Custom Alert/Notification Modal overlay (bypassing sandboxed alert blocker) */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        message={alertDialog.message}
        onDismiss={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};
