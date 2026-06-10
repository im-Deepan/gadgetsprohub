import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { ChevronLeft, ChevronRight, Heart, Star, ShoppingBag, ExternalLink, ShieldCheck, CheckCheck, MessageSquare, Plus, Check, X, BookmarkCheck, Edit, Sparkles, Box, CheckCircle, Video, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import { AdSenseBanner } from '../components/AdSenseBanner';

interface ProductDetailProps {
  productSlug: string;
  onNavigate: (view: string, slug?: string) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ productSlug, onNavigate }) => {
  const { wishlist, toggleWishlist, isAuthenticated, user, token } = useAuth();
  
  // States
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [showRedirectingModal, setShowRedirectingModal] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProductsSequence, setAllProductsSequence] = useState<Product[]>([]);
  
  // Direct Product Live Edit
  const [isAdminEditVisible, setIsAdminEditVisible] = useState(false);
  const [isSavingAdminEdit, setIsSavingAdminEdit] = useState(false);
  const [adminEditSuccess, setAdminEditSuccess] = useState(false);
  const [adminEditForm, setAdminEditForm] = useState({
    name: '',
    price: '',
    originalPrice: '',
    discount: '',
    affiliateLink: '',
    description: '',
    longDescription: '',
    features: '',
    pros: '',
    cons: '',
    videoUrl: ''
  });

  // Add Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Past Orders simulation logger
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const handlePlaceSimulatedOrder = async () => {
    if (!token || !product) return;
    setOrderLoading(true);
    try {
      const orderItems = [{ product: product._id, quantity: 1, price: product.price }];
      const orderRes = await fetch('/api/user/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: orderItems,
          totalAmount: product.price
        })
      });
      if (orderRes.ok) {
        setOrderSuccess(true);
        setTimeout(() => setOrderSuccess(false), 3500);
      } else {
        const errData = await orderRes.json();
        alert(errData.error || "Failed to submit order entry.");
      }
    } catch (e) {
      console.warn("Could not submit simulated order:", e);
    } finally {
      setOrderLoading(false);
    }
  };

  // Sourcing product stats
  const loadProductStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productSlug}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        setActiveImageIdx(0);
        setShowVideo(false);
        
        // Prefill direct admin edit parameters
        setAdminEditForm({
          name: data.name || '',
          price: String(data.price || ''),
          originalPrice: String(data.originalPrice || ''),
          discount: String(data.discount || ''),
          affiliateLink: data.affiliateLink || '',
          description: data.description || '',
          longDescription: data.longDescription || '',
          features: data.features?.join(', ') || '',
          pros: data.pros?.join(', ') || '',
          cons: data.cons?.join(', ') || '',
          videoUrl: data.videoUrl || ''
        });
        
        // Store the viewed product in localStorage for "Pick where you left off"
        try {
          localStorage.removeItem('aff_history_cleared');
          const stored = localStorage.getItem('aff_recent_viewed');
          let recents: any[] = stored ? JSON.parse(stored) : [];
          // Keep only simple info to avoid large sizes
          const productSummary = {
            _id: data._id,
            name: data.name,
            slug: data.slug,
            price: data.price,
            originalPrice: data.originalPrice,
            discount: data.discount,
            images: [data.images?.[0]],
            brand: data.brand,
            category: data.category,
            description: data.description,
            rating: data.rating
          };
          recents = recents.filter(p => p._id !== data._id);
          recents.unshift(productSummary);
          recents = recents.slice(0, 10); // Keep last 10
          localStorage.setItem('aff_recent_viewed', JSON.stringify(recents));
        } catch (err) {
          console.warn('Failed to save recent product:', err);
        }

        // Disable global loading state instantly so the user can interact/view the spec sheets right away!
        setLoading(false);
        
        // Fetch related products in the background so it doesn't block loading
        const catId = typeof data.category === 'object' ? data.category._id : data.category;
        fetch(`/api/products?category=${catId}&limit=4`)
          .then(async (relRes) => {
            if (relRes.ok) {
              const relData = await relRes.json();
              const filtered = (relData.products || []).filter((p: Product) => p._id !== data._id);
              setRelatedProducts(filtered);
            }
          })
          .catch(err => {
            console.warn("Background fetch of related specifications failed:", err);
          });
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.warn("Error retrieving specifications catalog details:", e);
      setLoading(false);
    }
  };

  const handleAdminEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !token) return;
    setIsSavingAdminEdit(true);
    setAdminEditSuccess(false);

    try {
      const payload = {
        name: adminEditForm.name,
        price: Number(adminEditForm.price) || 0,
        originalPrice: adminEditForm.originalPrice ? Number(adminEditForm.originalPrice) : undefined,
        discount: adminEditForm.discount ? Number(adminEditForm.discount) : undefined,
        affiliateLink: adminEditForm.affiliateLink,
        description: adminEditForm.description,
        longDescription: adminEditForm.longDescription,
        features: adminEditForm.features.split(',').map((f: string) => f.trim()).filter(Boolean),
        pros: adminEditForm.pros.split(',').map((f: string) => f.trim()).filter(Boolean),
        cons: adminEditForm.cons.split(',').map((f: string) => f.trim()).filter(Boolean),
        videoUrl: adminEditForm.videoUrl
      };

      const res = await fetch(`/api/admin/products/${product._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setProduct(prev => prev ? { ...prev, ...payload } : null);
        setAdminEditSuccess(true);
        setTimeout(() => setAdminEditSuccess(false), 2500);
      } else {
        alert("Failed to save changes. Ensure you are authorized.");
      }
    } catch (err) {
      console.warn("Product live save error:", err);
    } finally {
      setIsSavingAdminEdit(false);
    }
  };

  // Auto loop images every 10 seconds
  useEffect(() => {
    if (!product || !product.images || product.images.length <= 1) return;

    const interval = setInterval(() => {
      setActiveImageIdx((prev) => (prev + 1) % product.images.length);
    }, 10000); // 10 seconds rotation loop

    return () => clearInterval(interval);
  }, [product, activeImageIdx]);

  useEffect(() => {
    if (productSlug) {
      loadProductStats();
    }
  }, [productSlug]);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => { if (res.ok) return res.json(); })
      .then(data => { if (data) setCategories(data); })
      .catch(err => console.warn("Could not fetch categories list in details:", err));
  }, []);

  useEffect(() => {
    fetch('/api/products?limit=100')
      .then(res => { if (res.ok) return res.json(); })
      .then(data => {
        if (data && data.products) {
          setAllProductsSequence(data.products);
        }
      })
      .catch(err => console.warn("Could not load products sequence in details:", err));
  }, []);

  // Click tracker and external routing proxy
  const handleAffiliateClick = async () => {
    if (!product) return;
    try {
      // Trigger API endpoint click tracking logging
      await fetch(`/api/products/click/${product.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
    } catch (e) {
      console.warn('Click tracking API logging fail:', e);
    }

    // Trigger visual overlay popup and open link
    setShowRedirectingModal(true);
    setTimeout(() => {
      window.open(product.affiliateLink, '_blank', 'noreferrer,noopener');
      setShowRedirectingModal(false);
    }, 2200);
  };

  // Submit dynamic review posting
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !token) return;
    
    setReviewError('');
    setReviewSuccess(false);

    try {
      const resp = await fetch(`/api/products/${product._id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: reviewRating,
          title: reviewTitle,
          content: reviewContent
        })
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Failed to submit review online.');
      }

      const updatedProduct = await resp.json();
      setProduct(updatedProduct);

      setReviewTitle('');
      setReviewContent('');
      setReviewSuccess(true);
    } catch (err: any) {
      setReviewError(err.message || 'Failing to log reviews.');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8 animate-pulse text-slate-805 dark:text-slate-100">
        {/* Breadcrumb Skeleton */}
        <div className="flex mb-8 md:px-4">
          <div className="h-9 w-48 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        </div>

        {/* Main Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:px-4 mb-16">
          {/* Left Column: Image Area */}
          <div className="space-y-4">
            <div className="h-[430px] rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
            <div className="flex gap-3 overflow-x-auto py-1">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="w-20 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
              ))}
            </div>
          </div>

          {/* Right Column: Key Details */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>

            <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>

            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="grid grid-cols-2 gap-4">
                {[...Array(6)].map((_, idx) => (
                  <div key={idx} className="space-y-1 bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-xl text-center py-20 px-4">
        <span className="text-4xl">⚠️</span>
        <h2 className="text-sm font-bold text-slate-800 mt-4">Specification Data Not Found</h2>
        <p className="text-xs text-slate-400 mt-1">We are unable to extract the requested product specifications slug. Try browsing other models.</p>
        <button
          onClick={() => onNavigate('products')}
          className="mt-6 rounded-full bg-slate-900 text-white px-5 py-2 px-4 py-2 text-xs font-semibold hover:bg-indigo-600 cursor-pointer"
        >
          Check products catalog
        </button>
      </div>
    );
  }

  // Find current sequence information
  const currentIdx = allProductsSequence.findIndex(p => p.slug === productSlug || (product && p._id === product._id));
  const prevProduct = currentIdx > 0 ? allProductsSequence[currentIdx - 1] : null;
  const nextProduct = currentIdx !== -1 && currentIdx < allProductsSequence.length - 1 ? allProductsSequence[currentIdx + 1] : null;

  // Specifications fields map
  const specMap = product.specifications || {};

  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8 transition-colors duration-300">
      <Helmet>
        <title>{product ? `${product.name} - Price, Specs & Reviews` : 'Product Details'} | gadgetsprohub</title>
        <meta name="description" content={product?.description || "Check out this premium gadget on gadgetsprohub."} />
        <meta property="og:title" content={`${product?.name} | gadgetsprohub`} />
        {product?.images?.[0] && <meta property="og:image" content={product.images[0]} />}
      </Helmet>
      
      {/* 1. TOP BREADCRUMB HEADER */}
      <div className="flex mb-8 md:px-4">
        <button
          onClick={() => onNavigate('products')}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer transition-all hover:border-slate-350"
        >
          <ChevronLeft className="h-4 w-4 text-slate-500 shrink-0" />
          <span>Back to Showcase Catalog</span>
        </button>
      </div>

      {/* 2. BODY SPECS EXPAND PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:px-4 mb-16">
        
        {/* Left Side: Image Gallery */}
        <div className="w-full">
          {product && (
            <div className="flex gap-4 md:flex-row flex-col-reverse items-start w-full">
              {/* Sibling thumbnails panel on the left of the main image */}
              {product.images && product.images.length > 0 && (
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto max-h-[430px] md:w-20 w-full shrink-0 pr-1 scrollbar-none py-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveImageIdx(idx);
                        setShowVideo(false);
                      }}
                      className={`w-20 h-16 rounded-xl border-2 overflow-hidden shrink-0 cursor-pointer transition-all ${
                        !showVideo && activeImageIdx === idx 
                          ? 'border-indigo-600 ring-2 ring-indigo-100 dark:ring-indigo-950/50' 
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </button>
                  ))}

                  {/* Add Video thumbnail */}
                  <button
                    type="button"
                    onClick={() => setShowVideo(true)}
                    className={`w-20 h-16 rounded-xl border-2 overflow-hidden shrink-0 cursor-pointer transition-all flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 ${
                      showVideo 
                        ? 'border-indigo-600 ring-2 ring-indigo-100 dark:ring-indigo-950/50 bg-indigo-50/20 text-indigo-600' 
                        : 'border-slate-350 dark:border-slate-700 hover:border-slate-400 bg-slate-50 dark:bg-slate-950 text-slate-500'
                    }`}
                  >
                    <Video className={`h-5 w-5 ${showVideo ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : ''}`} />
                    <span className="text-[9px] font-bold mt-1">Video Demo</span>
                  </button>
                </div>
              )}

              {/* Main Display Frame */}
              <div className="flex-1 relative h-[430px] w-full rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs shrink-0 flex items-center justify-center bg-slate-100/50 dark:bg-slate-950/20">
                {showVideo ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <video
                      key={product.videoUrl || 'fallback-video'}
                      className="w-full h-full object-contain pointer-events-auto"
                      controls
                      playsInline
                      preload="metadata"
                      referrerPolicy="no-referrer"
                      poster={product.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600'}
                    >
                      <source 
                        src={product.videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-rotating-tech-product-display-42023-large.mp4"} 
                        type="video/mp4" 
                      />
                      Your browser does not support the video tag.
                    </video>
                    
                    <div className="absolute top-3 left-3 bg-indigo-600/90 backdrop-blur-xs text-white text-[9px] font-black uppercase font-mono px-2 py-1 rounded-md tracking-wider shadow-sm select-none">
                      Interactive Video Demo
                    </div>
                  </div>
                ) : (
                  <img
                    src={(product.images && product.images[activeImageIdx]) || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600'}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain p-4 transition-transform hover:scale-101 duration-305 cursor-zoom-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('open-lightbox', {
                        detail: {
                          src: (product.images && product.images[activeImageIdx]) || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
                          images: product.images || [],
                          currentIndex: activeImageIdx,
                          alt: product.name
                        }
                      }));
                    }}
                    title="Zoom image"
                  />
                )}

                {/* Symmetrical arrows navigation pill elegantly positioned at the bottom of the image */}
                {!showVideo && product.images && product.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-3.5 py-2 rounded-full shadow-lg border border-slate-200/50 dark:border-slate-800/80 transition-transform hover:scale-105 z-10 select-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx((prev) => (prev - 1 + product.images.length) % product.images.length);
                      }}
                      className="p-1 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
                      title="Previous Image"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[10px] font-mono font-black tracking-wider text-slate-600 dark:text-slate-400">
                      {activeImageIdx + 1} / {product.images.length}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx((prev) => (prev + 1) % product.images.length);
                      }}
                      className="p-1 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
                      title="Next Image"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Product Details */}
        <div className="space-y-6">
          {/* Admin Live Product details modifier action panel */}
          {user && (user.role === 'admin') && (
            <div className="rounded-2xl border border-violet-200/60 bg-violet-50/15 p-5 dark:border-violet-900/40 dark:bg-violet-950/20 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-xs font-bold text-violet-800 dark:text-violet-300">🔧 Admin Live Creator Deck</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminEditVisible(!isAdminEditVisible)}
                  className="text-xs font-bold text-violet-700 hover:text-violet-950 dark:text-violet-400 dark:hover:text-violet-300 underline cursor-pointer"
                >
                  {isAdminEditVisible ? 'Hide Editor Panel' : '✏️ Quick Edit Product Specs'}
                </button>
              </div>

              {isAdminEditVisible && (
                <form onSubmit={handleAdminEditSubmit} className="space-y-2.5 pt-1 text-slate-805 dark:text-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Product Title</label>
                    <input
                      type="text"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      value={adminEditForm.name}
                      onChange={e => setAdminEditForm({ ...adminEditForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        value={adminEditForm.price}
                        onChange={e => setAdminEditForm({ ...adminEditForm, price: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Original Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        value={adminEditForm.originalPrice}
                        onChange={e => setAdminEditForm({ ...adminEditForm, originalPrice: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Discount (%)</label>
                      <input
                        type="number"
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        value={adminEditForm.discount}
                        onChange={e => setAdminEditForm({ ...adminEditForm, discount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Affiliate Destination Link / Shop URL</label>
                    <input
                      type="text"
                      className="w-full text-xs p-2 rounded-lg border border-indigo-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-indigo-650 dark:text-indigo-400"
                      value={adminEditForm.affiliateLink}
                      onChange={e => setAdminEditForm({ ...adminEditForm, affiliateLink: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Demo Video URL (Direct MP4 clip link)</label>
                    <input
                      type="text"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono"
                      value={adminEditForm.videoUrl}
                      onChange={e => setAdminEditForm({ ...adminEditForm, videoUrl: e.target.value })}
                      placeholder="e.g. https://assets.mixkit.co/...-large.mp4"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Short Outline Summary</label>
                    <input
                      type="text"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      value={adminEditForm.description}
                      onChange={e => setAdminEditForm({ ...adminEditForm, description: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Deep specification details (Text/Markdown)</label>
                    <textarea
                      rows={3}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-sans"
                      value={adminEditForm.longDescription}
                      onChange={e => setAdminEditForm({ ...adminEditForm, longDescription: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Highlighted Advantages (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Active Noise Cancellation, Smart Battery, Waterproof"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      value={adminEditForm.features}
                      onChange={e => setAdminEditForm({ ...adminEditForm, features: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Verified Pros (Comma separated)</label>
                      <textarea
                        rows={2}
                        placeholder="Comfortable, dynamic sound..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        value={adminEditForm.pros}
                        onChange={e => setAdminEditForm({ ...adminEditForm, pros: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Verified Cons (Comma separated)</label>
                      <textarea
                        rows={2}
                        placeholder="Expensive, heavy..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        value={adminEditForm.cons}
                        onChange={e => setAdminEditForm({ ...adminEditForm, cons: e.target.value })}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingAdminEdit}
                    className="w-full py-2.5 rounded-lg bg-violet-700 hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {isSavingAdminEdit ? 'Saving alterations...' : '✓ Put Save to Live Storefront'}
                  </button>

                  {adminEditSuccess && (
                     <div className="bg-emerald-50 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-350 p-2.5 rounded-lg text-center text-[11px] font-bold border border-emerald-200/45">
                        ✓ Product details & affiliate referral redirect saved live on website!
                     </div>
                  )}
                </form>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500 font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                {(() => {
                  if (!product.category) return 'Selection Line';
                  if (typeof product.category === 'object' && product.category) {
                    if (product.category.name) return product.category.name;
                    const catId = product.category._id || '';
                    return categories.find(c => String(c._id) === String(catId))?.name || 'Selection Line';
                  }
                  return categories.find(c => String(c._id) === String(product.category))?.name || 'Selection Line';
                })()}
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">{product.sku || 'SKU-NONE'}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-xl sm:text-2xl font-black font-sans tracking-tight text-slate-900 leading-snug dark:text-white max-w-xl">
                {product.name}
              </h1>

              {/* Page changing toggle next to it (with less transparence / solid high-opacity look) */}
              {allProductsSequence.length > 0 && currentIdx !== -1 && (
                <div className="flex items-center gap-1.5 bg-slate-100/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 p-1.5 rounded-xl shadow-xs shrink-0 self-start sm:self-center transition-all select-none">
                  <button
                    disabled={!prevProduct}
                    onClick={() => {
                      if (prevProduct) {
                        onNavigate('product-detail', prevProduct.slug);
                      }
                    }}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-[11px] font-extrabold cursor-pointer ${
                      prevProduct 
                        ? 'hover:bg-indigo-600 hover:text-white bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-3xs' 
                        : 'text-slate-350 dark:text-slate-600 cursor-not-allowed opacity-40'
                    }`}
                    title={prevProduct ? `View Previous Model: ${prevProduct.name}` : "No previous product"}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Prev</span>
                  </button>

                  <span className="px-2 text-[11px] font-mono font-black text-indigo-750 dark:text-indigo-400">
                    {currentIdx + 1} / {allProductsSequence.length}
                  </span>

                  <button
                    disabled={!nextProduct}
                    onClick={() => {
                      if (nextProduct) {
                        onNavigate('product-detail', nextProduct.slug);
                      }
                    }}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-[11px] font-extrabold cursor-pointer ${
                      nextProduct 
                        ? 'hover:bg-indigo-600 hover:text-white bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-3xs' 
                        : 'text-slate-350 dark:text-slate-600 cursor-not-allowed opacity-40'
                    }`}
                    title={nextProduct ? `View Next Model: ${nextProduct.name}` : "No next product"}
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Rating scores bar */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating || 4.5) ? 'fill-amber-400 animate-pulse' : 'text-slate-200'}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">{product.rating || '4.5'}</span>
              <span className="text-xs text-slate-400 font-medium">
                {(!product.reviews || product.reviews.length === 0) ? (
                  "aggrigated score based on the original store"
                ) : (
                  `(${product.totalReviews || product.reviews.length} reviews)`
                )}
              </span>
              {user?.role === 'admin' && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold text-indigo-500 font-mono">Clicks Tracked: {product.clicks || 0}</span>
                </>
              )}
            </div>
          </div>

          {/* Pricing parameters card */}
          <div className="rounded-2xl bg-indigo-50/50 p-5 border border-indigo-100/30 space-y-4 dark:bg-slate-900/40 dark:border-slate-800">
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-black text-slate-900 font-mono dark:text-white">₹{product.price}</span>
              {product.originalPrice && (
                <span className="text-sm text-slate-400 line-through font-mono">₹{product.originalPrice}</span>
              )}
              {product.discount && (
                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 text-[9px] font-bold rounded-lg font-mono">
                  -{product.discount}% Off Code Active
                </span>
              )}
            </div>

            {/* External routing buying CTA button */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAffiliateClick}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3.5 text-xs font-bold text-white shadow-xl active:scale-97 transition-all cursor-pointer"
              >
                <ShoppingBag className="h-5 w-5 shrink-0" />
                Buy on Amazon
                <ExternalLink className="h-3.5 w-3.5" />
              </button>

              {isAuthenticated && (
                <button
                  onClick={() => toggleWishlist(product._id)}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border cursor-pointer active:scale-95 transition-all ${wishlist.includes(product._id) ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'}`}
                  title="Bookmark item"
                >
                  <Heart className={`h-5 w-5 ${wishlist.includes(product._id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed text-center sm:text-left">
              *You will be securely redirected to the Amazon store product page. As an Amazon Associate, we earn from qualifying purchases. Thank you for supporting our review platform!
            </p>
          </div>

          {/* Description summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Expert Product Review</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">{product.longDescription || product.description}</p>
          </div>

          {/* Bullet Key features details */}
          {product.features && product.features.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Highlighted Advantages</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {product.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                    <CheckCheck className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>

      {/* 3. PROS AND CONS ADAPTIVE MATRIX SPLIT PANEL */}
      <section className="mx-auto max-w-7xl md:px-4 mb-16 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Pros vs Cons Heat Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pros */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-5 dark:border-emerald-900/30">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase mb-3.5 dark:text-emerald-400">
              <Check className="h-5 w-5 text-emerald-500 shrink-0" />
              Reasons to Buy (Verified Pros)
            </div>
            {product.pros && product.pros.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {product.pros.map((p, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
                    <span className="text-emerald-400 text-xs shrink-0 mt-0.5">●</span>
                    <span className="leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">No specific positive claims compiled yet.</p>
            )}
          </div>

          {/* Cons */}
          <div className="rounded-2xl border border-rose-100 bg-rose-50/20 p-5 dark:border-rose-900/30">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase mb-3.5 dark:text-rose-400">
              <X className="h-5 w-5 text-rose-500 shrink-0" />
              Reasons to Avoid (Known Cons)
            </div>
            {product.cons && product.cons.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {product.cons.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-rose-800 dark:text-rose-300">
                    <span className="text-rose-400 text-xs shrink-0 mt-0.5">■</span>
                    <span className="leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">No critical vulnerabilities or cons logged.</p>
            )}
          </div>
        </div>
      </section>

      {/* 4. SPECIFICATIONS TABULAR MAP GRID */}
      {Object.keys(specMap).length > 0 && (
        <section className="mx-auto max-w-7xl md:px-4 mb-16 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Full Specifications Index</h3>
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 overflow-hidden dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850">
                <tr>
                  <th className="py-3 px-4 font-bold text-slate-500 uppercase">Parameter</th>
                  <th className="py-3 px-4 font-bold text-slate-500 uppercase">Specification Metrics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.entries(specMap).map(([key, value]) => (
                  <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{key}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono leading-relaxed">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. SELLER REVIEWS & ACTIVE COMMENDS INPUT */}
      <section className="mx-auto max-w-7xl md:px-4 mb-16 grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Star Statistics Panel */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Fidelity Reviews</h3>
          <div className="rounded-2xl border border-slate-100 p-5 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/20 text-center space-y-3">
            <p className="text-3xl font-black font-mono text-slate-900 dark:text-white">{product.rating || '4.5'}</p>
            <div className="flex justify-center text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-5 w-5 ${i < Math.round(product.rating || 4.5) ? 'fill-amber-400' : 'text-slate-200'}`} />
              ))}
            </div>
            {(!product.reviews || product.reviews.length === 0) ? (
              <p className="text-xs text-slate-400 font-medium">aggrigated score based on the original store</p>
            ) : (
              <p className="text-xs text-slate-400 font-medium">Aggregated score based on {product.reviews.length} user inputs.</p>
            )}
          </div>

          {/* Add Review Form */}
          <div className="rounded-2xl border border-slate-100 p-5 bg-white shadow-xs dark:border-slate-800 dark:bg-zinc-900/40">
            <h4 className="text-xs font-bold uppercase text-slate-800 mb-4 tracking-wider dark:text-white">Submit Verified Commend</h4>
            
            {isAuthenticated ? (
              <form onSubmit={handleReviewSubmit} className="space-y-3.5">
                {reviewSuccess && (
                  <div className="rounded-xl bg-teal-50 p-3 text-xs text-teal-800">
                    ✓ Feedback submitted on active viewport state successfully.
                  </div>
                )}
                {reviewError && (
                  <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
                    {reviewError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Rating Score (1-5 Stars)</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(starIdx => (
                      <button
                        type="button"
                        key={starIdx}
                        onClick={() => setReviewRating(starIdx)}
                        className="text-amber-400 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                      >
                        <Star className={`h-5 w-5 ${starIdx <= reviewRating ? 'fill-amber-400' : 'text-slate-200'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Review Core Summary</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Incredible spatial depth!"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Descriptive Comment</label>
                  <textarea
                    rows={3}
                    placeholder="Add specification clarifications or active workout usage opinions..."
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold py-2.5 text-xs tracking-wider transition-colors cursor-pointer active:scale-97"
                >
                  Post Feedback
                </button>
              </form>
            ) : (
              <div className="text-center p-4">
                <p className="text-xs text-slate-400 mb-3.5 leading-relaxed">Login with your account to leave a star rating and review.</p>
                <button
                  onClick={() => onNavigate('login')}
                  className="rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 py-1.5 px-4 text-[10px] font-bold cursor-pointer transition-all active:scale-95 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300"
                >
                  Go to Login Drawer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Map Feedbacks Columns */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Member Opinions</h3>
          
          {product.reviews && product.reviews.length > 0 ? (
            <div className="space-y-4">
              {product.reviews.map((rev, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-50 bg-slate-50/20 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-900/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center uppercase font-bold text-[10px] dark:bg-slate-800 dark:text-slate-300">
                        {rev.userId?.name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{rev.userId?.name || 'Verified Explorer'}</p>
                        <p className="text-[9px] text-slate-400 font-medium font-mono">{rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Active Member'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < rev.rating ? 'fill-amber-400' : 'text-slate-100'}`} />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{rev.title}</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed dark:text-slate-400 italic">"{rev.content}"</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 p-8 rounded-2xl text-center dark:border-slate-800">
              <MessageSquare className="h-6 w-6 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-400 mt-2.5 italic">No reviews compiled for this product details yet. Be the first to share active opinions!</p>
            </div>
          )}
        </div>

      </section>

      {/* Dynamic AdSense Slot Placement */}
      <section className="mx-auto max-w-7xl md:px-4">
        <AdSenseBanner slot="7898031267" />
      </section>

      {/* 6. RELATED MATCHER RECOMMENDATIONS RAIL */}
      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-7xl md:px-4 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 px-1">Similar Recommendations</h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {relatedProducts.map(rel => (
              <div
                key={rel._id}
                onClick={() => { onNavigate('product-detail', rel.slug); window.scrollTo(0, 0); }}
                className="group cursor-pointer rounded-xl border border-slate-100 bg-white hover:shadow-md overflow-hidden transition-all dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="h-28 sm:h-36 bg-slate-100 overflow-hidden shrink-0">
                  <img src={rel.images?.[0]} alt={rel.name} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
                </div>
                <div className="p-2.5 sm:p-3.5">
                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 truncate dark:text-white group-hover:text-indigo-600">{rel.name}</h4>
                  <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-1 text-[10px] sm:text-xs mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                    <span className="font-extrabold text-slate-900 font-mono dark:text-white">₹{rel.price}</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold font-mono">★ {rel.rating || '4.5'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. REDIRECTING SPINNER OVERLAY POPUP */}
      {showRedirectingModal && product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-2xl dark:bg-slate-950 dark:border-slate-800 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="relative inline-flex mb-2">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-100 border-t-indigo-600"></div>
              <BookmarkCheck className="h-6 w-6 text-indigo-600 absolute top-4 left-4 animate-bounce shrink-0" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider font-mono">Affiliate Tag Active</span>
              <h3 className="text-sm font-bold text-slate-900 mt-1 dark:text-white">Redirecting to Partner Store...</h3>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed dark:text-slate-400">
                Opening authorized outlet for <span className="font-bold text-slate-800 dark:text-slate-100">{product.name}</span>. The discount coupon <span className="font-bold text-indigo-600 font-mono">{product.affiliateCode || 'HUB_DEAL_2026'}</span> checks active on landing.
              </p>
            </div>

            <p className="text-[10px] text-slate-400 max-w-2xl mx-auto italic">
              Thank you for trusting our reviews. Clicking supports free honest specs audits.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
