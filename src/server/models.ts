import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { mediaAssetSchema, mediaQueueJobSchema } from '../services/MediaService';

// User Schema
export const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true },
  name: String,
  password: { type: String, required: false },
  googleId: String,
  profileImage: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  wishlist: [{ type: mongoose.Schema.Types.Mixed, ref: 'Product' }],
  recentlyViewed: [
    {
      productId: { type: mongoose.Schema.Types.Mixed, ref: 'Product' },
      viewedAt: { type: Date, default: Date.now }
    }
  ],
  district: { type: String, default: 'Unknown' },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  verificationExpiresAt: { type: Date, default: null },
  pendingEmail: { type: String, default: null },
  pendingEmailToken: { type: String, default: null },
  pendingEmailTokenExpires: { type: Date, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpiresAt: { type: Date, default: null },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function () {
  const user = this as any;
  if (!user.isModified('password')) return;
  if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);

// Category Schema
export const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  image: String,
  icon: String,
  subcategories: [String],
  createdAt: { type: Date, default: Date.now }
});

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

// Product Schema
export const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  asin: { type: String, sparse: true, unique: true },
  description: String,
  longDescription: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subcategory: String,
  brand: String,
  price: { type: Number, required: true },
  originalPrice: Number,
  discount: Number,
  images: [String],
  videoUrl: String,
  specifications: { type: Map, of: String },
  features: [String],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  affiliateLink: { type: String, required: true },
  affiliateCode: String,
  inStock: { type: Boolean, default: true },
  sku: String,
  tags: [String],
  trending: { type: Boolean, default: false },
  trendingStartedAt: { type: Date },
  featured: { type: Boolean, default: false },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  pros: [String],
  cons: [String],
  comparisonProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  reviews: [
    {
      userId: { type: mongoose.Schema.Types.Mixed, ref: 'User' },
      rating: Number,
      title: String,
      content: String,
      helpful: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  seoTitle: String,
  seoDescription: String,
  seoKeywords: [String],
  focusKeyword: String,
  secondaryKeywords: [String],
  canonicalUrl: String,
  robotsMeta: { type: String, default: 'index, follow' },
  openGraph: {
    title: String,
    description: String,
    image: String,
    type: { type: String, default: 'product' }
  },
  twitterCard: {
    card: { type: String, default: 'summary_large_image' },
    title: String,
    description: String,
    image: String
  },
  seoScore: { type: Number, default: 0 },
  seoSuggestions: [String],
  publishingStatus: { type: String, enum: ['draft', 'in_review', 'approved', 'scheduled', 'published', 'archived'], default: 'draft' },
  scheduledPublishDate: Date,
  publishingHistory: [{
    status: String,
    changedBy: String,
    changedAt: { type: Date, default: Date.now },
    notes: String
  }],
  breadcrumb: [String],
  faqs: [{
    question: String,
    answer: String,
    category: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastPriceCheck: { type: Date, default: null }
});

productSchema.index({ name: 'text', description: 'text', tags: 'text', brand: 'text', features: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ lastPriceCheck: 1 });
productSchema.index({ price: 1 });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// Blog Schema
export const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: String,
  excerpt: String,
  featured_image: String,
  author: { type: String, default: 'Admin' },
  category: String,
  tags: [String],
  views: { type: Number, default: 0 },
  published: { type: Boolean, default: true },
  seoTitle: String,
  seoDescription: String,
  seoKeywords: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

blogSchema.index({ title: 'text', content: 'text' });
export const Blog = mongoose.models.Blog || mongoose.model('Blog', blogSchema);

// Analytics Schema
export const analyticsSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.Mixed, ref: 'Product', required: false },
  affiliateCode: String,
  eventType: { type: String, enum: ['click', 'conversion', 'view', 'page_visit'], required: true },
  userId: { type: mongoose.Schema.Types.Mixed, ref: 'User' },
  userAgent: String,
  ipAddress: String,
  referer: String,
  district: { type: String, default: 'Unknown' },
  timestamp: { type: Date, default: Date.now, index: true, expires: '90d' },
  browser: String,
  device: String,
  pageUrl: String,
  timeSpent: { type: Number, default: 0 }
});

