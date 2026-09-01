import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Product } from '../types';
import { safeSetItem } from '../utils/localStorage';
import { mapErrorToFriendly } from '../utils/errorMapper';
import { apiFetch } from '../utils/apiClient';
import { profileSchema, emailChangeSchema } from '../utils/schemas';
import { 
  Heart, ShieldCheck, Mail, LogOut, Sparkle, Trash2,
  CheckCircle, AlertCircle, MapPin,
  Clock, ArrowRight, RefreshCw
} from 'lucide-react';

import { TAMIL_NADU_DISTRICTS } from '../utils/districts';
import { formatProductPrice, getValidatedPricing } from '../utils/productUtils';

interface ProfileProps {
  onNavigate: (view: string, slug?: string) => void;
}

interface OrderItem {
  product: Product;
  quantity: number;
  price: number;
}

export interface Order {
  _id: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'Processing' | 'Shipped' | 'In Transit' | 'Delivered' | 'Cancelled';
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  createdAt: string;
}

export const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const { user, token, logout, wishlist, toggleWishlist, refreshProfile } = useAuth();
  const { showToast } = useToast();
  
  const handleLogout = () => {
    logout();
    onNavigate('home');
    showToast("Logout successful", "success");
  };
  
  // States
  const [loading, setLoading] = useState(true);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState<'wishlist' | 'orders'>('wishlist');

  // Profile preferences sync states
  const [editName, setEditName] = useState(user?.name || '');
  const [selectDistrict, setSelectDistrict] = useState(user?.district || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Email update states
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailUpdateStatus, setEmailUpdateStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [simulatedEmailUrl, setSimulatedEmailUrl] = useState('');

  // Sync state if user loads dynamically
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setSelectDistrict(user.district || '');
    }
  }, [user]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // 1. Zod client-side form validation
    const parsed = emailChangeSchema.safeParse({ newEmail });
    if (!parsed.success) {
      const errMsg = parsed.error.issues[0]?.message || 'Invalid email format';
      setEmailUpdateStatus({ type: 'error', message: errMsg });
      showToast(errMsg, 'error');
      return;
    }

    const trimmedEmail = newEmail.trim();
    setIsUpdatingEmail(true);
    setEmailUpdateStatus(null);
    setSimulatedEmailUrl('');
    try {
      // Use apiFetch for automated cancellation and transient retrying
      const res = await apiFetch('/api/user/update-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newEmail: trimmedEmail })
      });
      const data = await res.json();
      if (data.smtpError) {
        const smtpErrMsg = `SMTP Email Delivery Failure: ${data.smtpError}`;
        const friendly = mapErrorToFriendly(smtpErrMsg, 'request email update');
        setEmailUpdateStatus({ type: 'error', message: friendly.message });
        showToast(friendly.message, 'error');
      } else if (res.ok) {
        setEmailUpdateStatus({
          type: 'success',
          message: data.message || 'A verification link has been sent to your new email address.'
        });
        showToast(data.message || 'Verification link sent!', 'success');
        setNewEmail('');
      } else {
        const friendly = mapErrorToFriendly(data?.error || 'Failed to request email update', 'request email update');
        setEmailUpdateStatus({ type: 'error', message: friendly.message });
        showToast(friendly.message, 'error');
      }
    } catch (err) {
      const friendly = mapErrorToFriendly(err, 'request email update');
      setEmailUpdateStatus({ type: 'error', message: friendly.message });
      showToast(friendly.message, 'error');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Validate with Zod profileSchema
    const parsed = profileSchema.safeParse({ name: editName, district: selectDistrict });
    if (!parsed.success) {
      const errMsg = parsed.error.issues[0]?.message || 'Invalid profile choices';
      showToast(errMsg, 'error');
      return;
    }

    setIsSavingProfile(true);
    setSaveSuccessMessage('');
    try {
      // Use apiFetch for automated cancellation and transient retrying
      const res = await apiFetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          district: selectDistrict
        })
      });
      if (res.ok) {
        safeSetItem('aff_preferred_city', selectDistrict);
        await refreshProfile();
        showToast('Your profile and geographical district preferences have been successfully updated.', 'success');
        setSaveSuccessMessage('Preferences updated successfully!');
        setTimeout(() => setSaveSuccessMessage(''), 4000);
      } else {
        const errData = await res.json();
        const friendly = mapErrorToFriendly(errData?.error || 'Failed to update preferences', 'update profile preferences');
        showToast(friendly.message, friendly.type, 4000, friendly.category);
      }
    } catch (err) {
      const friendly = mapErrorToFriendly(err, 'update profile preferences');
      showToast(friendly.message, friendly.type, 4000, friendly.category);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const loadOrders = async () => {
    if (!token) return;
    try {
      const res = await apiFetch('/api/user/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.warn('Failed to load orders', e);
    } finally {
      setLoadingOrders(false);
    }
  };
  
  const loadUserProfile = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Since database gives populated wishlist
        setWishlistProducts(data.wishlist || []);
      } else {
        console.warn('Profile request not ok:', res.statusText);
      }
    } catch (e) {
      console.warn('Silent user profile loading error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile().catch(() => {});
    loadOrders().catch(() => {});
  }, [token]);

  const handleRemoveBookmark = async (id: string) => {
    const p = wishlistProducts.find(item => item._id === id);
    await toggleWishlist(id, p?.name);
    // instant refresh
    setWishlistProducts(prev => prev.filter(p => p._id !== id));
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md text-center py-20 px-4 space-y-4">
        <span className="text-4xl block">🔒</span>
        <h2 className="text-sm font-bold text-slate-700">Your Account</h2>
        <p className="text-xs text-slate-300">Kindly sign in with member accounts to inspect bookmarked items and click history.</p>
        <button
          onClick={() => onNavigate('login')}
          className="rounded-full bg-slate-800 text-white px-5 py-2.5 text-xs font-bold hover:bg-indigo-500 cursor-pointer"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 transition-colors duration-300">
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 md:px-4">
        
        {/* 1. SECURE MEMBER DETAILS CARD */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-slate-50 bg-white p-5 text-center shadow-xs dark:border-slate-700 dark:bg-slate-800/40 space-y-4">
            
            <div className="relative inline-flex">
              <div className="h-16 w-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-2xl font-black uppercase">
                {user?.name?.[0] || 'U'}
              </div>
              <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-800" title="Securely connected"></span>
            </div>

            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{user?.name || 'Verified Explorer'}</h2>
              <p className="text-[10px] font-mono text-indigo-500 bg-indigo-50 px-2.5 py-0.5 rounded-full inline-block dark:bg-indigo-950/40 dark:text-indigo-300 font-extrabold uppercase shrink-0">
                Member Account
              </p>
            </div>

            <div className="pt-2 text-xs text-slate-400 space-y-2 text-left border-t dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-300" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-300" />
                <span>Role: <span className="font-bold underline capitalize">{user?.role || 'User'}</span></span>
              </div>
              <div className="border-t border-slate-50/50 pt-2.5 mt-2.5 dark:border-slate-700/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 dark:text-slate-400 uppercase tracking-wider">Account Status</span>
                  {user?.pendingEmail ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-600 border border-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-950/40 animate-pulse">
                      <Clock className="h-3 w-3 text-indigo-400 animate-spin-slow" />
                      Update in Progress
                    </span>
                  ) : user?.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 border border-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-950/40">
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 border border-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-950/40 animate-pulse">
                      <AlertCircle className="h-3 w-3 text-amber-400" />
                      Email Pending
                    </span>
                  )}
                </div>
                {user?.pendingEmail && (
                  <div className="text-[10px] leading-relaxed text-slate-300 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-50 dark:border-slate-700 mt-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-300">Verifying Change:</span>
                    <span className="truncate block font-mono text-[9px] text-indigo-500 dark:text-indigo-300 mt-0.5">{user.pendingEmail}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 hover:bg-rose-50 text-rose-600 py-2.5 text-xs font-bold transition-all duration-300 cursor-pointer"
              aria-label="Sign out of your account"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign Out Session
            </button>
          </div>

          {/* 1b. GEOGRAPHIC REGIONAL PREFERENCES SETTINGS */}
          <div className="rounded-2xl border border-slate-50 bg-white p-5 shadow-xs dark:border-slate-700 dark:bg-slate-800/40 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-indigo-400" />
              Regional Settings
            </h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-left">
              <div>
                <label htmlFor="profile-full-name" className="block text-[11px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  id="profile-full-name"
                  aria-label="Full Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Explorer Name"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-hidden focus:border-indigo-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-indigo-300 dark:focus:bg-slate-800"
                />
              </div>

              <div>
                <label htmlFor="profile-district" className="block text-[11px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Primary Location / District
                </label>
                <select
                  id="profile-district"
                  aria-label="Primary Location or District Selection"
                  value={selectDistrict}
                  onChange={(e) => setSelectDistrict(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 px-3 py-2 text-xs text-slate-700 dark:text-slate-50 outline-hidden focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/25 focus:bg-white dark:focus:border-indigo-300 dark:focus:bg-slate-800 transition-all duration-300 font-semibold"
                >
                  <option value="" className="bg-white text-slate-400 dark:bg-slate-800 font-semibold">
                    -- Choose Location / District (Optional) --
                  </option>
                  {TAMIL_NADU_DISTRICTS.map((dst) => (
                    <option key={dst} value={dst} className="bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-50 font-semibold selection:bg-indigo-50">
                      {dst}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-300 dark:text-slate-400 mt-1 leading-normal">
                  Your regional click interactions, product views, and visit stats will automatically associate with this location's metrics.
                </p>
              </div>

              {saveSuccessMessage && (
                <div className="rounded-lg bg-emerald-50 text-emerald-600 px-3 py-2 text-[11px] font-bold dark:bg-emerald-950/30 dark:text-emerald-300 animate-pulse">
                  {saveSuccessMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-50 dark:text-slate-800 dark:hover:bg-slate-100 py-2.5 text-xs font-bold transition-all duration-300 disabled:opacity-50 cursor-pointer"
              >
                {isSavingProfile ? 'Saving Changes...' : 'Save Preferences'}
              </button>
            </form>
          </div>

          {/* 1c. UPDATE EMAIL ADDRESS FLOW */}
          <div className="rounded-2xl border border-slate-50 bg-white p-5 shadow-xs dark:border-slate-700 dark:bg-slate-800/40 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-400 flex items-center gap-1.5 justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-indigo-400" />
                Email Settings & Status
              </span>
            </h3>

            {/* COLOR-CODED BADGES STATE TRACKER */}
            <div className="bg-slate-50/50 dark:bg-slate-950/30 rounded-xl p-3 border border-slate-50 dark:border-slate-700/80 space-y-2.5">
              <span className="text-[9px] font-bold text-slate-300 dark:text-slate-400 uppercase tracking-widest block">Security Lifecycle State</span>
              
              <div className="grid grid-cols-3 gap-1.5 text-center">
                {/* 1. Verified State Badge */}
                <div className={`p-1.5 rounded-lg border text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                  user?.isVerified && !user?.pendingEmail
                    ? 'bg-emerald-50/70 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/50 dark:text-emerald-300 shadow-xs'
                    : 'bg-slate-50/20 border-slate-50 text-slate-300 dark:bg-slate-800/10 dark:border-slate-700/40 dark:text-slate-500'
                }`}>
                  <CheckCircle className={`h-3.5 w-3.5 ${user?.isVerified && !user?.pendingEmail ? 'text-emerald-400' : 'text-slate-200 dark:text-slate-600'}`} />
                  <span>Verified</span>
                </div>

                {/* 2. Email Pending State Badge */}
                <div className={`p-1.5 rounded-lg border text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                  !user?.isVerified && !user?.pendingEmail
                    ? 'bg-amber-50/70 border-amber-100 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800/50 dark:text-amber-300 shadow-xs animate-pulse'
                    : 'bg-slate-50/20 border-slate-50 text-slate-300 dark:bg-slate-800/10 dark:border-slate-700/40 dark:text-slate-500'
                }`}>
                  <AlertCircle className={`h-3.5 w-3.5 ${!user?.isVerified && !user?.pendingEmail ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'}`} />
                  <span>Email Pending</span>
                </div>

                {/* 3. Update in Progress State Badge */}
                <div className={`p-1.5 rounded-lg border text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                  user?.pendingEmail
                    ? 'bg-indigo-50/70 border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-800/50 dark:text-indigo-300 shadow-xs animate-pulse'
                    : 'bg-slate-50/20 border-slate-50 text-slate-300 dark:bg-slate-800/10 dark:border-slate-700/40 dark:text-slate-500'
                }`}>
                  <Clock className={`h-3.5 w-3.5 ${user?.pendingEmail ? 'text-indigo-400 animate-spin-slow' : 'text-slate-200 dark:text-slate-600'}`} />
                  <span>In Progress</span>
                </div>
              </div>

              {/* USER UNDERSTANDABLE ALERT BOX */}
              <div className="mt-2 text-[10.5px] leading-relaxed">
                {user?.pendingEmail ? (
                  <div className="bg-indigo-50/40 text-indigo-800 border border-indigo-50/50 rounded-lg p-2.5 dark:bg-indigo-950/10 dark:text-indigo-200 dark:border-indigo-950/30 space-y-1">
                    <div className="font-extrabold flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
                      <Clock className="h-3.5 w-3.5 animate-spin-slow" />
                      <span>Email Change Pending Verification</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-300 text-[10px] leading-normal">
                      We sent a confirmation link to <strong className="font-bold underline text-indigo-500 dark:text-indigo-300">{user.pendingEmail}</strong>. 
                      To protect your security, your current email (<span className="font-mono text-[9px]">{user.email}</span>) remains active and fully secure. Once you click the link, your profile will update automatically!
                    </p>
                  </div>
                ) : user?.isVerified ? (
                  <div className="bg-emerald-50/30 text-emerald-800 border border-emerald-50/30 rounded-lg p-2.5 dark:bg-emerald-950/10 dark:text-emerald-200 dark:border-emerald-950/30 space-y-1">
                    <div className="font-extrabold flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Account Fully Secured & Verified</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-300 text-[10px] leading-normal">
                      Your current email <strong className="font-bold">{user.email}</strong> is verified. You can update your email address below if you'd like to transfer your account record to a new address.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50/40 text-amber-800 border border-amber-50/50 rounded-lg p-2.5 dark:bg-amber-950/10 dark:text-amber-200 dark:border-amber-950/30 space-y-1">
                    <div className="font-extrabold flex items-center gap-1 text-amber-600 dark:text-amber-300">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Primary Email Verification Pending</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-300 text-[10px] leading-normal">
                      Please verify your email address <strong className="font-bold">{user?.email}</strong>. Once verified, you will have access to save bookmarked products, write reviews, and unlock regional support desk services.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <form onSubmit={handleUpdateEmail} className="space-y-3.5 text-left pt-1">
              <div>
                <label htmlFor="new-profile-email" className="block text-[11px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Change Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    id="new-profile-email"
                    aria-label="New Email Address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address..."
                    className="w-full rounded-lg border border-slate-100 bg-slate-50/50 pl-8 pr-3 py-2 text-xs text-slate-700 outline-hidden focus:border-indigo-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-indigo-300 dark:focus:bg-slate-800"
                  />
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-300" />
                </div>
                <p className="text-[10px] text-slate-300 dark:text-slate-400 mt-1.5 leading-normal">
                  Your new email will receive a confirmation link. The update completes once verified.
                </p>
              </div>

              {emailUpdateStatus && (
                <div className={`rounded-lg px-3 py-2.5 text-[11px] font-bold ${
                  emailUpdateStatus.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-50/50 dark:border-emerald-950/40' 
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-50/50 dark:border-rose-950/40'
                }`}>
                  {emailUpdateStatus.message}
                </div>
              )}

              {simulatedEmailUrl && (
                <div className="rounded-xl bg-indigo-50/20 p-3 border border-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-950/40 space-y-2">
                  <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">
                    <span>✉️</span>
                    <span>Simulated Inbox (Development Mode)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-300 leading-normal">
                    You can click the verification button below directly to simulate receiving the verification link sent to your new inbox:
                  </p>
                  <a
                    href={simulatedEmailUrl}
                    className="inline-flex w-full justify-center items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white py-2 text-[10px] font-extrabold text-center transition-all duration-300 shadow-xs"
                  >
                    <RefreshCw className="h-3 w-3 animate-spin-slow" />
                    Verify and Update Email Right Now
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingEmail}
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-50 dark:text-slate-800 dark:hover:bg-slate-100 py-2.5 text-xs font-bold transition-all duration-300 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isUpdatingEmail ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Sending Verification Link...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-3.5 w-3.5" />
                    Initiate Email Update
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 2. WISHLIST BOOKMARKS CONTAINER */}
        <div className="lg:col-span-3 space-y-8">
          
          <div className="relative z-30 overflow-visible flex border-b border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'wishlist' ? 'border-b-2 border-indigo-500 text-indigo-500 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <Heart className="h-4 w-4 shrink-0" />
              <span>Bookmarks ({wishlistProducts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'orders' ? 'border-b-2 border-indigo-500 text-indigo-500 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
              <span>Orders ({orders.length})</span>
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="space-y-4">
            {activeTab === 'orders' ? (
              loadingOrders ? (
                <div className="grid grid-cols-1 gap-4 animate-pulse">
                  {[...Array(2)].map((_, i) => (
                    <div key={'order-skeleton-' + i} className="h-32 rounded-xl bg-slate-50 dark:bg-slate-800/50"></div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">No Orders Found</p>
                  <p className="text-xs text-slate-500 mt-2 dark:text-slate-400">You haven't placed any orders yet.</p>
                  <button onClick={() => onNavigate('products')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:bg-indigo-500 transition-colors">Start Shopping</button>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map(order => (
                    <div key={order._id} className="border border-slate-200 rounded-2xl overflow-hidden dark:border-slate-700 bg-white dark:bg-black shadow-sm">
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">Order #{order._id.substring(order._id.length - 8).toUpperCase()}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                           <span className={'inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ' + (
                              order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                              order.status === 'Cancelled' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            )}>
                              {order.status}
                            </span>
                            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1.5">${order.totalAmount.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex gap-4">
                             <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden dark:bg-slate-900 dark:border-slate-800 shrink-0 flex items-center justify-center">
                                {item.product?.images?.[0] ? (
                                  <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-contain p-2" />
                                ) : (
                                  <span className="text-slate-300 text-xs text-center p-2 break-all">{item.product?.name?.substring(0,2) || 'NA'}</span>
                                )}
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-semibold text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400" onClick={() => onNavigate('product-detail', item.product?.slug)}>{item.product?.name || 'Unknown Product'}</p>
                               <div className="flex items-center gap-2 mt-1">
                                 <span className="text-xs text-slate-500 dark:text-slate-400">Qty: {item.quantity}</span>
                                 <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                 <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">${item.price.toFixed(2)}</span>
                               </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={'bookmark-skeleton-' + i} className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-xs dark:border-slate-700 overflow-hidden">
                    <div className="h-32 bg-slate-50 dark:bg-slate-800/50 shrink-0"></div>
                    <div className="p-4 flex flex-col flex-grow space-y-2.5">
                      <div className="h-3 w-1/3 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                      <div className="h-5 w-full bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                      <div className="h-4 w-3/4 bg-slate-50 dark:bg-slate-800/50 rounded flex"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : wishlistProducts.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="mx-auto w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 dark:bg-slate-800 text-slate-300 dark:text-slate-600">
                  <Heart className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Your wishlist is empty</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6 dark:text-slate-400">Save your favorite gadgets and compare them later. They will appear here safely.</p>
                <button
                  onClick={() => onNavigate('products')}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  Explore Gadgets
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistProducts.map((p) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={p._id}
                    className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-xs transition-all hover:shadow-md dark:border-slate-700 dark:bg-black overflow-hidden relative"
                  >
                    <button
                      onClick={() => handleRemoveBookmark(p._id)}
                      className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 shadow-sm text-rose-500 hover:bg-rose-50 hover:scale-110 transition-all dark:bg-slate-900/90"
                      aria-label="Remove from bookmarks"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                    <div className="h-40 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 cursor-pointer shrink-0" onClick={() => onNavigate('product-detail', p.slug)}>
                      <img
                        src={p.images?.[0] || 'https://via.placeholder.com/300?text=No+Image'}
                        alt={p.name}
                        className="h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1">
                        {typeof p.category === 'string' ? p.category : p.category?.name || ''}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug cursor-pointer hover:text-indigo-600" onClick={() => onNavigate('product-detail', p.slug)}>
                        {p.name}
                      </h3>
                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <span className="text-xs font-black font-mono text-slate-950 dark:text-white">{formatProductPrice(getValidatedPricing(p).price, p)}</span>
                        <button
                          onClick={() => onNavigate('product-detail', p.slug)}
                          className="rounded bg-slate-50 hover:bg-slate-100 py-1 px-3.2 text-[10px] text-slate-600 font-bold dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 font-mono"
                        >
                          Specs Deck
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          {/* Tips block */}
          <div className="rounded-2xl bg-indigo-50/40 p-6 border border-indigo-50/20 flex gap-4 text-indigo-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            <Sparkle className="h-6 w-6 text-indigo-400 shrink-0 animate-pulse mt-0.5" />
            <div className="view-details-block space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider">MEMBER BENEFITS EXCLUSIVE</h4>
              <p className="text-[11px] leading-relaxed opacity-90">Enjoy early access to gadget restocks, priority response in Q&A, and secure price tracking. Ensure your account is secured.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
            <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              <ShieldCheck className="h-3 w-3" /> Integrity Log
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-300 leading-relaxed">Bookmarks of product collections and wishlist items are securely logged to ensure 100% platform integrity and session security across all your devices.</p>
          </div>

        </div>
      </div>

    </div>
  );
};
