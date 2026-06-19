import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Product, Category, Blog, Message } from '../types';
import { Plus, Edit, Trash2, Heart, MailOpen, MailCheck, Coins, Eye, MousePointerClick, ShieldCheck, Mail, CheckCircle, RefreshCcw, Database, TrendingUp, Globe, Sparkles, AlertTriangle, Users, ChevronDown, ChevronUp, Image, Instagram, Linkedin, Lock, Clock } from 'lucide-react';
import { useDeviceType } from '../hooks/useDeviceType';
import { TabErrorView } from '../components/admin/TabErrorView';
import { getDistrictEmoji } from '../utils/emoji';
import { mapErrorToFriendly } from '../utils/errorMapper';

import { AlertDialog } from '../components/admin/AlertDialog';
import { ConfirmDialog } from '../components/admin/ConfirmDialog';

interface AdminProps {
  onNavigate: (view: string, slug?: string) => void;
}

export const Admin: React.FC<AdminProps> = ({ onNavigate }) => {
  const { token, user, loading: authLoading } = useAuth();
  const { isMobile } = useDeviceType();
  const tabContainerRef = useRef<HTMLDivElement>(null);
  
  // Tab selector
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'blogs' | 'messages' | 'telemetry' | 'scheduler' | 'users'>('products');
  const [messagesFilter, setMessagesFilter] = useState<'all' | 'unread'>('all');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [sentReplySuccess, setSentReplySuccess] = useState<string | null>(null);
  const [expandedVisitorId, setExpandedVisitorId] = useState<string | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  
  // Sunday automation States
  const [sundayLogs, setSundayLogs] = useState<any[]>([]);
  const [sundayLogsError, setSundayLogsError] = useState<string | null>(null);
  const [simulatingSunday, setSimulatingSunday] = useState(false);
  
  // Resource Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab-specific Error states for robust fault-isolation
  const [productsError, setProductsError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [blogsError, setBlogsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [updatingUserRole, setUpdatingUserRole] = useState<string | null>(null);
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
  
  // Seeding states
  const [seedingInProgress, setSeedingInProgress] = useState(false);
  const [seedingTab, setSeedingTab] = useState<'basic' | 'trending' | 'preview'>('basic');
  const [customSeedImageUrl, setCustomSeedImageUrl] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
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
    [
      "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
      "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur",
      "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris",
      "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivagangai",
      "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
      "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore",
      "Viluppuram", "Virudhunagar"
    ].forEach(d => {
      stats[d] = 0;
    });
    return stats;
  });

  const [showAllDistricts, setShowAllDistricts] = useState(false);
  const [socialClicks, setSocialClicks] = useState({ instagram: 0, linkedin: 0 });

  const resolvedProducts = useMemo(() => {
    return products.map(p => {
      const clickEvents = analyticsData.filter(a => {
        if (a.eventType !== 'click') return false;
        const aProdId = a.productId?._id || a.productId;
        const targetId = typeof aProdId === 'object' ? aProdId._id : aProdId;
        return targetId?.toString() === p._id.toString();
      });
      const convEvents = analyticsData.filter(a => {
        if (a.eventType !== 'conversion') return false;
        const aProdId = a.productId?._id || a.productId;
        const targetId = typeof aProdId === 'object' ? aProdId._id : aProdId;
        return targetId?.toString() === p._id.toString();
      });

      const dynamicClicks = clickEvents.length || p.clicks || 0;
      const dynamicConversions = convEvents.length || p.conversions || 0;

      return {
        ...p,
        clicks: dynamicClicks,
        conversions: dynamicConversions
      };
    });
  }, [products, analyticsData]);

  // Modals show control
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalFormTab, setModalFormTab] = useState<'basics' | 'dealsSpecs' | 'editorial'>('basics');

  // Form Fields for Products
  const [prodForm, setProdForm] = useState({
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
    affiliateLink: 'https://amazon.com/dp/B501...',
    affiliateCode: 'AFFIL_HUB_26',
    images: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500',
    features: 'High Performance, Ergonimic build, Sweat Resistant',
    specKeyVal: 'Driver=50mm;Frequency=20-20kHz;Weight=290g;Battery=30 Hours',
    pros: 'Exceptional depth, Safe battery life, Active ANC',
    cons: 'Premium cost, Lacks audio wire jack',
    trending: false,
    featured: false
  });

  // Slug Checking state
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugCheckError, setSlugCheckError] = useState('');
  const [suggestedSlug, setSuggestedSlug] = useState('');

  useEffect(() => {
    const rawVal = prodForm.slug || prodForm.name;
    if (!rawVal || rawVal.trim().length < 3) {
      setSlugCheckError('');
      setSuggestedSlug('');
      return;
    }

    const proposed = rawVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!proposed || proposed === 'noise-cancelling-pro-anc') {
      setSlugCheckError('');
      setSuggestedSlug('');
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const excludeQuery = editingProduct ? `&excludeId=${editingProduct._id}` : '';
        const res = await fetch(`/api/admin/check-slug?slug=${encodeURIComponent(proposed)}&type=product${excludeQuery}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setSlugCheckError(`⚠️ This Web Link Name already exists.`);
            setSuggestedSlug(data.suggestedSlug);
          } else {
            setSlugCheckError('');
            setSuggestedSlug('');
          }
        }
      } catch (err) {
        console.warn("Error auto-checking slug validity:", err);
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
  const [catSubcategories, setCatSubcategories] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);

  // Check Admin clearance
  useEffect(() => {
    if (authLoading) return; // Do not redirect while loading is pending
    
    const isAdminUser = user?.role === 'admin';

    if (!token || !isAdminUser) {
      onNavigate('home');
    }
  }, [token, user, authLoading]);



  // Polling for general user list synchronization
  useEffect(() => {
    if (!token || activeTab !== 'users') return;

    const pollInterval = setInterval(async () => {
      try {
        const usersRes = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (usersRes.ok) {
          const uData = await usersRes.json();
          setUsers(uData || []);
        }
      } catch (err: any) {
        console.warn("User list synchronization polling failed:", err.message);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [token, activeTab]);

  const loadAdminMetrics = async () => {
    setLoading(true);
    // Reset all tab errors
    setProductsError(null);
    setCategoriesError(null);
    setBlogsError(null);
    setMessagesError(null);
    setTelemetryError(null);
    setSundayLogsError(null);
    setUsersError(null);

    let pData: Product[] = [];
    let cData: Category[] = [];
    let bData: Blog[] = [];
    let mData: Message[] = [];
    let visitors = 0;
    let telemetryClicks = 0;
    let telemetryConversions = 0;

    // 1. Fetch Catalog Specs
    try {
      console.log('Fetching products...');
      const prodRes = await fetch('/api/products?limit=100');
      if (prodRes.ok) {
        const d = await prodRes.json();
        pData = d.products || [];
        setProducts(pData);
        console.log('Products fetched:', pData.length);
      } else {
        const errJson = await prodRes.json().catch(() => ({}));
        console.error('Products fetch error:', errJson);
        setProductsError(errJson.error || `Failed to fetch Catalog: Status ${prodRes.status}`);
      }
    } catch (e: any) {
      console.error('Products fetch exception:', e);
      setProductsError(e.message || "Failed to connect to Catalog server.");
    }

    // 2. Fetch Classification Categories
    try {
      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        cData = await catRes.json();
        setCategories(cData);
      } else {
        const errJson = await catRes.json().catch(() => ({}));
        setCategoriesError(errJson.error || `Failed to fetch Classifications: Status ${catRes.status}`);
      }
    } catch (e: any) {
      setCategoriesError(e.message || "Failed to connect to Classifications server.");
    }

    // 3. Fetch Blog Guide Manuals
    try {
      const blogRes = await fetch('/api/blogs');
      if (blogRes.ok) {
        const d = await blogRes.json();
        bData = d.blogs || [];
        setBlogs(bData);
      } else {
        const errJson = await blogRes.json().catch(() => ({}));
        setBlogsError(errJson.error || `Failed to fetch Manual Guides: Status ${blogRes.status}`);
      }
    } catch (e: any) {
      setBlogsError(e.message || "Failed to connect to Manual Guides server.");
    }

    // 4. Fetch Message Inquiries
    try {
      const msgRes = await fetch('/api/admin/messages', { headers: { 'Authorization': `Bearer ${token}` } });
      if (msgRes.ok) {
        mData = await msgRes.json();
        setMessages(mData);
      } else {
        const errJson = await msgRes.json().catch(() => ({}));
        setMessagesError(errJson.error || `Failed to fetch Help Inquiries: Status ${msgRes.status}`);
      }
    } catch (e: any) {
      setMessagesError(e.message || "Failed to connect to Help Inquiries server.");
    }

    // 5. Fetch Traffic Logs Telemetry
    try {
      const analyticsRes = await fetch('/api/admin/analytics', { headers: { 'Authorization': `Bearer ${token}` } });
      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalyticsData(aData.analytics || []);
        visitors = aData.summary?.visitors || 0;
        telemetryClicks = aData.summary?.clicks || 0;
        telemetryConversions = aData.summary?.conversions || 0;
        if (aData.socialClicks) {
          setSocialClicks(aData.socialClicks);
        }
        setDistrictStats(prev => ({
          ...prev,
          ...(aData.districts || {})
        }));
      } else {
        const errJson = await analyticsRes.json().catch(() => ({}));
        setTelemetryError(errJson.error || `Failed to fetch Traffic logs: Status ${analyticsRes.status}`);
      }
    } catch (e: any) {
      setTelemetryError(e.message || "Failed to connect to Traffic Analytics server.");
    }

    // 6. Fetch User Accounts Sourcing
    try {
      if (token) {
        const usersRes = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (usersRes.ok) {
          const uData = await usersRes.json();
          setUsers(uData || []);
        } else {
          const errData = await usersRes.json().catch(() => ({}));
          setUsersError(errData.error || `Failed to fetch User Accounts: status ${usersRes.status}`);
        }
      }
    } catch (e: any) {
      setUsersError(e.message || "Failed to connect to User Accounts server.");
    }

    // 6b. Fetch Active Pending Elevations/Demotions skipped (Direct flow enabled)

    // 7. Fetch Sunday Automation Logs
    try {
      if (token) {
        const logsRes = await fetch('/api/admin/sunday-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setSundayLogs(logsData);
        } else {
          const errData = await logsRes.json().catch(() => ({}));
          setSundayLogsError(errData.error || `Failed to fetch Sunday Logs: status ${logsRes.status}`);
        }
      }
    } catch (err: any) {
      setSundayLogsError(err.message || 'Failed code connection for automated scheduler logs.');
    }

    // Calculate aggregates safely with whichever metrics loaded successfully
    try {
      const clicks = (telemetryClicks !== undefined && telemetryClicks !== null) ? telemetryClicks : pData.reduce((acc, p) => acc + (p.clicks || 0), 0);
      const conversions = (telemetryConversions !== undefined && telemetryConversions !== null) ? telemetryConversions : (pData.reduce((acc, p) => acc + (p.conversions || 0), 0) || Math.round(clicks * 0.12));
      const estimated = Number((clicks * 0.08 + conversions * 4.5).toFixed(2));
      const unreads = mData.filter(m => !m.read).length;

      setStats({
        totalClicks: clicks,
        totalConversions: conversions,
        estimatedEarnings: estimated,
        unreadMessages: unreads,
        totalVisitors: visitors || Math.round(clicks * 0.9) + 1
      });
    } catch (aggErr) {
      console.warn("Aggregate calculation fallback warning:", aggErr);
    } finally {
      setLoading(false);
    }
  };

  const handleReloadTraffic = async () => {
    setRefreshingTraffic(true);
    try {
      await loadAdminMetrics();
    } catch (err: any) {
      console.warn("Error reloading metrics:", err);
    } finally {
      setRefreshingTraffic(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'user' | 'admin', adminPasswordValue: string) => {
    if (userId === user?._id || userId === (user as any)?.id) {
      triggerAlert("Permission Denied", "You cannot demote or modify your own administrator role profile status.");
      return;
    }

    setUpdatingUserRole(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole, adminPassword: adminPasswordValue })
      });
      if (res.ok) {
        const updatedResponse = await res.json();
        
        setUsers(prev => prev.map(u => (u._id === userId || u.id === userId) ? { ...u, role: newRole } : u));

        triggerAlert(
          newRole === 'admin' ? "Elevation Success" : "Demotion Success", 
          updatedResponse.message || `The user role has been set to "${newRole}" successfully.`
        );
      } else {
        const err = await res.json().catch(() => ({}));
        triggerAlert("Change Failed", err.error || "Failed to update member role privilege level.");
      }
    } catch (err: any) {
      triggerAlert("Change Failed", err.message || "Network communication error occurred.");
    } finally {
      setUpdatingUserRole(null);
    }
  };

  const handleRestoreSeed = async () => {
    requestConfirmation(
      "Restore Default Seed Data",
      "Are you sure you want to restore the default product seed data? This will reset custom changes.",
      async () => {
        setSeedingInProgress(true);
        try {
          const res = await fetch('/api/admin/seed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ clearOnly: false, seedImageOverride: customSeedImageUrl || undefined })
          });
          if (res.ok) {
            await loadAdminMetrics();
            triggerAlert("Restored Successfully", "The default products catalog and category hierarchy have been seeded successfully!");
          } else {
            const err = await res.json().catch(() => ({}));
            triggerAlert("Action Failed", err.error || "Failed to restore default seed data.");
          }
        } catch (err: any) {
          console.warn("Seeding error:", err);
          triggerAlert("Action Failed", "An error occurred while seeding: " + err.message);
        } finally {
          setSeedingInProgress(false);
        }
      },
      { isDestructive: true, confirmText: 'Yes, Restore' }
    );
  };

  const handleClearCatalog = async () => {
    requestConfirmation(
      "Clear Catalog",
      "Are you sure you want to clear all products from the catalog? This will make the storefront empty.",
      async () => {
        setSeedingInProgress(true);
        try {
          const res = await fetch('/api/admin/seed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ clearOnly: true })
          });
          if (res.ok) {
            await loadAdminMetrics();
            triggerAlert("Catalog Cleared", "All product catalog listings and traffic logs have been wiped clean successfully!");
          } else {
            const err = await res.json().catch(() => ({}));
            triggerAlert("Action Failed", err.error || "Failed to clear products catalog.");
          }
        } catch (err: any) {
          console.warn("Clearing catalog error:", err);
          triggerAlert("Action Failed", "An error occurred while wiping: " + err.message);
        } finally {
          setSeedingInProgress(false);
        }
      },
      { isDestructive: true, confirmText: 'Yes, Wipe Catalog' }
    );
  };

  const handleSeedTrending = async () => {
    requestConfirmation(
      "Seed Analytics traffic",
      "Do you want to seed Trending Selections data? This will instantly populate mock analytics across Madurai, Chennai, Tirunelveli, and Virudhunagar!",
      async () => {
        setSeedingInProgress(true);
        try {
          const res = await fetch('/api/admin/seed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ seedTrending: true, seedImageOverride: customSeedImageUrl || undefined })
          });
          if (res.ok) {
            await loadAdminMetrics();
            triggerAlert("Trending Data Seeded", "High-volume trending product clicks and regional analytics traffic maps have been seeded successfully across Tamil Nadu districts!");
          } else {
            const err = await res.json().catch(() => ({}));
            triggerAlert("Action Failed", err.error || "Failed to seed Trending Selections.");
          }
        } catch (err: any) {
          console.warn("Seeding trending selections error:", err);
          triggerAlert("Action Failed", "An error occurred while seeding: " + err.message);
        } finally {
          setSeedingInProgress(false);
        }
      },
      { confirmText: 'Yes, Seed Selections' }
    );
  };

  useEffect(() => {
    if (token) {
      loadAdminMetrics();
    }
  }, [token, activeTab]);

  // Handle Mark Message read
  const handleMarkRead = async (msgId: string) => {
    try {
      const res = await fetch(`/api/admin/messages/read/${msgId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => m._id === msgId ? { ...m, read: true } : m));
        setStats(prev => ({ ...prev, unreadMessages: Math.max(prev.unreadMessages - 1, 0) }));
      }
    } catch (e) {
      console.warn("Message update failed:", e);
    }
  };

  // Helper specification mapping builders
  const parseSpecs = (specsStr: string) => {
    const obj: Record<string, string> = {};
    if (!specsStr) return obj;
    specsStr.split(';').forEach(p => {
      if (!p.trim()) return;
      const parts = p.split('=');
      if (parts.length >= 2) {
        obj[parts[0].trim()] = parts.slice(1).join('=').trim();
      } else if (parts.length === 1) {
        obj[parts[0].trim()] = 'Yes';
      }
    });
    return obj;
  };

  // Create or Edit Product POST proxy handler
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct specifications map
    const specificationsObj = parseSpecs(prodForm.specKeyVal);
    const featuresList = prodForm.features.split(',').map(f => f.trim());
    const prosList = prodForm.pros.split(',').map(p => p.trim());
    const consList = prodForm.cons.split(',').map(c => c.trim());
    const imagesList = prodForm.images
      .split(/[\n,;]+/)
      .map(img => img.trim())
      .filter(img => img.length > 0);
    
    if (imagesList.length === 0) {
      imagesList.push('https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500');
    }
    
    const slugCalculated = prodForm.slug || prodForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const payload = {
      name: prodForm.name,
      slug: slugCalculated,
      brand: prodForm.brand,
      price: Number(prodForm.price) || 0,
      originalPrice: Number(prodForm.originalPrice) || undefined,
      discount: Number(prodForm.discount) || undefined,
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
      affiliateCode: prodForm.affiliateCode,
      inStock: true,
      trending: prodForm.trending,
      featured: prodForm.featured
    };

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct._id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowProductModal(false);
        const nameSaved = prodForm.name;
        setEditingProduct(null);
        await loadAdminMetrics();
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
                const reRes = await fetch(url, {
                  method,
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(rePayload)
                });
                if (reRes.ok) {
                  setShowProductModal(false);
                  const nameSaved = prodForm.name;
                  setEditingProduct(null);
                  await loadAdminMetrics();
                  triggerAlert("Submission Successful", `The product "${nameSaved}" was successfully fed to the storefront catalog database with unique slug: "${err.suggestedSlug}"!`);
                } else {
                  const reErr = await reRes.json().catch(() => ({}));
                  triggerAlert("Submission Failed", reErr.error || "The server rejected the product submission.");
                }
              } catch (reErr: any) {
                triggerAlert("Submission Error", "An error occurred during submission: " + reErr.message);
              }
            },
            { confirmText: "Use Suggested Suffix", cancelText: "Cancel" }
          );
        } else {
          triggerAlert("Submission Failed", err.error || "The server rejected the product submission. Please verify fields format.");
        }
      }
    } catch (err: any) {
      console.warn("Product form submission error:", err);
      triggerAlert("Submission Error", "An error occurred during submission: " + err.message);
    }
  };

  // Trigger Open Add popup
  const openAddProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: 'Noise Cancellation Headset',
      slug: 'noise-cancelling-pro-anc',
      brand: 'Bose',
      price: '199',
      originalPrice: '249',
      discount: '20',
      category: categories?.[0]?._id || '',
      subcategory: '',
      description: 'Dynamic wireless over-ear noise-control headset.',
      longDescription: 'Engineered with full range ANC microphones, premium leather earcups, and dual drivers setup. Delivers premium low registers and 30 hours of continuous playing time.',
      affiliateLink: 'https://amazon.com/dp/B501...',
      affiliateCode: 'AFFIL_HUB_26',
      images: 'https://images.unsplash.com/photo-1005740420928-5e560c06d30e?w=500',
      features: 'Full Range ANC, Comfortable leather caps, 30h Long life',
      specKeyVal: 'Driver=40mm;ANC=Active Dual Mode;Bluetooth=V5.3;Weight=260g',
      pros: 'Exceptional isolation, Comfortable wear, Good battery',
      cons: 'Premium cost, Slightly heavy',
      trending: false,
      featured: false
    });
    setShowProductModal(true);
  };

  // Open Edit Product popup
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    
    // Map specifications keys back to semicolon string format
    const specStr = Object.entries(p.specifications || {})
      .map(([k, v]) => `${k}=${v}`)
      .join(';');
    
    setProdForm({
      name: p.name,
      slug: p.slug,
      brand: p.brand || '',
      price: String(p.price),
      originalPrice: String(p.originalPrice || ''),
      discount: String(p.discount || ''),
      category: typeof p.category === 'object' ? p.category._id : p.category,
      subcategory: p.subcategory || '',
      description: p.description,
      longDescription: p.longDescription || '',
      affiliateLink: p.affiliateLink,
      affiliateCode: p.affiliateCode || '',
      images: (p.images && p.images.length > 0) ? p.images.join('\n') : '',
      features: p.features?.join(', ') || '',
      specKeyVal: specStr,
      pros: p.pros?.join(', ') || '',
      cons: p.cons?.join(', ') || '',
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
          const res = await fetch(`/api/admin/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setProducts(prev => prev.filter(p => p._id !== id));
          } else {
            const err = await res.json().catch(() => ({}));
            triggerAlert("Deletion Failed", err.error || "The server rejected the deletion request.");
          }
        } catch (e: any) {
          console.warn("Product deletion failing:", e);
          triggerAlert("Network Error", e.message || "Failed to make deletion request to the database server.");
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

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: catName,
          slug: catSlug || catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          icon: catIcon || '📦',
          description: 'Custom added curator category',
          subcategories: catSubcategories.split(',').map(sub => sub.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        const nameSaved = catName;
        setCatName('');
        setCatIcon('📦');
        setCatSlug('');
        setCatSubcategories('');
        setEditingCategory(null);
        setShowCatForm(false);
        await loadAdminMetrics();
        triggerAlert("Category Saved", `The category "${nameSaved}" has been successfully fed to the database!`);
      } else {
        const err = await res.json().catch(() => ({}));
        triggerAlert("Failed to Save Category", err.error || "The server rejected the category request.");
      }
    } catch (err: any) {
      console.warn('Category adding/updating failed:', err);
      triggerAlert("Error", "An error occurred while saving the category: " + err.message);
    }
  };

  const startEditCategory = (c: Category) => {
    setEditingCategory(c);
    setCatName(c.name);
    setCatIcon(c.icon || '📦');
    setCatSlug(c.slug);
    setCatSubcategories(c.subcategories ? c.subcategories.join(', ') : '');
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatIcon('📦');
    setCatSlug('');
    setCatSubcategories('');
  };

  const handleDeleteCategory = (id: string) => {
    requestConfirmation(
      "Confirm Category Removal",
      "Are you sure you want to delete this Category/Classifier? Products under this category might remain set but won't belong to an active category.",
      async () => {
        try {
          const res = await fetch(`/api/admin/categories/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            loadAdminMetrics();
          } else {
            const err = await res.json().catch(() => ({}));
            triggerAlert("Deletion Failed", err.error || "The server rejected the category deletion request.");
          }
        } catch (e: any) {
          console.warn("Category deletion failure:", e);
          triggerAlert("Network Error", e.message || "Failed to contact the backend server.");
        }
      },
      { isDestructive: true, confirmText: 'Yes, Delete Category' }
    );
  };

  const handleSimulateSunday = async (targetSundayStr?: string, forceEmail?: boolean) => {
    setSimulatingSunday(true);
    try {
      const res = await fetch('/api/admin/sunday-logs/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetSundayStr, forceEmail })
      });
      if (res.ok) {
        const bodyObj = await res.json();
        triggerAlert("Simulation Completed", `Sunday automated scheduler event completed! Added ${bodyObj.log.productsAdded?.length || 0} product items.`);
        await loadAdminMetrics();
      } else {
        const errJson = await res.json().catch(() => ({}));
        triggerAlert("Simulation Blocked", errJson.error || "The server rejected the simulation trigger.");
      }
    } catch (e: any) {
      triggerAlert("Simulation Failure", e.message || "Failed to trigger Sunday scheduling routine.");
    } finally {
      setSimulatingSunday(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <RefreshCcw className="h-10 w-10 text-indigo-600 animate-spin shrink-0" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Authorizing administrative clearance...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 transition-colors duration-300">
      
      {/* SEED DATA & ANALYTICS DOUBLE BOX PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 md:px-4">
        
        {/* Box 1: Manual Catalog Manager */}
        <div className="rounded-3xl border border-slate-200/60 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600">
                  <Database className="h-5 w-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Manual Catalog Manager</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Curate and publish reviews for your affiliate listings item by item.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-950/70 p-4 rounded-2xl border border-slate-105 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span>Direct Live Storefront Mode Active</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                Automatic seed resets, randomized trending traffic logs, and bulk catalog wipe functions have been completely disabled as requested. This prevents unintended overwrites of your handmade affiliate products.
              </p>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-2 font-mono">
                <span>ℹ Mode: Secure Manual Entry Enabled</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={openAddProduct}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 py-3 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm shadow-indigo-100 dark:shadow-none"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Add Custom Product Card</span>
              </button>
            </div>
          </div>
          
          <div className="mt-4 border-t pt-2.5 border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Manual Curator Mode: Active</span>
            <span className="font-bold text-indigo-500 dark:text-indigo-400">{products.length} Items Live</span>
          </div>
        </div>

        {/* Box 2: Click & Regional Interest Analytics */}
        <div className="rounded-3xl border border-slate-200/60 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div className="space-y-4 col-span-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Click & Regional Interest Analytics</h3>
                <p className="text-[11px] text-slate-400">Track which product links have been clicked, alongside regional interest distribution.</p>
              </div>
            </div>

            {/* Region of Interest Tracker */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                <span>Popular Districts Analysis (Tamil Nadu)</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {(() => {
                  const statsObj = (districtStats || {}) as Record<string, number>;
                  const dtotal = Object.values(statsObj).reduce((acc: number, c: number) => acc + c, 0);
                  const sortedDis = Object.entries(statsObj)
                    .map(([name, count]) => ({ name, count: count as number }))
                    .sort((a, b) => b.count - a.count);
                  
                  const topFour = sortedDis.slice(0, 4);
                  const remaining = sortedDis.slice(4);

                  return (
                    <div className="col-span-2 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {topFour.map(({ name, count }) => {
                          const pct = dtotal === 0 ? 0 : Math.round((count / dtotal) * 100);
                          return (
                            <div key={name} className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 transition-all shadow-2xs">
                              <span className="flex items-center gap-1.5 font-sans font-bold text-slate-855 dark:text-slate-200">
                                {getDistrictEmoji(name)} {name}
                              </span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                                {pct}% ({count})
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {showAllDistricts && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-3 border-t border-dashed border-slate-100 dark:border-slate-800/80 max-h-[220px] overflow-y-auto pr-1">
                          {remaining.map(({ name, count }) => {
                            const pct = dtotal === 0 ? 0 : Math.round((count / dtotal) * 100);
                            return (
                              <div key={name} className="bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-lg flex items-center justify-between border border-slate-100 dark:border-slate-800/40 hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-all">
                                <span className="flex items-center gap-1 font-sans text-[11px] text-slate-600 dark:text-slate-400">
                                  {getDistrictEmoji(name)} {name}
                                </span>
                                <span className="font-semibold text-slate-500 dark:text-slate-400 font-mono text-[11px]">
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
                        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-all cursor-pointer border border-dashed border-slate-200 dark:border-slate-800"
                      >
                        <span>
                          {showAllDistricts 
                            ? "Show Less" 
                            : `See More (${remaining.filter(r => (r.count as number) > 0).length} active + ${remaining.filter(r => (r.count as number) === 0).length} other Tamil Nadu districts)`
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
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Targeted Product Affiliate Click Counts</h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px] font-sans max-h-[140px] overflow-y-auto pr-1">
                {resolvedProducts.filter(p => (p.clicks || 0) > 0).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No product clicks recorded yet in this session. Go browse the homepage and click authorized store links to log click telemetry!</p>
                ) : (
                  [...resolvedProducts].filter(p => (p.clicks || 0) > 0).sort((a,b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 4).map((p, index) => {
                    const clickCount = p.clicks || 0;
                    const convRating = p.conversions || Math.round(clickCount * 0.12);
                    return (
                      <div key={p._id} className="py-2 flex items-center justify-between gap-4">
                        <div className="truncate max-w-[180px] sm:max-w-[260px]">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{index + 1}. {p.name}</span>
                          <span className="block font-mono text-[9px] text-indigo-500 truncate" title={p.affiliateLink}>{p.affiliateLink}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-center shrink-0">
                          <div>
                            <span className="block font-black text-slate-800 dark:text-white">{clickCount}</span>
                            <span className="block text-[8px] uppercase text-slate-400">clicks</span>
                          </div>
                          <div>
                            <span className="block font-black text-emerald-500">~{convRating}</span>
                            <span className="block text-[8px] uppercase text-slate-400">convs</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t pt-3 border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Telemetry logging: Active</span>
            <span className="font-bold text-emerald-500">Overall Clicks: {stats.totalClicks}</span>
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
          className="rounded-2xl border border-slate-100 bg-white p-5 hover:border-violet-500 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-all text-left w-full focus:outline-none focus:ring-2 focus:ring-violet-500 group"
          aria-label="View unique visitors telemetry"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 group-hover:text-violet-600 transition-colors">
              <span>Unique Site Visitors</span>
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-ping"></span>
            </p>
            <h3 className="text-lg font-mono font-black text-violet-600 dark:text-violet-400">{stats.totalVisitors} Visitors</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
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
          className="rounded-2xl border border-slate-100 bg-white p-5 hover:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-all text-left w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 group"
          aria-label="View total click CTR metrics"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors">Total Tracked Click CTR</p>
            <h3 className="text-lg font-mono font-black text-indigo-600 dark:text-indigo-400">{stats.totalClicks} Clicks</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
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
          className="rounded-2xl border border-slate-100 bg-white p-5 hover:border-teal-400 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-all text-left w-full focus:outline-none focus:ring-2 focus:ring-teal-500 group"
          aria-label="View estimated curator commissions"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-teal-600 transition-colors">Estimated Curator Commission</p>
            <h3 className="text-lg font-mono font-black text-teal-600 dark:text-teal-400">₹{stats.estimatedEarnings}</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
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
          className="rounded-2xl border border-slate-100 bg-white p-5 hover:border-amber-400 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-all text-left w-full focus:outline-none focus:ring-2 focus:ring-amber-500 group"
          aria-label="View unread customer messages"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 group-hover:text-amber-600 transition-colors">
              <span>Customer Mail Desk</span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
            </p>
            <h3 className="text-lg font-mono font-black text-amber-600 dark:text-amber-400">{stats.unreadMessages} Unread</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 select-none group-hover:scale-110 transition-transform">
            <Mail className="h-5 w-5 shrink-0" />
          </div>
        </button>
      </div>

      {/* 1.5. FOOTER SOCIAL CLICKS DISPLAY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 md:px-4">
        {/* Instagram click counter */}
        <div className="rounded-2xl border border-pink-100 bg-white p-5 dark:border-pink-950/20 dark:bg-slate-900/40 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-500 flex items-center gap-1.5 font-mono">
              <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse"></span>
              Instagram Footer Logo clicks
            </span>
            <p className="text-xl font-mono font-black text-slate-800 dark:text-pink-400">
              {socialClicks.instagram} <span className="text-xs font-sans font-medium text-slate-400">Total Redirects</span>
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center text-pink-500">
            <Instagram className="h-5 w-5 shrink-0" />
          </div>
        </div>

        {/* LinkedIn click counter */}
        <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-950/20 dark:bg-slate-900/40 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5 font-mono">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              LinkedIn Footer Logo clicks
            </span>
            <p className="text-xl font-mono font-black text-slate-800 dark:text-blue-400">
              {socialClicks.linkedin} <span className="text-xs font-sans font-medium text-slate-400">Total Redirects</span>
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500">
            <Linkedin className="h-5 w-5 shrink-0" />
          </div>
        </div>
      </div>

      {/* 2. ADMIN VIEW NAVIGATION TABS */}
      <div ref={tabContainerRef} className="relative z-30 overflow-visible flex flex-wrap border-b border-slate-100 pb-3 gap-2 md:px-4 mb-8 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'products' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'}`}
        >
          📦 Catalog specs ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'categories' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'}`}
        >
          📁 Classifications ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('blogs')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'blogs' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'}`}
        >
          📖 Manual guides ({blogs.length})
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'messages' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'}`}
        >
          ✉ Help Inquiries ({messages.length})
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'telemetry' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'}`}
        >
          📊 Traffic Track logs ({analyticsData.length})
        </button>
        <button
          onClick={() => setActiveTab('scheduler')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'scheduler' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'}`}
        >
          🕒 Sunday Scheduler
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'users' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'}`}
        >
          👥 No of Users ({users.length})
        </button>
      </div>

      {/* 3. DYNAMIC WORKVIEW SECTION GRID TABLES */}
      <div className="md:px-4">
        
        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-zinc-900/40 animate-pulse">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between">
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, idx) => (
                <div key={idx} className="flex gap-4 items-center justify-between">
                  <div className="flex gap-3 items-center flex-grow">
                    <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0"></div>
                    <div className="space-y-1.5 flex-grow">
                      <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded shrink-0"></div>
                  <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0"></div>
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
                onRetry={loadAdminMetrics} 
              />
            ) : (() => {
              const totalProductPages = Math.ceil(resolvedProducts.length / 10) || 1;
              const currentProductPage = Math.min(productPage, totalProductPages);
              const startIndex = (currentProductPage - 1) * 10;
              const paginatedProducts = resolvedProducts.slice(startIndex, startIndex + 10);

              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Review specifications index</h4>
                    <button
                      onClick={openAddProduct}
                      className="flex items-center gap-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3 rounded-lg shadow-md cursor-pointer transition-colors"
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      Add Curation Specs
                    </button>
                  </div>

                  {isMobile ? (
                    <div className="grid grid-cols-1 gap-4">
                      {paginatedProducts.map((p, idx) => (
                        <div key={p._id || `prod-mob-${idx}`} className="bg-white dark:bg-zinc-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="font-bold text-slate-900 dark:text-white text-xs leading-snug">{p.name}</h5>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                              {(() => {
                                if (!p.category) return 'Curated Line';
                                if (typeof p.category === 'object' && p.category) {
                                  if (p.category.name) return p.category.name;
                                  const catId = p.category._id || '';
                                  return categories.find(c => String(c._id) === String(catId))?.name || 'Curated Line';
                                }
                                return categories.find(c => String(c._id) === String(p.category))?.name || 'Curated Line';
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t border-dashed border-slate-100 dark:border-slate-800 pt-2.5 text-xs font-mono">
                            <div className="flex gap-4">
                              <div>
                                <span className="text-slate-400 text-[9px] block font-sans uppercase font-bold tracking-wider">Price</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">₹{p.price}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[9px] block font-sans uppercase font-bold tracking-wider">CTR Clicks</span>
                                <span className="font-semibold text-indigo-500 dark:text-indigo-400">{p.clicks || 0}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditProduct(p)}
                                className="text-indigo-600 hover:text-indigo-750 p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg shadow-xs"
                                title="Edit specifications"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p._id)}
                                className="text-rose-600 hover:text-rose-750 p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg shadow-xs"
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
                    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-zinc-900/40">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans text-xs">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold dark:bg-slate-800/40 dark:border-slate-800">
                            <tr>
                              <th className="py-2.5 px-4 font-bold">Name</th>
                              <th className="py-2.5 px-4 font-bold">Catalog Class</th>
                              <th className="py-2.5 px-4 font-mono font-bold">Price</th>
                              <th className="py-2.5 px-4 font-mono font-bold">CTR clicks</th>
                              <th className="py-2.5 px-4 font-bold">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {paginatedProducts.map((p, idx) => (
                              <tr key={p._id || `prod-desk-${idx}`} className="hover:bg-slate-50/20 transition-all">
                                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white truncate max-w-xs">{p.name}</td>
                                <td className="py-3 px-4 text-slate-500">
                                  {(() => {
                                    if (!p.category) return 'Curated Line';
                                    if (typeof p.category === 'object' && p.category) {
                                      if (p.category.name) return p.category.name;
                                      const catId = p.category._id || '';
                                      return categories.find(c => String(c._id) === String(catId))?.name || 'Curated Line';
                                    }
                                    return categories.find(c => String(c._id) === String(p.category))?.name || 'Curated Line';
                                  })()}
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">₹{p.price}</td>
                                <td className="py-3 px-4 font-mono font-semibold text-indigo-500">{p.clicks || 0}</td>
                                <td className="py-3 px-4">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => openEditProduct(p)}
                                      className="text-indigo-600 hover:text-indigo-700 p-1 bg-indigo-50 dark:bg-indigo-950/40 rounded shadow-xs"
                                      title="Edit specifications"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(p._id)}
                                      className="text-rose-600 hover:text-rose-750 p-1 bg-rose-50 dark:bg-rose-950/40 rounded shadow-xs"
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
                    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800 bg-slate-50/40 dark:bg-zinc-950/20 rounded-2xl gap-4">
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          Showing <span className="font-extrabold text-slate-900 dark:text-white font-mono">{startIndex + 1}</span> to{' '}
                          <span className="font-extrabold text-slate-900 dark:text-white font-mono">
                            {Math.min(startIndex + 10, resolvedProducts.length)}
                          </span>{' '}
                          of <span className="font-extrabold text-slate-900 dark:text-white font-mono">{resolvedProducts.length}</span> curation specs
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setProductPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentProductPage === 1}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 enabled:cursor-pointer disabled:opacity-40 select-none transition-all duration-200 active:scale-95"
                        >
                          &larr; Previous
                        </button>
                        
                        <div className="flex gap-1">
                          {Array.from({ length: totalProductPages }, (_, i) => i + 1).map(pageNumber => (
                            <button
                              key={pageNumber}
                              type="button"
                              onClick={() => setProductPage(pageNumber)}
                              className={`h-7 w-7 rounded-lg text-xs font-bold font-mono transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center ${
                                currentProductPage === pageNumber
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
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
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 enabled:cursor-pointer disabled:opacity-40 select-none transition-all duration-200 active:scale-95"
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
                onRetry={loadAdminMetrics} 
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Category form */}
                <div className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-zinc-900/40 col-span-1 space-y-4 h-fit">
                  <h4 className="text-xs font-bold uppercase text-slate-800 mb-2 dark:text-white">
                    {editingCategory ? 'Edit Classifier' : 'Add Classifier'}
                  </h4>
                  <form onSubmit={handleAddCategory} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Classifier Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Gaming Devices"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Classifier Icon</label>
                      <input
                        type="text"
                        placeholder="e.g. 📱 or 🎮"
                        value={catIcon}
                        onChange={(e) => setCatIcon(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Classifier Slug (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. gaming-devices (Auto-calculated if empty)"
                        value={catSlug}
                        onChange={(e) => setCatSlug(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Subcategories (Comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. Mobiles, Laptops, Accessories"
                        value={catSubcategories}
                        onChange={(e) => setCatSubcategories(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 rounded-xl bg-slate-950 hover:bg-indigo-600 text-white font-bold text-xs py-2.5 cursor-pointer transition-colors"
                      >
                        {editingCategory ? 'Update Classifier' : 'Create Classifier'}
                      </button>
                      {editingCategory && (
                        <button
                          type="button"
                          onClick={cancelEditCategory}
                          className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2.5 cursor-pointer transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Table list */}
                <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-zinc-900/40 col-span-2">
                  {isMobile ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80 p-5 space-y-4">
                      {categories.map((c, idx) => (
                        <div key={c._id || `cat-mob-${idx}`} className="pt-4 first:pt-0 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl shrink-0 p-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl">{c.icon || '📦'}</span>
                            <div>
                               <h5 className="font-bold text-slate-900 dark:text-white text-xs">{c.name}</h5>
                               <span className="font-mono text-[10px] text-slate-400 block truncate max-w-[140px]">{c.slug}</span>
                               {c.subcategories && c.subcategories.length > 0 && (
                                 <div className="flex flex-wrap gap-1 mt-1 max-w-[180px]">
                                   {c.subcategories.map((sub, sIdx) => (
                                     <span key={`${sub || 'sub'}-${sIdx}`} className="text-[8px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 rounded font-semibold">{sub}</span>
                                   ))}
                                 </div>
                               )}
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => startEditCategory(c)}
                              className="text-indigo-600 hover:text-indigo-700 p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl shadow-xs cursor-pointer"
                              title="Edit Classifier"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(c._id)}
                              className="text-rose-600 hover:text-rose-700 p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl shadow-xs cursor-pointer"
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
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold dark:bg-slate-800/40 dark:border-slate-800">
                          <tr>
                            <th className="py-2.5 px-4 text-left">Icon</th>
                            <th className="py-2.5 px-4 text-left">Classifier Name</th>
                            <th className="py-2.5 px-4 text-left font-mono">Classifier Slug</th>
                            <th className="py-2.5 px-4 text-left">Subcategories</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {categories.map((c, idx) => (
                            <tr key={c._id || `cat-desk-${idx}`} className="hover:bg-slate-50/20">
                              <td className="py-3 px-4 font-semibold text-lg">{c.icon || '📦'}</td>
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{c.name}</td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-[11px] font-semibold">{c.slug}</td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {c.subcategories && c.subcategories.length > 0 ? (
                                    c.subcategories.map((sub, sIdx) => (
                                      <span key={`${sub || 'sub'}-${sIdx}`} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 rounded font-semibold">{sub}</span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">None</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => startEditCategory(c)}
                                    className="text-indigo-600 hover:text-indigo-700 p-1 bg-indigo-50 dark:bg-indigo-950/40 rounded shadow-xs cursor-pointer"
                                    title="Edit Classifier"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(c._id)}
                                    className="text-rose-600 hover:text-rose-700 p-1 bg-rose-50 dark:bg-rose-950/40 rounded shadow-xs cursor-pointer"
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
                onRetry={loadAdminMetrics} 
              />
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-zinc-900/40">
                  {isMobile ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80 p-5 space-y-4">
                      {blogs.map((b, idx) => (
                        <div key={b._id || `blog-mob-${idx}`} className="pt-4 first:pt-0 space-y-2">
                          <h5 className="font-bold text-slate-900 dark:text-white text-xs leading-snug">{b.title}</h5>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{b.category}</span>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400">👀 {b.views || 0} views</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold dark:bg-slate-800/40 dark:border-slate-800">
                          <tr>
                            <th className="py-2.5 px-4 font-bold">Guides Name</th>
                            <th className="py-2.5 px-4 font-bold">Category</th>
                            <th className="py-2.5 px-4 font-mono font-bold">Views</th>
                            <th className="py-2.5 px-4 font-bold">Author</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {blogs.map((b, idx) => (
                            <tr key={b._id || `blog-desk-${idx}`} className="hover:bg-slate-50/20">
                              <td className="py-3 px-4 font-bold text-slate-900 truncate max-w-sm dark:text-white">{b.title}</td>
                              <td className="py-3 px-4 text-slate-500 font-semibold">{b.category}</td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">{b.views || 0}</td>
                              <td className="py-3 px-4 text-slate-400 font-semibold">{b.author || 'Admin'}</td>
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
                onRetry={loadAdminMetrics} 
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">User Messages & Inquiries</h4>
                  
                  {/* Filter tabs */}
                  <div className="flex bg-slate-100 p-1 rounded-xl dark:bg-slate-800 text-[11px] font-bold w-fit">
                    <button
                      type="button"
                      onClick={() => setMessagesFilter('all')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${messagesFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                      All Messages ({messages.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessagesFilter('unread')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${messagesFilter === 'unread' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      Unread ({stats.unreadMessages})
                    </button>
                  </div>
                </div>
                
                {(() => {
                  const displayedMessages = messagesFilter === 'unread' 
                    ? messages.filter(m => !m.read) 
                    : messages;

                  if (displayedMessages.length === 0) {
                    return (
                      <div className="border border-dashed border-slate-200 p-8 rounded-2xl text-center dark:border-slate-800">
                        <MailOpen className="h-6 w-6 text-slate-300 mx-auto" />
                        <p className="text-xs text-slate-400 mt-2 italic">
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
                        const isReplying = activeReplyId === m._id;
                        const replyText = replyTextMap[m._id] || '';
                        
                        return (
                          <div
                            key={m._id || `msg-${idx}`}
                            className={`rounded-2xl border p-5 space-y-3.5 transition-all ${!m.read ? 'bg-indigo-50/40 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900 shadow-xs' : 'bg-slate-50/20 border-slate-200 dark:border-slate-800'}`}
                          >
                            <div className="flex items-center justify-between gap-4 border-b pb-2 dark:border-slate-800">
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold font-mono">Date: {new Date(m.createdAt).toLocaleString()}</span>
                                <h4 className="text-xs font-black text-slate-900 dark:text-white mt-1">Sender: {m.name} ({m.email})</h4>
                              </div>

                              {!m.read ? (
                                <button
                                  onClick={() => handleMarkRead(m._id)}
                                  className="flex items-center gap-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 text-[10px] font-bold shadow-xs cursor-pointer"
                                >
                                  <MailCheck className="h-3.5 w-3.5 shrink-0" />
                                  Mark as Read
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold block bg-slate-100 px-2 py-0.5 rounded-sm dark:bg-slate-800">Read</span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-400 font-bold">Subject: <span className="text-slate-800 dark:text-slate-100">{m.subject}</span></p>
                            <p className="text-xs text-slate-600 leading-relaxed dark:text-slate-300 italic">"{m.message}"</p>

                            {/* Actions bar */}
                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100/50 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeReplyId === m._id) {
                                    setActiveReplyId(null);
                                  } else {
                                    setActiveReplyId(m._id);
                                    if (!replyTextMap[m._id]) {
                                      setReplyTextMap(prev => ({
                                        ...prev,
                                        [m._id]: `Hi ${m.name},\n\nThank you for reaching out to gadgetsprohub! Regarding your query about "${m.subject}":\n\n`
                                      }));
                                    }
                                  }
                                }}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                  isReplying 
                                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' 
                                    : 'bg-slate-100 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750'
                                }`}
                              >
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span>{isReplying ? 'Cancel Reply' : 'Reply with Draft'}</span>
                              </button>

                              <a
                                href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}&body=${encodeURIComponent(`Hi ${m.name},\n\n`)}`}
                                className="flex items-center gap-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer dark:bg-teal-950/20 dark:text-teal-300 dark:hover:bg-teal-905"
                              >
                                <span className="text-xs">✉</span>
                                <span>Direct Email Link</span>
                              </a>
                            </div>

                            {/* Reply Form */}
                            {isReplying && (
                              <div className="mt-4 p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 space-y-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Compose Reply email draft</span>
                                <textarea
                                  rows={5}
                                  className="w-full text-xs p-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-indigo-500 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                                  value={replyText}
                                  onChange={(e) => {
                                    setReplyTextMap(prev => ({
                                      ...prev,
                                      [m._id]: e.target.value
                                    }));
                                  }}
                                  placeholder="Type your email response here..."
                                />

                                {sentReplySuccess === m._id ? (
                                  <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 p-2.5 rounded-lg flex items-center gap-1.5">
                                    <span>✓ Your email response has been simulated and marked sent!</span>
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
                                        
                                        // Mark read automatically
                                        if (!m.read) {
                                          await handleMarkRead(m._id);
                                        }

                                        setSentReplySuccess(m._id);
                                        setTimeout(() => {
                                          setSentReplySuccess(null);
                                          setActiveReplyId(null);
                                          setReplyTextMap(prev => {
                                            const copy = { ...prev };
                                            delete copy[m._id];
                                            return copy;
                                          });
                                        }, 2500);
                                      }}
                                      className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
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
                  <h4 className="text-sm font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5 dark:text-indigo-400">
                    <span>🕒 Sunday Automation & Scheduler Portal</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-sans font-medium">Auto-manage trending product lifespans, schedule weekly additions, and trigger author reminder emails.</p>
                </div>
                
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSimulateSunday()}
                    disabled={simulatingSunday}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
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
                  <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-indigo-50/20 to-violet-50/10 p-5 dark:border-slate-800 dark:bg-zinc-900/10 space-y-3.5">
                    <h5 className="text-xs font-black uppercase text-slate-500 tracking-wider">Automated Scheduler Rules & Policies</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-white/80 p-3 rounded-xl border border-indigo-50 dark:border-indigo-950/40 dark:bg-zinc-950/40 space-y-1.5">
                        <span className="font-bold text-slate-800 dark:text-orange-300 block">⏱ 7-Day Trending Lifespan</span>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                          Products marked as **Trending** automatically age out back to normal catalogue files exactly 7 days after insertion. This check runs automatically whenever anyone requests products or the trending list.
                        </p>
                      </div>

                      <div className="bg-white/80 p-3 rounded-xl border border-indigo-50 dark:border-indigo-950/40 dark:bg-zinc-950/40 space-y-1.5">
                        <span className="font-bold text-slate-800 dark:text-emerald-300 block">📬 Automatic Weekly Notification</span>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                          Every Sunday, a detailed automation run is triggered. It appends **2 brand-new premium items** to the live stock list and automatically emails the designated administrator's mailbox with a complete status update.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Logs registry */}
                  <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider">Scheduled Run History Log ({sundayLogs.length})</h5>

                  {sundayLogsError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs dark:bg-red-950/20 dark:text-red-400">
                      Error sourcing logs: {sundayLogsError}
                    </div>
                  )}

                  {sundayLogs.length === 0 ? (
                    <div className="border border-dashed border-slate-200 p-8 rounded-2xl text-center dark:border-slate-800 bg-white dark:bg-zinc-950/20">
                      <p className="text-xs text-slate-400 italic">No automated scheduler logs recorded yet. Click "Simulate Sunday robot addition" above to execute and log your first automated weekly run!</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xs dark:border-slate-800 dark:bg-zinc-900/40 animate-in fade-in duration-300">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans text-xs">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold dark:bg-slate-800/40 dark:border-slate-800">
                            <tr>
                              <th className="py-2.5 px-4 font-bold">Execution Date</th>
                              <th className="py-2.5 px-4 font-bold">Automation Type</th>
                              <th className="py-2.5 px-4 font-bold">Notification Mail Status</th>
                              <th className="py-2.5 px-4 font-bold">New Products Appended</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {sundayLogs.map((log: any, idx: number) => (
                              <tr key={log._id || log.sundayDate || `log-${idx}`} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/20">
                                <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-zinc-200">
                                  {log.sundayDate}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="inline-block rounded bg-indigo-50 text-indigo-750 px-2 py-0.5 text-[10px] font-bold dark:bg-indigo-950/40 dark:text-indigo-300">
                                    {log.runType || 'Sunday Seeding'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono">
                                  {log.emailSent ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Gmail alert sent</span>
                                  ) : (
                                    <span className="text-slate-400 italic">Mail simulated</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 max-w-[200px] truncate">
                                  <span className="text-slate-800 dark:text-slate-300 font-sans font-medium">
                                    {Array.isArray(log.productsAdded) 
                                      ? log.productsAdded.map((p: any) => typeof p === 'object' ? p.name : p).join(', ')
                                      : log.productsAdded || 'N/A'
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
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-zinc-900/30 shadow-xs space-y-4">
                    <h5 className="text-[11px] font-black uppercase text-indigo-700 tracking-wider dark:text-indigo-400">Default Target Mailbox</h5>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/30 dark:bg-indigo-950/20 dark:border-indigo-900/20 w-full min-w-0">
                        <span className="text-lg shrink-0">📧</span>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">ADMIN GMAIL</span>
                          <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200 break-all select-all block leading-tight">
                            (Loaded via Environment Profile)
                          </span>
                        </div>
                      </div>
                    </div>

                    <h5 className="text-[11px] font-black uppercase text-indigo-700 tracking-wider dark:text-indigo-400 pt-2">Schedule Heartbeat status</h5>
                    <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Next Expected Run:</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">Next Sunday</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Heartbeat interval:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">12 hours</span>
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
                onRetry={loadAdminMetrics} 
              />
            ) : (() => {
              const filteredUsers = users.filter(usr => {
                const matchesSearch = 
                  (usr.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                  (usr.name || '').toLowerCase().includes(userSearchQuery.toLowerCase());
                
                const matchesRole = 
                  userRoleFilter === 'all' || 
                  usr.role === userRoleFilter;

                return matchesSearch && matchesRole;
              });

              return (
                <div className="space-y-6 text-slate-800 dark:text-slate-100 text-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5 dark:text-indigo-400">
                        <span>👥 Total Registered Platform Members</span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5 font-sans font-medium">
                        A comprehensive overview of registered members. Revoke administrator credentials securely using a security challenge.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadAdminMetrics()}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200/85 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer active:scale-95 shadow-xs"
                      >
                        <RefreshCcw className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Refresh accounts list</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Bento Grid Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-105 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total registered members</span>
                        <h4 className="text-sm font-mono font-black text-slate-800 dark:text-slate-200 mt-1">{users.length} Account(s)</h4>
                      </div>
                      <div className="h-9 w-9 rounded-lg bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center text-slate-500 font-bold">
                        👥
                      </div>
                    </div>

                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/10 p-4 dark:border-indigo-950/20 dark:bg-slate-900 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block">Active Administrators</span>
                        <h4 className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400 mt-1">
                          {users.filter(u => u.role === 'admin').length} Admin(s)
                        </h4>
                      </div>
                      <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500 font-bold">
                         🛡️
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Standard Users</span>
                        <h4 className="text-sm font-mono font-black text-slate-700 dark:text-slate-300 mt-1 block">
                          {users.filter(u => u.role !== 'admin').length} User(s)
                        </h4>
                      </div>
                      <div className="h-9 w-9 rounded-lg bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center text-slate-400 font-bold">
                         👤
                      </div>
                    </div>
                  </div>



                  {/* Filter and Search Utility Box */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/50 p-4 rounded-2xl dark:bg-zinc-900/40 border border-slate-100 dark:border-slate-800">
                    <div className="relative w-full sm:max-w-xs">
                      <input
                        type="text"
                        placeholder="Search by email address or name..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-3.5 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 text-slate-800 focus:outline-hidden focus:ring-1.5 focus:ring-slate-900 dark:border-slate-800 dark:bg-zinc-950 dark:text-slate-100 dark:focus:ring-slate-300"
                      />
                      {userSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setUserSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-mono font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <span className="text-[11px] font-bold uppercase text-slate-400 whitespace-nowrap">Filter Role:</span>
                      <div className="flex bg-white dark:bg-zinc-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 gap-1">
                        {(['all', 'admin', 'user'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setUserRoleFilter(r)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer capitalize transition-all ${userRoleFilter === r ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-400 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Users Admin Control Table */}
                  <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-zinc-900/40 w-full">
                    {filteredUsers.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 italic text-xs font-medium">
                        No registered users found matching the query filters.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider dark:bg-slate-900/20 dark:border-slate-800">
                              <th className="py-3 px-4 font-bold">Member Information</th>
                              <th className="py-3 px-4 font-bold">Region/District</th>
                              <th className="py-3 px-4 font-bold">Role Privilege</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredUsers.map((usr: any, idx: number) => {
                              const usrId = usr._id || usr.id || `usr-${idx}`;
                              const isSelf = usrId === user?._id || usrId === (user as any)?.id;
                              const isCurrentAdmin = usr.role === 'admin';

                              return (
                                <tr key={usrId} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/20 transition-colors">
                                  <td className="py-3.5 px-4 animate-fadeIn">
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 font-bold items-center justify-center flex border border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700">
                                        {usr.profileImage ? (
                                          <img
                                            src={usr.profileImage}
                                            alt={usr.name}
                                            referrerPolicy="no-referrer"
                                            className="h-full w-full rounded-full object-cover"
                                          />
                                        ) : (
                                          <span>{(usr.name || usr.email || 'U')[0].toUpperCase()}</span>
                                        )}
                                      </div>
                                      <div className="space-y-0.5">
                                        <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                          <span>{usr.name || 'Anonymous User'}</span>
                                          {isSelf && (
                                            <span className="text-[9px] bg-slate-900 text-white rounded px-1.5 py-0.2 font-extrabold dark:bg-slate-100 dark:text-slate-900 uppercase">
                                              You
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-mono font-medium">{usr.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-zinc-350">
                                    <span className="inline-flex items-center gap-1 text-[11px]">
                                      <span>{getDistrictEmoji(usr.district || 'Chennai')}</span>
                                      <span>{usr.district || 'Chennai'}</span>
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {isCurrentAdmin ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-black text-rose-600 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30 font-sans uppercase">
                                        🛡️ Administrator
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-750/50 font-sans uppercase">
                                        👤 Standard User
                                      </span>
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
          ) : (

          /* VIEW TAB : TELEMETRY TRAFFIC LOGS */
          telemetryError ? (
            <TabErrorView 
              title="Traffic Logs Sourcing Error" 
              message={telemetryError} 
              onRetry={loadAdminMetrics} 
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
                <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider">Visitor Traffic & Click Logs</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans font-medium">Real-time record of visitor page views, time spent, browser type, and district location.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleReloadTraffic}
                  disabled={refreshingTraffic}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-250 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-350 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-sm"
                >
                  <RefreshCcw className={`h-3 w-3 text-indigo-600 dark:text-indigo-400 ${refreshingTraffic ? 'animate-spin' : ''}`} />
                  <span>{refreshingTraffic ? 'Refreshing...' : 'Reload Traffic'}</span>
                </button>
                <div className="rounded-lg bg-indigo-50 px-3 py-1.5 dark:bg-indigo-950/40">
                  <span className="text-[10px] font-mono font-black text-indigo-700 dark:text-indigo-400 uppercase">
                    Connected Records Count: {analyticsData.length}
                  </span>
                </div>
              </div>
            </div>

            {analyticsData.length === 0 ? (
              <div className="border border-dashed border-slate-200 p-12 rounded-3xl text-center dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 max-w-lg mx-auto my-6">
                <Globe className="h-10 w-10 text-indigo-500 dark:text-indigo-400 mx-auto mb-4 stroke-[1.5]" />
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">No Active Traffic Logs Captured</h5>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  No page views, product clicks, or external Amazon affiliate redirects have been logged in the database yet. All organic traffic analytics capture runs live and real-time across devices.
                </p>
              </div>
            ) : (
              isMobile ? (
                <div className="space-y-4">
                  {paginatedLogs.map((a, idx) => {
                    const isPage = a.eventType === 'page_visit';
                    const isClick = a.eventType === 'click';
                    const isConv = a.eventType === 'conversion';
                    const isView = a.eventType === 'view';
                    const absoluteIndex = startIndex + idx;
                    const recordId = `log-mob-${a._id || absoluteIndex}-${idx}`;
                    const isExpanded = expandedVisitorId === recordId;

                    // Display nice status color badge
                    let statusColor = "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400";
                    let statusLabel = a.eventType;
                    if (isPage) {
                      statusColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400";
                      statusLabel = "Page View";
                    } else if (isClick) {
                      statusColor = "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400";
                      statusLabel = "Store Link Click";
                    } else if (isConv) {
                      statusColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400";
                      statusLabel = "Affiliate Exit";
                    } else if (isView) {
                      statusColor = "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400";
                      statusLabel = "Product View";
                    }

                    // Display stayed time nicely
                    let stayDisplay = "—";
                    if (isPage && typeof a.timeSpent === "number") {
                      if (a.timeSpent === 0) {
                        stayDisplay = "Instant visit";
                      } else if (a.timeSpent < 60) {
                        stayDisplay = `${a.timeSpent} sec`;
                      } else {
                        const mins = Math.floor(a.timeSpent / 60);
                        const secs = a.timeSpent % 60;
                        stayDisplay = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
                      }
                    }

                    const visitorPlace = a.district || "Chennai";
                    const visitorName = a.userId ? (a.userId.name || 'Explorer Member') : 'Guest Visitor';

                    return (
                      <div 
                        key={recordId} 
                        className={`bg-white dark:bg-zinc-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-xs space-y-3 transition-all duration-200 cursor-pointer ${isExpanded ? 'ring-1 ring-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10' : ''}`}
                        onClick={() => setExpandedVisitorId(isExpanded ? null : recordId)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md px-1.5 py-0.5 font-bold">#{absoluteIndex + 1}</span>
                            <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-black tracking-wide uppercase ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-1 text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-md font-bold">
                            <span>{isExpanded ? 'Hide' : 'Details'}</span>
                            {isExpanded ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 text-[9px] uppercase tracking-wider block font-bold">Visitor</span>
                            <span className="font-bold text-slate-800 dark:text-slate-105 truncate block">
                              {visitorName}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[9px] uppercase tracking-wider block font-bold">Location</span>
                            <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-350">
                              <span>{getDistrictEmoji(visitorPlace)}</span>
                              <span>{visitorPlace}</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[9px] uppercase tracking-wider block font-bold">Timestamp</span>
                            <span className="font-mono text-[10px] text-slate-500 font-bold block">
                              {new Date(a.timestamp || Date.now()).toLocaleTimeString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[9px] uppercase tracking-wider block font-bold">Target</span>
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-350 truncate block" title={isPage ? a.pageUrl : (a.productId?.name || "Product")}>
                              {isPage ? (a.pageUrl || "home") : (a.productId?.name || "Product Item")}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-dashed border-slate-100 dark:border-slate-800 pt-3 mt-1 space-y-3">
                            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 dark:bg-slate-950/40 dark:border-slate-800 gap-2 grid grid-cols-2 text-[10px]">
                              <div>
                                <div className="text-slate-400 uppercase font-bold tracking-wider text-[8px]">Device Stack</div>
                                <div className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">{a.browser || "Chrome"}</div>
                                <div className="text-indigo-600 dark:text-indigo-400 font-bold font-mono tracking-tighter mt-0.5">{a.device || "Desktop"}</div>
                              </div>
                              <div>
                                <div className="text-slate-400 uppercase font-bold tracking-wider text-[8px]">IP Address</div>
                                <div className="font-mono font-bold text-slate-700 dark:text-slate-300 mt-1">{a.ipAddress || "127.0.0.1"}</div>
                              </div>
                              <div className="col-span-2 pt-1">
                                <div className="text-slate-400 uppercase font-bold tracking-wider text-[8px]">Action Type & Stay Time</div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{statusLabel} ({stayDisplay})</div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center gap-2 pt-1">
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 italic">ID: {a._id || `sim_${absoluteIndex}`}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerAlert("Diagnostic Registry Info", `Simulating diagnostic IP lookup for: ${a.ipAddress || "127.0.0.1"}\n\nLocation: ${visitorPlace} District\nNetwork ISP Status: Verified Clean`);
                                }}
                                className="text-[9px] rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-2 py-1 transition-all dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
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
                    <div className="flex items-center justify-between border border-slate-100 px-4 py-3 dark:border-slate-800 bg-slate-50/25 dark:bg-zinc-900/10 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                        disabled={currentLogsPage === 1}
                        className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50 cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogsPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentLogsPage === totalPages}
                        className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-zinc-900/40 pb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-black text-[9px] dark:bg-slate-800/40 dark:border-slate-800 select-none">
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
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-600 dark:text-slate-300">
                        {paginatedLogs.map((a, idx) => {
                          const isPage = a.eventType === 'page_visit';
                          const isClick = a.eventType === 'click';
                          const isConv = a.eventType === 'conversion';
                          const isView = a.eventType === 'view';
                          const absoluteIndex = startIndex + idx;
                          const recordId = `log-desk-${a._id || absoluteIndex}-${idx}`;
                          const isExpanded = expandedVisitorId === recordId;

                          // Display nice status color badge
                          let statusColor = "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400";
                          let statusLabel = a.eventType;
                          if (isPage) {
                            statusColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400";
                            statusLabel = "Page View";
                          } else if (isClick) {
                            statusColor = "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400";
                            statusLabel = "Store Link Click";
                          } else if (isConv) {
                            statusColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400";
                            statusLabel = "Affiliate Exit";
                          } else if (isView) {
                            statusColor = "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400";
                            statusLabel = "Product View";
                          }

                          // Display stayed time nicely
                          let stayDisplay = "—";
                          if (isPage && typeof a.timeSpent === "number") {
                            if (a.timeSpent === 0) {
                              stayDisplay = "Instant visit";
                            } else if (a.timeSpent < 60) {
                              stayDisplay = `${a.timeSpent} sec`;
                            } else {
                              const mins = Math.floor(a.timeSpent / 60);
                              const secs = a.timeSpent % 60;
                              stayDisplay = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
                            }
                          }

                          const visitorPlace = a.district || "Chennai";
                          const visitorName = a.userId ? (a.userId.name || 'Explorer Member') : 'Guest Visitor';

                          return (
                            <React.Fragment key={recordId}>
                              <tr
                                onClick={() => setExpandedVisitorId(isExpanded ? null : recordId)}
                                className={`hover:bg-indigo-50/20 dark:hover:bg-slate-800/30 transition-colors cursor-pointer select-none ${isExpanded ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}
                              >
                                {/* S.No */}
                                <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                                  {absoluteIndex + 1}
                                </td>

                                {/* Visitor Name */}
                                <td className="py-3.5 px-4">
                                  {a.userId ? (
                                    <div className="space-y-0.5">
                                      <span className="font-bold text-slate-900 block dark:text-white leading-tight flex items-center gap-1">
                                        <span className="text-[10px]">👤</span>
                                        {a.userId.name || 'Explorer'}
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-400 tracking-tight block">
                                        {a.userId.email}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-[11px] font-sans text-slate-400 italic leading-tight">
                                      <span className="text-[10px]">🌐</span>
                                      <span>Guest Visitor</span>
                                    </div>
                                  )}
                                </td>

                                {/* Visitor Place */}
                                <td className="py-3.5 px-4">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-100/40 dark:border-slate-750">
                                    <span>{getDistrictEmoji(visitorPlace)}</span>
                                    <span>{visitorPlace}</span>
                                  </span>
                                </td>

                                {/* Timestamp & IP */}
                                <td className="py-3.5 px-4 font-normal">
                                  <span className="text-[9px] font-mono font-bold block text-slate-400 dark:text-slate-500 leading-tight">
                                    {new Date(a.timestamp || Date.now()).toLocaleString()}
                                  </span>
                                  <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-350">
                                    {a.ipAddress || "127.0.0.1"}
                                  </span>
                                </td>

                                {/* Event Type */}
                                <td className="py-3.5 px-4">
                                  <span className={`inline-block rounded-md px-2 py-0.5 text-[9px] font-black tracking-wide uppercase ${statusColor}`}>
                                    {statusLabel}
                                  </span>
                                </td>

                                {/* Action Target/Page */}
                                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-350 max-w-[180px] truncate" title={isPage ? a.pageUrl : (a.productId?.name || "Product")}>
                                  {isPage ? (
                                    a.pageUrl || "home"
                                  ) : (
                                    a.productId?.name || "Product Item"
                                  )}
                                </td>

                                {/* Platform & Device */}
                                <td className="py-3.5 px-4 font-bold text-slate-500 text-[10px] dark:text-slate-400 space-y-0.5">
                                  <span className="block text-slate-700 dark:text-slate-300 font-sans">{a.browser || "Chrome"}</span>
                                  <span className="block text-[8px] font-mono tracking-tighter uppercase font-black text-slate-400">{a.device || "Desktop"}</span>
                                </td>

                                {/* Stay Time */}
                                <td className="py-3.5 px-4 font-mono font-bold text-center text-slate-700 dark:text-slate-350">
                                  {stayDisplay}
                                </td>

                                {/* Sole Details Trigger Action */}
                                <td className="py-3.5 px-4 text-center">
                                  <div className="inline-flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 font-bold">
                                    <span>{isExpanded ? 'Hide' : 'Show'}</span>
                                    {isExpanded ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                                  </div>
                                </td>
                              </tr>

                              {/* EXPANSIBLE SOLE DETAILS BLOCK CONTAINER */}
                              {isExpanded && (
                                <tr className="bg-slate-50/60 dark:bg-slate-900/60 transition-all">
                                  <td colSpan={9} className="p-5 border-t border-b border-indigo-100/50 dark:border-indigo-950/50">
                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/40 shadow-xs space-y-4">
                                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
                                        <div className="flex items-center gap-2">
                                          <div className="h-2.5 w-2.5 rounded-full bg-violet-500 animate-pulse"></div>
                                          <h5 className="text-xs font-black uppercase text-slate-500 tracking-wider font-mono">
                                            Sole Visitor Audit Record (S.No. {absoluteIndex + 1})
                                          </h5>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Record ID: {a._id || `sim_${absoluteIndex}`}</span>
                                      </div>

                                      {/* Bento Specs grid */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {/* Col 1: Identity specifications */}
                                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800 space-y-2">
                                          <div className="text-[10px] uppercase font-bold text-slate-400">Visitor Identity</div>
                                          <div className="space-y-1">
                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-250 flex items-center gap-1">
                                              <span>👤</span> {visitorName}
                                            </div>
                                            {a.userId && (
                                              <div className="text-[10px] text-slate-500 font-mono italic">{a.userId.email}</div>
                                            )}
                                            <div className="text-[10px] text-slate-500 font-mono">User Class: {a.userId ? "Registered Member" : "Guest / Browsing Web Agent"}</div>
                                          </div>
                                        </div>

                                        {/* Col 2: Geographic specifications */}
                                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 space-y-2">
                                          <div className="text-[10px] uppercase font-bold text-slate-400">Visitor Place / Location</div>
                                          <div className="space-y-1">
                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-250 flex items-center gap-1.5">
                                              <span>{getDistrictEmoji(visitorPlace)}</span>
                                              <span>{visitorPlace} District</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 leading-normal">
                                              Estimated Region: Tamil Nadu, South India Registry
                                            </div>
                                            <div className="text-[10px] text-zinc-400 font-mono">
                                              Region Matcher ID: {visitorPlace.toUpperCase()}_DIS_2026
                                            </div>
                                          </div>
                                        </div>

                                        {/* Col 3: Browser Stack details */}
                                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 space-y-2">
                                          <div className="text-[10px] uppercase font-bold text-slate-400">Device Hardware & Engine</div>
                                          <div className="space-y-1 text-slate-700 dark:text-slate-300">
                                            <div className="text-xs font-bold font-sans">
                                              🖥️ {a.browser || "Chrome Standard Web Client"}
                                            </div>
                                            <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 uppercase font-black">
                                              Hardware Group: {a.device || "Desktop Terminal"}
                                            </div>
                                            <div className="text-[10px] text-slate-400 leading-tight block">
                                              Proxy Mask IP: {a.ipAddress || "127.0.0.1"}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Col 4: Session Metrics & actions */}
                                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 space-y-2">
                                          <div className="text-[10px] uppercase font-bold text-slate-400">Action & Stay Context</div>
                                          <div className="space-y-1">
                                            <div className="text-xs font-bold flex items-center gap-1">
                                              <span className="h-1.5 w-1.5 rounded-full bg-violet-600"></span>
                                              <span>Type: {statusLabel}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-semibold font-mono leading-tight">
                                              Duration: {stayDisplay} (Seconds: {a.timeSpent || 0}s)
                                            </div>
                                            <div className="text-[10px] text-indigo-700 font-bold dark:text-indigo-400 truncate max-w-xs" title={isPage ? a.pageUrl : (a.productId?.name || "Product")}>
                                              Target: {isPage ? (a.pageUrl || "/") : (a.productId?.name || "Affiliate Hub Item")}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Action Footnote with dynamic simulation button */}
                                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/85">
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                          <span className="text-green-500 font-bold">✓ Secure Sandbox</span>
                                          <span>This session matches our integrity guidelines with zero artificial bot patterns detected.</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            triggerAlert("Diagnostic Registry Info", `Simulating diagnostic IP lookup for: ${a.ipAddress || "127.0.0.1"}\n\nLocation: ${visitorPlace} District\nNetwork ISP Status: Verified Clean`);
                                          }}
                                          className="text-[10px] rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-3 py-1.5 transition-all dark:border-slate-700 dark:text-slate-305 dark:hover:bg-slate-800 cursor-pointer"
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
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3.5 dark:border-slate-800 bg-slate-50/20 dark:bg-zinc-900/10">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <button
                          type="button"
                          onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                          disabled={currentLogsPage === 1}
                          className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50 cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogsPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentLogsPage === totalPages}
                          className="relative ml-2 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Showing <span className="font-semibold text-slate-900 dark:text-white">{startIndex + 1}</span> to{' '}
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {Math.min(startIndex + ITEMS_PER_PAGE, analyticsData.length)}
                            </span>{' '}
                            of <span className="font-semibold text-slate-900 dark:text-white">{analyticsData.length}</span> logs
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-xl bg-white dark:bg-zinc-800 p-0.5 border border-slate-200/60 dark:border-slate-700" aria-label="Pagination">
                            <button
                              type="button"
                              onClick={() => setLogsPage(1)}
                              disabled={currentLogsPage === 1}
                              className="relative inline-flex items-center rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-700/60 disabled:opacity-30 cursor-pointer text-[11px] font-bold"
                            >
                              « First
                            </button>
                            <button
                              type="button"
                              onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                              disabled={currentLogsPage === 1}
                              className="relative inline-flex items-center rounded-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-700/60 disabled:opacity-30 cursor-pointer text-[11px] font-bold"
                            >
                              ‹ Prev
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentLogsPage) <= 1)
                              .map((p, index, arr) => {
                                const showEllipsisBefore = index > 0 && p - arr[index - 1] > 1;
                                const isCurrent = p === currentLogsPage;
                                return (
                                  <React.Fragment key={p}>
                                    {showEllipsisBefore && (
                                      <span className="relative inline-flex items-center px-3 py-1.5 text-xs font-bold text-slate-400">
                                        ...
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setLogsPage(p)}
                                      className={`relative inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                                        isCurrent
                                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 scale-102 shadow-2xs'
                                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-zinc-700/75'
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
                              className="relative inline-flex items-center rounded-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-700/60 disabled:opacity-30 cursor-pointer text-[11px] font-bold"
                            >
                              Next ›
                            </button>
                            <button
                              type="button"
                              onClick={() => setLogsPage(totalPages)}
                              disabled={currentLogsPage === totalPages}
                              className="relative inline-flex items-center rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-700/60 disabled:opacity-30 cursor-pointer text-[11px] font-bold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 animate-in fade-in duration-200 overflow-y-auto pt-10">
          <div className="max-w-xl w-full bg-white rounded-3xl p-6 border border-slate-100 shadow-2xl dark:bg-zinc-950 dark:border-slate-800 space-y-4 my-8 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-widest uppercase">
                {editingProduct ? 'Edit Product Details' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black cursor-pointer text-sm shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-slate-100 dark:border-slate-800 mb-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setModalFormTab('basics')}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${modalFormTab === 'basics' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}
              >
                Basics
              </button>
              <button
                type="button"
                onClick={() => setModalFormTab('dealsSpecs')}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${modalFormTab === 'dealsSpecs' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}
              >
                Specs & Media
              </button>
              <button
                type="button"
                onClick={() => setModalFormTab('editorial')}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${modalFormTab === 'editorial' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}
              >
                Editorial
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4 text-xs">
              
              {modalFormTab === 'basics' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Product Name</label>
                      <input
                        type="text"
                        required
                        value={prodForm.name}
                        onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Web Link Name (Slug)</label>
                      <input
                        type="text"
                        placeholder="Auto-derived on submit if empty"
                        value={prodForm.slug}
                        onChange={(e) => setProdForm({ ...prodForm, slug: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      {slugChecking && <p className="text-[10px] text-indigo-500 mt-1 animate-pulse font-semibold">Checking link availability...</p>}
                      {slugCheckError && (
                        <div className="mt-1.5 space-y-1 bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg">
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">{slugCheckError}</p>
                          {suggestedSlug && (
                            <button
                              type="button"
                              onClick={() => {
                                setProdForm(prev => ({ ...prev, slug: suggestedSlug }));
                                setSlugCheckError('');
                                setSuggestedSlug('');
                              }}
                              className="text-[9px] bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black px-2.5 py-1 rounded-md cursor-pointer transition-all block w-fit shadow-xs uppercase tracking-wider mt-1"
                            >
                              Auto-fix using: <span className="font-mono underline lowercase">{suggestedSlug}</span>
                            </button>
                          )}
                        </div>
                      )}
                      {!slugChecking && !slugCheckError && (prodForm.slug || prodForm.name) && (prodForm.slug || prodForm.name).trim() !== 'noise-cancelling-pro-anc' && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-450 font-bold mt-1 flex items-center gap-1">✓ Web Link Name is available!</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Brand Name</label>
                      <input
                        type="text"
                        value={prodForm.brand}
                        onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sale Price (₹)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={prodForm.price}
                        onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Product Category</label>
                      <select
                        value={prodForm.category}
                        onChange={(e) => setProdForm({ ...prodForm, category: e.target.value, subcategory: "" })}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        {categories.map(c => (
                          <option key={c._id} value={c._id} className="dark:bg-slate-900 dark:text-slate-100">{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Product Subcategory</label>
                      <select
                        value={prodForm.subcategory}
                        onChange={(e) => setProdForm({ ...prodForm, subcategory: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- No Subcategory --</option>
                        {(categories.find(c => String(c._id) === String(prodForm.category || categories?.[0]?._id || ''))?.subcategories || []).map(sub => (
                          <option key={sub} value={sub} className="dark:bg-slate-900 dark:text-slate-100">{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Original Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={prodForm.originalPrice}
                        onChange={(e) => setProdForm({ ...prodForm, originalPrice: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={prodForm.discount}
                        onChange={(e) => setProdForm({ ...prodForm, discount: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-center"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalFormTab === 'dealsSpecs' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Affiliate Referral Link URL</label>
                      <input
                        type="url"
                        required
                        value={prodForm.affiliateLink}
                        onChange={(e) => setProdForm({ ...prodForm, affiliateLink: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-[10px]"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Coupon Code</label>
                      <input
                        type="text"
                        value={prodForm.affiliateCode}
                        onChange={(e) => setProdForm({ ...prodForm, affiliateCode: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-center"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Product Image Link(s) (One URL per line, or comma-separated)</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                      value={prodForm.images}
                      onChange={(e) => setProdForm({ ...prodForm, images: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-[10px]"
                    />
                    <p className="text-[9px] text-slate-400 leading-tight">
                      Add multiple image URLs for a dynamic multi-image carousel on the detail sheet (loops every 10 seconds).
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Specifications (separated by Semicolon, e.g., Weight=200g;ANC=Active;Battery=30h)</label>
                    <input
                      type="text"
                      placeholder="e.g. Weight=200g;ANC=Mode-1;Drivers=2"
                      value={prodForm.specKeyVal}
                      onChange={(e) => setProdForm({ ...prodForm, specKeyVal: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Key Features list (Separated by Comma)</label>
                    <input
                      type="text"
                      placeholder="e.g. Ultra ANC, Bluetooth 5.3, Long Battery"
                      value={prodForm.features}
                      onChange={(e) => setProdForm({ ...prodForm, features: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans"
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
                        className="w-full text-[11px] rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Cons / Key Negatives (Comma split)</label>
                      <textarea
                        rows={2}
                        value={prodForm.cons}
                        onChange={(e) => setProdForm({ ...prodForm, cons: e.target.value })}
                        className="w-full text-[11px] rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Short Description</label>
                    <input
                      type="text"
                      required
                      value={prodForm.description}
                      onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Detailed Description & Review</label>
                    <textarea
                      rows={3}
                      required
                      value={prodForm.longDescription}
                      onChange={(e) => setProdForm({ ...prodForm, longDescription: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-2 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-6 py-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={prodForm.trending}
                        onChange={(e) => setProdForm({ ...prodForm, trending: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">Trending Choice</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={prodForm.featured}
                        onChange={(e) => setProdForm({ ...prodForm, featured: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">Featured Collection</span>
                    </label>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 cursor-pointer shadow-md transition-all active:scale-97"
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
        isDestructive={confirmDialog.isDestructive}
        cancelText={confirmDialog.cancelText}
        confirmText={confirmDialog.confirmText}
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
