import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Product } from '../types';
import { safeSetItem } from '../utils/localStorage';
import { mapErrorToFriendly } from '../utils/errorMapper';
import { 
  User, Heart, ExternalLink, ShieldCheck, Mail, LogOut, Sparkle, Tag, Trash2,
  ShoppingBag, Truck, Calendar, DollarSign, CheckCircle, Box, AlertCircle, MapPin
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

interface Order {
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

  // Sync state if user loads dynamically
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setSelectDistrict(user.district || 'Chennai');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSavingProfile(true);
    setSaveSuccessMessage('');
    try {
      const res = await fetch('/api/user/profile', {
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
      const res = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Since database gives populated wishlist
        setWishlistProducts(data.wishlist || []);
      } else {
        console.warn("Failed to source user profile details with status:", res.status);
      }
    } catch (e) {
      console.warn("Failing of sourcing populated user profile wishlists:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, [wishlist, token]);

  const handleRemoveBookmark = async (id: string) => {
    await toggleWishlist(id);
    // instant refresh
    setWishlistProducts(prev => prev.filter(p => p._id !== id));
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md text-center py-20 px-4 space-y-4">
        <span className="text-4xl block">🔒</span>
        <h2 className="text-sm font-bold text-slate-800">Secure Profile Desk</h2>
        <p className="text-xs text-slate-400">Kindly sign in with member accounts to inspect bookmarked items and click history.</p>
        <button
          onClick={() => onNavigate('login')}
          className="rounded-full bg-slate-900 text-white px-5 py-2.5 text-xs font-bold hover:bg-indigo-600 cursor-pointer"
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
          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
            
            <div className="relative inline-flex">
              <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-black uppercase">
                {user?.name?.[0] || 'U'}
              </div>
              <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" title="Securely connected"></span>
            </div>

            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{user?.name || 'Verified Explorer'}</h2>
              <p className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full inline-block dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold uppercase shrink-0">
                Member Account
              </p>
            </div>

            <div className="pt-2 text-xs text-slate-500 space-y-2 text-left border-t dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>Role: <span className="font-bold underline capitalize">{user?.role || 'User'}</span></span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 text-xs font-bold transition-all cursor-pointer"
              aria-label="Sign out of your account"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign Out Session
            </button>
          </div>

          {/* 1b. GEOGRAPHIC REGIONAL PREFERENCES SETTINGS */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-indigo-500" />
              Regional Settings
            </h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-left">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Explorer Name"
                  className="w-full rounded-lg border border-slate-202 bg-slate-50/50 px-3 py-2 text-xs text-slate-808 outline-hidden focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Primary Location / District
                </label>
                <select
                  value={selectDistrict}
                  onChange={(e) => setSelectDistrict(e.target.value)}
                  className="w-full rounded-lg border border-slate-202 bg-white dark:border-slate-800 dark:bg-slate-950 px-3 py-2 text-xs text-slate-808 dark:text-slate-100 outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/25 focus:bg-white dark:focus:border-indigo-400 dark:focus:bg-slate-900 transition-all font-semibold"
                >
                  {TAMIL_NADU_DISTRICTS.map((dst) => (
                    <option key={dst} value={dst} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100 font-semibold selection:bg-indigo-100">
                      {dst}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                  Your regional click interactions, product views, and visit stats will automatically associate with this location's metrics.
                </p>
              </div>

              {saveSuccessMessage && (
                <div className="rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 text-[11px] font-bold dark:bg-emerald-950/30 dark:text-emerald-400 animate-pulse">
                  {saveSuccessMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 py-2.5 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSavingProfile ? 'Saving Changes...' : 'Save Preferences'}
              </button>
            </form>
          </div>
        </div>

        {/* 2. WISHLIST BOOKMARKS CONTAINER */}
        <div className="lg:col-span-3 space-y-8">
          
          <div className="relative z-30 overflow-visible flex border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400">
              <Heart className="h-4 w-4 text-rose-500 shrink-0" />
              <span>Bookmarks ({wishlistProducts.length})</span>
            </div>
          </div>

          {/* BOOKMARKS LIST */}
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 overflow-hidden">
                    <div className="h-32 bg-slate-100 dark:bg-slate-900/50 shrink-0"></div>
                    <div className="p-4 flex flex-col flex-grow space-y-2.5">
                      <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-900/50 rounded"></div>
                      <div className="h-5 w-full bg-slate-100 dark:bg-slate-900/50 rounded"></div>
                      <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-900/50 rounded flex"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : wishlistProducts.length === 0 ? (
              <div className="border border-dashed border-slate-200 p-12 rounded-2xl text-center dark:border-slate-800 space-y-3">
                <span className="text-3xl block">🏷️</span>
                <p className="text-xs text-slate-400 italic">Your bookmark list is currently empty. Bookmark product specs to save them here.</p>
                <button
                  onClick={() => onNavigate('products')}
                  className="rounded-full bg-slate-900 border border-slate-900 text-white font-bold text-xs px-4 py-2 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Explore Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistProducts.map((p) => (
                  <div
                    key={p._id}
                    className="group border border-slate-200 bg-white rounded-2xl overflow-hidden dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
                  >
                    <div className="h-32 bg-slate-100 relative shrink-0">
                      <img loading="lazy" src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      
                      <button
                        onClick={() => handleRemoveBookmark(p._id)}
                        className="absolute top-2.5 right-2.5 h-8 w-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-500 shadow-md transition-colors cursor-pointer-none border-0"
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
                          className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate cursor-pointer hover:text-indigo-600 transition-colors"
                        >
                          {p.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono font-bold mt-1 uppercase leading-none">{p.brand || 'Premium Line'}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                        <span className="text-xs font-black font-mono text-slate-950 dark:text-white">₹{p.price}</span>
                        <button
                          onClick={() => onNavigate('product-detail', p.slug)}
                          className="rounded bg-slate-100 hover:bg-slate-200 py-1 px-3.2 text-[10px] text-slate-700 font-bold dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 font-mono"
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
          <div className="rounded-2xl bg-indigo-50/40 p-6 border border-indigo-100/20 flex gap-4 text-indigo-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">
            <Sparkle className="h-6 w-6 text-indigo-500 shrink-0 animate-pulse mt-0.5" />
            <div className="view-details-block space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider">MEMBER BENEFITS EXCLUSIVE</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Bookmarks of product collections and dynamic pricing alerts are securely logged to ensure 100% platform integrity and session security across all your devices.</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