export const Analytics = mongoose.models.Analytics || mongoose.model('Analytics', analyticsSchema);

// Visitor Schema
export const visitorSchema = new mongoose.Schema({
  visitorId: { type: String, required: true },
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now, index: true, expires: '90d' }
});

export const Visitor = mongoose.models.Visitor || mongoose.model('Visitor', visitorSchema);

// Message Schema
export const messageSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  subject: String,
  message: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// Filter Log Schema
export const filterLogSchema = new mongoose.Schema({
  searchQuery: String,
  categoryId: String,
  categorySlug: String,
  timestamp: { type: Date, default: Date.now, index: true, expires: '90d' }
});

export const FilterLog = mongoose.models.FilterLog || mongoose.model('FilterLog', filterLogSchema);

// Social Click Schema
export const socialClickSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true, expires: '90d' },
  ipAddress: String,
  userAgent: String
});

export const SocialClick = mongoose.models.SocialClick || mongoose.model('SocialClick', socialClickSchema);

// Subscriber Schema
export const subscriberSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  tokenExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema);

// PickLeftInterest Schema
export const pickLeftInterestSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  categoryName: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  tokenExpires: { type: Date },
  createdAt: { type: Date, default: Date.now, expires: 86400 * 30 }
});

export const PickLeftInterest = mongoose.models.PickLeftInterest || mongoose.model('PickLeftInterest', pickLeftInterestSchema);

// Order Schema
export const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.Mixed, ref: 'Product', required: true },
      quantity: { type: Number, default: 1 },
      price: { type: Number, required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['Processing', 'Shipped', 'In Transit', 'Delivered', 'Cancelled'], default: 'Processing' },
  trackingNumber: String,
  carrier: String,
  estimatedDelivery: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// Sunday Automation Logs Schema & Model
export const SundayAutomationLogSchema = new mongoose.Schema({
  sundayDate: { type: String, required: true, unique: true },
  runAt: { type: Date, default: Date.now },
  productsAdded: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  localProductsAddedIds: [String],
  emailSentTo: { type: String, required: true },
  emailSubject: { type: String },
  emailBody: { type: String },
  sentStatus: { type: String, default: 'Success' },
  errorDetails: String
});

export const SundayAutomationLog = mongoose.models.SundayAutomationLog || mongoose.model('SundayAutomationLog', SundayAutomationLogSchema);

// Security Logs Schema
export const securityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  adminId: { type: String, required: true },
  adminEmail: { type: String, required: true },
  targetId: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now, index: true, expires: '90d' }
});

export const SecurityLog = mongoose.models.SecurityLog || mongoose.model('SecurityLog', securityLogSchema);

export const blacklistedTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 2592000 }
});
export const BlacklistedToken = mongoose.models.BlacklistedToken || mongoose.model('BlacklistedToken', blacklistedTokenSchema);

export const authCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 }
});
export const AuthCode = mongoose.models.AuthCode || mongoose.model('AuthCode', authCodeSchema);

export const importHistorySchema = new mongoose.Schema({
  productName: { type: String, required: true },
  asin: { type: String, required: true },
  productId: { type: String },
  importTime: { type: Date, default: Date.now },
  adminEmail: { type: String, required: true },
  adminId: { type: String, required: true },
  result: { type: String, enum: ['success', 'failed', 'skipped'], required: true },
  correlationId: { type: String, required: true },
  processingTimeMs: { type: Number, required: true },
  duplicateStatus: { type: String, enum: ['new', 'skip', 'update', 'merge', 'replace', 'duplicate_blocked'], required: true },
  errorMessage: { type: String },
  details: { type: mongoose.Schema.Types.Mixed }
});

importHistorySchema.index({ adminId: 1, correlationId: 1 });
importHistorySchema.index({ asin: 1 });
export const ImportHistory = mongoose.models.ImportHistory || mongoose.model('ImportHistory', importHistorySchema);

