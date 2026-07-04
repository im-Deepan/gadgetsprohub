import React, { useState, useEffect } from 'react';
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

const TAMIL_NADU_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
  "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur",
  "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris",
  "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivagangai",
  "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
  "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore",
  "Viluppuram", "Virudhunagar"
];

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

  // Profile preferences sync states
  const [editName, setEditName] = useState(user?.name || '');
  const [selectDistrict, setSelectDistrict] = useState(user?.district || 'Chennai');
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
      setSelectDistrict(user.district || 'Chennai');
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
      if (res.ok) {
        setEmailUpdateStatus({
          type: 'success',
          message: data.message || 'A verification link has been sent to your new email address.'
        });
        showToast(data.message || 'Verification link sent!', 'success');
        if (data.verificationUrlSimulated) {
          setSimulatedEmailUrl(data.verificationUrlSimulated);
        }
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
  }, [wishlist, token]);

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
        <h2 className="text-sm font-bold text-slate-700">Secure Profile Desk</h2>
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 hover:bg-rose-50 text-rose-600 py-2.5 text-xs font-bold transition-all cursor-pointer"
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
                  className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 px-3 py-2 text-xs text-slate-700 dark:text-slate-50 outline-hidden focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/25 focus:bg-white dark:focus:border-indigo-300 dark:focus:bg-slate-800 transition-all font-semibold"
                >
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
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-50 dark:text-slate-800 dark:hover:bg-slate-100 py-2.5 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
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
                <div className={`p-1.5 rounded-lg border text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all ${
                  user?.isVerified && !user?.pendingEmail
                    ? 'bg-emerald-50/70 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/50 dark:text-emerald-300 shadow-xs'
                    : 'bg-slate-50/20 border-slate-50 text-slate-300 dark:bg-slate-800/10 dark:border-slate-700/40 dark:text-slate-500'
                }`}>
                  <CheckCircle className={`h-3.5 w-3.5 ${user?.isVerified && !user?.pendingEmail ? 'text-emerald-400' : 'text-slate-200 dark:text-slate-600'}`} />
                  <span>Verified</span>
                </div>

                {/* 2. Email Pending State Badge */}
                <div className={`p-1.5 rounded-lg border text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all ${
                  !user?.isVerified && !user?.pendingEmail
                    ? 'bg-amber-50/70 border-amber-100 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800/50 dark:text-amber-300 shadow-xs animate-pulse'
                    : 'bg-slate-50/20 border-slate-50 text-slate-300 dark:bg-slate-800/10 dark:border-slate-700/40 dark:text-slate-500'
                }`}>
                  <AlertCircle className={`h-3.5 w-3.5 ${!user?.isVerified && !user?.pendingEmail ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'}`} />
                  <span>Email Pending</span>
                </div>

                {/* 3. Update in Progress State Badge */}
                <div className={`p-1.5 rounded-lg border text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all ${
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
                    className="inline-flex w-full justify-center items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white py-2 text-[10px] font-extrabold text-center transition-all shadow-xs"
                  >
                    <RefreshCw className="h-3 w-3 animate-spin-slow" />
                    Verify and Update Email Right Now
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingEmail}
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-50 dark:text-slate-800 dark:hover:bg-slate-100 py-2.5 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
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
            <div className="flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-indigo-500 text-indigo-500 dark:text-indigo-300">
              <Heart className="h-4 w-4 text-rose-400 shrink-0" />
              <span>Bookmarks ({wishlistProducts.length})</span>
            </div>
          </div>

          {/* BOOKMARKS LIST */}
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={`bookmark-skeleton-${i}`} className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-xs dark:border-slate-700 overflow-hidden">
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
              <div className="border border-dashed border-slate-100 p-12 rounded-2xl text-center dark:border-slate-700 space-y-3">
                <span className="text-3xl block">🏷️</span>
                <p className="text-xs text-slate-300 italic">Your bookmark list is currently empty. Bookmark product specs to save them here.</p>
                <button
                  onClick={() => onNavigate('products')}
                  className="rounded-full bg-slate-800 border border-slate-800 text-white font-bold text-xs px-4 py-2 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Explore Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistProducts.map((p) => (
                  <div
                    key={p._id}
                    className="group border border-slate-100 bg-white rounded-2xl overflow-hidden dark:border-slate-700 dark:bg-slate-800 flex flex-col justify-between"
                  >
                    <div className="h-32 bg-slate-50 relative shrink-0">
                      <img loading="lazy" src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      
                      <button
                        onClick={() => handleRemoveBookmark(p._id)}
                        className="absolute top-2.5 right-2.5 h-8 w-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-500 text-slate-400 shadow-md transition-colors cursor-pointer-none border-0"
                        title="Remove bookmark"
                        aria-label={`Remove ${p.name} from bookmarks`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="p-4 space-y-3.5 flex-grow flex flex-col justify-between">
                      <div>
                        <h4
                          onClick={() => onNavigate('product-detail', p.slug)}
                          className="text-xs sm:text-sm font-bold text-slate-700 dark:text-white truncate cursor-pointer hover:text-indigo-500 transition-colors"
                        >
                          {p.name}
                        </h4>
                        <p className="text-[10px] text-slate-300 font-mono font-bold mt-1 uppercase leading-none">{p.brand || 'Premium Line'}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-700 pt-3">
                        <span className="text-xs font-black font-mono text-slate-950 dark:text-white">₹{p.price}</span>
                        <button
                          onClick={() => onNavigate('product-detail', p.slug)}
                          className="rounded bg-slate-50 hover:bg-slate-100 py-1 px-3.2 text-[10px] text-slate-600 font-bold dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 font-mono"
                        >
                          Specs Deck
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips block */}
          <div className="rounded-2xl bg-indigo-50/40 p-6 border border-indigo-50/20 flex gap-4 text-indigo-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            <Sparkle className="h-6 w-6 text-indigo-400 shrink-0 animate-pulse mt-0.5" />
            <div className="view-details-block space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider">MEMBER BENEFITS EXCLUSIVE</h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-300 leading-relaxed">Bookmarks of product collections and dynamic pricing alerts are securely logged to ensure 100% platform integrity and session security across all your devices.</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