export const bulkImportJobSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: true },
  status: { type: String, enum: ['waiting', 'running', 'completed', 'failed', 'cancelled', 'paused'], default: 'waiting' },
  totalItems: { type: Number, default: 0 },
  processedItems: { type: Number, default: 0 },
  successfulItems: { type: Number, default: 0 },
  failedItems: { type: Number, default: 0 },
  skippedItems: { type: Number, default: 0 },
  items: [{
    asin: { type: String },
    url: { type: String },
    status: { type: String, enum: ['pending', 'running', 'success', 'failed', 'skipped', 'cancelled'], default: 'pending' },
    error: { type: String },
    retryCount: { type: Number, default: 0 }
  }],
  concurrency: { type: Number, default: 3 },
  maxRetries: { type: Number, default: 3 },
  conflictStrategy: { type: String, default: 'skip' },
  startedAt: { type: Date },
  completedAt: { type: Date }
}, { timestamps: true });

bulkImportJobSchema.index({ adminId: 1, status: 1 });
export const BulkImportJob = mongoose.models.BulkImportJob || mongoose.model('BulkImportJob', bulkImportJobSchema);

export const MediaAsset = mongoose.models.MediaAsset || mongoose.model('MediaAsset', mediaAssetSchema);
export const MediaQueueJob = mongoose.models.MediaQueueJob || mongoose.model('MediaQueueJob', mediaQueueJobSchema);

export const redirectRuleSchema = new mongoose.Schema({
  sourceUrl: { type: String, required: true, unique: true, index: true },
  targetUrl: { type: String, required: true },
  type: { type: Number, enum: [301, 302, 410], default: 301 },
  hits: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const seoAuditHistorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
  score: { type: Number, required: true },
  auditDate: { type: Date, default: Date.now, index: true, expires: '90d' },
  suggestions: [String],
  details: mongoose.Schema.Types.Mixed
});

export const sitemapRecordSchema = new mongoose.Schema({
  loc: { type: String, required: true, unique: true },
  lastmod: { type: Date, default: Date.now },
  changefreq: { type: String, default: 'daily' },
  priority: { type: Number, default: 0.8 },
  type: { type: String, enum: ['product', 'category', 'image', 'static'], default: 'product' }
});

export const RedirectRule = mongoose.models.RedirectRule || mongoose.model('RedirectRule', redirectRuleSchema);
export const SeoAuditHistory = mongoose.models.SeoAuditHistory || mongoose.model('SeoAuditHistory', seoAuditHistorySchema);
export const SitemapRecord = mongoose.models.SitemapRecord || mongoose.model('SitemapRecord', sitemapRecordSchema);

export const telegramStateSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  step: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now, expires: 86400 }
});
export const TelegramStateModel = mongoose.models.TelegramState || mongoose.model('TelegramState', telegramStateSchema);

export const activePairingCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  token: { type: String, required: true },
  email: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 }
});
export const ActivePairingCodeModel = mongoose.models.ActivePairingCode || mongoose.model('ActivePairingCode', activePairingCodeSchema);

export const requestLockSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  lockedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, expires: 0 }
});
export const RequestLock = mongoose.models.RequestLock || mongoose.model('RequestLock', requestLockSchema);

export const siteSettingsSchema = new mongoose.Schema({
  adsenseClientId: { type: String, default: '' },
  adsenseEnabled: { type: Boolean, default: false },
  adsenseTestMode: { type: Boolean, default: false },
  adsenseAutoAds: { type: Boolean, default: false },
  adsenseSlots: {
    headerBannerSlot: { type: String, default: '' },
    productDetailSlot: { type: String, default: '' },
    blogSlot: { type: String, default: '' },
    sidebarSlot: { type: String, default: '' },
    homeSlot: { type: String, default: '' }
  },
  customAdsTxt: { type: String, default: '' },
  siteName: { type: String, default: 'gadgetsprohub' },
  supportEmail: { type: String, default: 'support@gadgetsprohub.com' },
  updatedAt: { type: Date, default: Date.now }
});
export const SiteSettingsModel = mongoose.models.SiteSettings || mongoose.model('SiteSettings', siteSettingsSchema);
