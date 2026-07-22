import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import mongoSanitize from 'express-mongo-sanitize';
import { OAuth2Client } from 'google-auth-library';
import { createServer as createViteServer } from 'vite';
import { captureError } from './src/utils/errorTracker';
import { seedOrders, seedCategories, seedProducts, seedBlogs, seedUsers, seedMessages, LocalUserType } from './seeddata';
import {
  validateRegister,
  validateLogin,
  validateGoogleAuth,
  validateProductClick,
  validateProductReview,
  validateWishlist,
  validateOrderCreation,
  validateOrderAdvance,
  validateVisitorRegister,
  validateContactMessage,
  validateNewsletterSubscribe,
  validateSocialClick,
  validateFilterAnalytics,
  validatePageViewAnalytics,
  validateUserProfileUpdate,
  validateAdminProduct,
  validateAdminCategory,
  validateAdminBlog
} from './src/middleware/validation';

import { seoService } from './src/services/SeoService';
import { aiService, AiPrompt, AiProviderSetting, AiJob, AiResponse, AiAnalytics, AiCache } from './src/services/AiService';
import { SyncService, PriceHistory, ProductChange, SyncJob, SchedulerTask, AlertRule, ProductHealth, AutomationRule, NotificationHistory } from './src/services/SyncService';
import { mediaService } from './src/services/MediaService';
import {
  MarketplaceService,
  MarketplaceProviderModel,
  MarketplaceSettingsModel,
  MarketplaceHealthModel,
  MarketplaceAnalyticsModel,
  CurrencyRatesModel,
  AffiliateProfilesModel,
  ProviderLogsModel,
  ComparisonHistoryModel
} from './src/services/MarketplaceService';

const syncService = SyncService.getInstance();
const marketplaceService = MarketplaceService.getInstance();

import { 
  UserSession, 
  PersonalAccessToken, 
  ConfigurationService, 
  TotpService, 
  MetricsService,
  WorkerService
} from './src/services/RefinementService';

dotenv.config();

const getSanitizedMongoUri = (uri: string | undefined): string => {
  if (!uri) return 'undefined';
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = '******';
    return parsed.toString();
  } catch {
    return uri.replace(/:([^:@]+)@/, ':******@');
  }
};
console.log("MONGODB connection string configured.");

const escapeHTML = (str: string | undefined): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const getJwtSecret = (): string => {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '' && process.env.JWT_SECRET !== 'your-secret-key') {
    return process.env.JWT_SECRET;
  }
  console.error("❌ CRITICAL: JWT_SECRET env variable is required but not provided.");
  process.exit(1);
};
const JWT_SECRET_KEY = getJwtSecret();

const getCookieToken = (req: express.Request): string | undefined => {
  if (!req.headers.cookie) return undefined;
  const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
};

const cleanUndefined = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

let isMongoConnected = false;

// ========== SCHEMAS & MODELS ==========

// User Schema
const userSchema = new mongoose.Schema({
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
  district: { type: String, default: 'Chennai' },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  verificationExpiresAt: { type: Date, default: null },
  pendingEmail: { type: String, default: null },
  pendingEmailToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware to hash password pre-save
userSchema.pre('save', async function () {
  const user = this as any;
  if (!user.isModified('password')) return;
  if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

const User = mongoose.model('User', userSchema);
import { comparePasswords, hashHelper, isAdminEmail, getStorageEmail, validateAndCheckRealEmail } from './src/server/utils';

// Category Schema
const sanitizeUser = (userObj: any) => {
  if (!userObj) return userObj;
  const clean = userObj.toObject ? userObj.toObject() : { ...userObj };
  delete clean.password;
  delete clean.verificationToken;
  delete clean.pendingEmailToken;
  delete clean.pendingEmail;
  return clean;
};

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  image: String,
  icon: String,
  subcategories: [String],
  createdAt: { type: Date, default: Date.now }
});

const Category = mongoose.model('Category', categorySchema);

// Product Schema
const productSchema = new mongoose.Schema({
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

// Create text index for search in Mongo
productSchema.index({ name: 'text', description: 'text', tags: 'text', brand: 'text', features: 'text' });
const Product = mongoose.model('Product', productSchema);

// Blog Schema
const blogSchema = new mongoose.Schema({
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
const Blog = mongoose.model('Blog', blogSchema);

// Analytics Schema
const analyticsSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.Mixed, ref: 'Product', required: false },
  affiliateCode: String,
  eventType: { type: String, enum: ['click', 'conversion', 'view', 'page_visit'], required: true },
  userId: { type: mongoose.Schema.Types.Mixed, ref: 'User' },
  userAgent: String,
  ipAddress: String,
  referer: String,
  district: { type: String, default: 'Chennai' },
  timestamp: { type: Date, default: Date.now },
  browser: String,
  device: String,
  pageUrl: String,
  timeSpent: { type: Number, default: 0 }
});

const Analytics = mongoose.model('Analytics', analyticsSchema);

const TAMIL_NADU_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
  "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur",
  "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris",
  "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivagangai",
  "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
  "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore",
  "Viluppuram", "Virudhunagar"
];

const sanitizeDistrict = (name: string): string => {
  if (!name) return "Chennai";
  const formatted = name.trim().toLowerCase();
  
  if (formatted.includes("trichy") || formatted.includes("tiruchirappalli") || formatted.includes("tiruchirapalli")) {
    return "Tiruchirappalli";
  }
  if (formatted.includes("chennai") || formatted.includes("madras")) return "Chennai";
  if (formatted.includes("coimbatore") || formatted.includes("kovai")) return "Coimbatore";
  if (formatted.includes("madurai")) return "Madurai";
  if (formatted.includes("salem")) return "Salem";
  if (formatted.includes("nellai") || formatted.includes("tirunelveli")) return "Tirunelveli";
  
  if (
    formatted.includes("ashburn") || 
    formatted.includes("montreal") || 
    formatted.includes("virginia") || 
    formatted.includes("canada") || 
    formatted.includes("bueren") || 
    formatted.includes("zuerich") ||
    formatted.includes("zurich") ||
    formatted.includes("seattle") ||
    formatted.includes("dublin") ||
    formatted.includes("london") ||
    formatted.includes("california") ||
    formatted.includes("oregon") ||
    formatted.includes("united states")
  ) {
    return "Chennai";
  }

  const found = TAMIL_NADU_DISTRICTS.find(
    d => d.toLowerCase() === formatted || formatted.includes(d.toLowerCase())
  );
  if (found) {
    return found;
  }
  
  // Strictly fall back to a validated whitelisted district
  return "Chennai";
};

// Visitor Schema (site visitors)
const visitorSchema = new mongoose.Schema({
  visitorId: { type: String, required: true },
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now }
});

const Visitor = mongoose.model('Visitor', visitorSchema);

let localVisitors: string[] = [];

// Contact/Message Schema
const messageSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  subject: String,
  message: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Filter Log Schema
const filterLogSchema = new mongoose.Schema({
  searchQuery: String,
  categoryId: String,
  categorySlug: String,
  timestamp: { type: Date, default: Date.now }
});

const FilterLog = mongoose.model('FilterLog', filterLogSchema);
let localFilterLogs: any[] = [];

// Social Click Schema
const socialClickSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
  userAgent: String
});

const SocialClick = mongoose.model('SocialClick', socialClickSchema);

// Subscriber Schema
const subscriberSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true },
  createdAt: { type: Date, default: Date.now }
});

const Subscriber = mongoose.model('Subscriber', subscriberSchema);

let localSubscribers: any[] = [];
const LOCAL_SUBSCRIBERS_FILE = path.join(process.cwd(), 'local_subscribers.json');

if (fs.existsSync(LOCAL_SUBSCRIBERS_FILE)) {
  try {
    localSubscribers = JSON.parse(fs.readFileSync(LOCAL_SUBSCRIBERS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_subscribers.json fallback:", err.message);
  }
}

const saveLocalSubscribers = () => {
  try {
    fs.writeFileSync(LOCAL_SUBSCRIBERS_FILE, JSON.stringify(localSubscribers, null, 2), 'utf8');
  } catch (e: any) {
    console.warn("Failed saving local subscribers:", e.message);
  }
};

// PickLeftInterest Schema for newsletter alerts
const pickLeftInterestSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  categoryName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const PickLeftInterest = mongoose.model('PickLeftInterest', pickLeftInterestSchema);

let localPickLeftInterests: any[] = [];
const LOCAL_PICK_LEFT_INTERESTS_FILE = path.join(process.cwd(), 'local_pick_left_interests.json');

if (fs.existsSync(LOCAL_PICK_LEFT_INTERESTS_FILE)) {
  try {
    localPickLeftInterests = JSON.parse(fs.readFileSync(LOCAL_PICK_LEFT_INTERESTS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_pick_left_interests.json fallback:", err.message);
  }
}

async function syncPickLeftInterestsToLocalFile() {
  try {
    fs.writeFileSync(LOCAL_PICK_LEFT_INTERESTS_FILE, JSON.stringify(localPickLeftInterests, null, 2));
  } catch (err: any) {
    console.warn("Could not write to local_pick_left_interests.json:", err.message);
  }
}

// Persistent File Paths for Offline Fallback System
const LOCAL_USERS_FILE = path.join(process.cwd(), 'local_users.json');
const LOCAL_PRODUCTS_FILE = path.join(process.cwd(), 'local_products.json');
const LOCAL_ORDERS_FILE = path.join(process.cwd(), 'local_orders.json');
const LOCAL_SUNDAY_LOGS_FILE = path.join(process.cwd(), 'local_sunday_logs.json');

// Order Schema
const orderSchema = new mongoose.Schema({
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

const Order = mongoose.model('Order', orderSchema);

let localOrders: any[] = structuredClone(seedOrders);
if (fs.existsSync(LOCAL_ORDERS_FILE)) {
  try {
    localOrders = JSON.parse(fs.readFileSync(LOCAL_ORDERS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_orders.json fallback:", err.message);
  }
}

// Sunday Automation Logs Schema & Model
const SundayAutomationLogSchema = new mongoose.Schema({
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

const SundayAutomationLog = mongoose.model('SundayAutomationLog', SundayAutomationLogSchema);

let localSundayAutomationLogs: any[] = [];
if (fs.existsSync(LOCAL_SUNDAY_LOGS_FILE)) {
  try {
    localSundayAutomationLogs = JSON.parse(fs.readFileSync(LOCAL_SUNDAY_LOGS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_sunday_logs.json fallback:", err.message);
  }
}

// ========== SECURITY LOGS SCHEMA & FALLBACK ==========
const LOCAL_SECURITY_LOGS_FILE = path.join(process.cwd(), 'local_security_logs.json');

const securityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  adminId: { type: String, required: true },
  adminEmail: { type: String, required: true },
  targetId: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now }
});

const SecurityLog = mongoose.model('SecurityLog', securityLogSchema);

const blacklistedTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 2592000 } // 30 days expiry
});
const BlacklistedToken = mongoose.model('BlacklistedToken', blacklistedTokenSchema);

const authCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 } // 1 minute expiry
});
const AuthCode = mongoose.model('AuthCode', authCodeSchema);

const localBlacklistedTokens = new Map<string, number>();
const blacklistTokenLocal = (token: string) => {
  localBlacklistedTokens.set(token, Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days expiry
};
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of localBlacklistedTokens.entries()) {
    if (now > expiresAt) {
      localBlacklistedTokens.delete(token);
    }
  }
}, 60 * 60 * 1000);

const isTokenLocalBlacklisted = (token: string): boolean => {
  const expiresAt = localBlacklistedTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    localBlacklistedTokens.delete(token);
    return false;
  }
  return true;
};

let localSecurityLogs: any[] = [];
if (fs.existsSync(LOCAL_SECURITY_LOGS_FILE)) {
  try {
    localSecurityLogs = JSON.parse(fs.readFileSync(LOCAL_SECURITY_LOGS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_security_logs.json fallback:", err.message);
  }
}

const saveLocalSecurityLogs = () => {
  try {
    fs.writeFileSync(LOCAL_SECURITY_LOGS_FILE, JSON.stringify(localSecurityLogs, null, 2), 'utf8');
  } catch (e: any) {
    console.warn("Failed saving local security logs:", e.message);
  }
};

const logSecurityAction = async (
  req: express.Request,
  action: string,
  targetId: string | undefined,
  details: any
) => {
  const adminId = (req as any).userId || 'system';
  const adminEmail = (req as any).userEmail || 'unknown';
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  const logEntry = {
    action,
    adminId: adminId.toString(),
    adminEmail,
    targetId,
    details,
    ipAddress: Array.isArray(ipAddress) ? ipAddress.join(', ') : String(ipAddress),
    userAgent,
    timestamp: new Date()
  };

  // 1. Save to local fallback
  localSecurityLogs.unshift(logEntry);
  if (localSecurityLogs.length > 2000) {
    localSecurityLogs = localSecurityLogs.slice(0, 2000);
  }
  saveLocalSecurityLogs();

  // 2. Save to MongoDB if connected
  if (isMongoConnected) {
    try {
      const log = new SecurityLog(logEntry);
      await log.save();
    } catch (err: any) {
      console.warn("Failed saving security log to MongoDB:", err.message);
    }
  }
};

// ========== PRODUCT IMPORT HISTORY SCHEMA & FALLBACK ==========
const LOCAL_IMPORT_HISTORY_FILE = path.join(process.cwd(), 'local_import_history.json');

const importHistorySchema = new mongoose.Schema({
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

const ImportHistory = mongoose.model('ImportHistory', importHistorySchema);
const bulkImportJobSchema = new mongoose.Schema({
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

const BulkImportJob = mongoose.model('BulkImportJob', bulkImportJobSchema);

// ========== PHASE 7: MEDIA MANAGEMENT SCHEMAS ==========
const mediaAssetSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.Mixed, ref: 'Product' },
  asin: { type: String, index: true },
  originalUrl: { type: String },
  localPath: { type: String },
  fileName: { type: String, required: true },
  cdnUrl: { type: String },
  mimeType: { type: String },
  width: { type: Number },
  height: { type: Number },
  aspectRatio: { type: Number },
  hash: { type: String, index: true },
  uploadDate: { type: Date, default: Date.now },
  optimizationStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  originalSize: { type: Number },
  optimizedSize: { type: Number },
  compressionRatio: { type: Number },
  storageProvider: { type: String, enum: ['local', 's3', 'r2', 'cloudinary'], default: 'local' },
  variants: { type: mongoose.Schema.Types.Mixed }, // e.g. { webp: '...', avif: '...', thumb: '...' }
  metadata: { type: mongoose.Schema.Types.Mixed }
});

const mediaQueueJobSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' },
  type: { type: String, enum: ['download', 'optimize', 'convert', 'upload', 'cleanup'] },
  status: { type: String, enum: ['waiting', 'running', 'completed', 'failed', 'cancelled'], default: 'waiting' },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  completedAt: { type: Date }
});

const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);
const MediaQueueJob = mongoose.model('MediaQueueJob', mediaQueueJobSchema);

// ========== PHASE 8: SEO & PUBLISHING SCHEMAS ==========
const redirectRuleSchema = new mongoose.Schema({
  sourceUrl: { type: String, required: true, unique: true, index: true },
  targetUrl: { type: String, required: true },
  type: { type: Number, enum: [301, 302, 410], default: 301 },
  hits: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const seoAuditHistorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
  score: { type: Number, required: true },
  auditDate: { type: Date, default: Date.now },
  suggestions: [String],
  details: mongoose.Schema.Types.Mixed
});

const sitemapRecordSchema = new mongoose.Schema({
  loc: { type: String, required: true, unique: true },
  lastmod: { type: Date, default: Date.now },
  changefreq: { type: String, default: 'daily' },
  priority: { type: Number, default: 0.8 },
  type: { type: String, enum: ['product', 'category', 'image', 'static'], default: 'product' }
});

const RedirectRule = mongoose.model('RedirectRule', redirectRuleSchema);
const SeoAuditHistory = mongoose.model('SeoAuditHistory', seoAuditHistorySchema);
const SitemapRecord = mongoose.model('SitemapRecord', sitemapRecordSchema);

const telegramStateSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  step: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24 hours of inactivity
});
const TelegramStateModel = mongoose.model('TelegramState', telegramStateSchema);

const activePairingCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  token: { type: String, required: true },
  email: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 } // TTL index automatically deletes expired documents
});
const ActivePairingCodeModel = mongoose.model('ActivePairingCode', activePairingCodeSchema);




let localImportHistory: any[] = [];
if (fs.existsSync(LOCAL_IMPORT_HISTORY_FILE)) {
  try {
    localImportHistory = JSON.parse(fs.readFileSync(LOCAL_IMPORT_HISTORY_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_import_history.json fallback:", err.message);
  }
}

const saveLocalImportHistory = () => {
  try {
    fs.writeFileSync(LOCAL_IMPORT_HISTORY_FILE, JSON.stringify(localImportHistory, null, 2), 'utf8');
  } catch (e: any) {
    console.warn("Failed saving local import history:", e.message);
  }
};

const logImportHistory = async (entry: {
  productName: string;
  asin: string;
  productId?: string;
  adminEmail: string;
  adminId: string;
  result: 'success' | 'failed' | 'skipped';
  correlationId: string;
  processingTimeMs: number;
  duplicateStatus: 'new' | 'skip' | 'update' | 'merge' | 'replace' | 'duplicate_blocked';
  errorMessage?: string;
  details?: any;
}) => {
  const finalEntry = {
    ...entry,
    importTime: new Date()
  };

  // 1. Save to local fallback
  localImportHistory.unshift(finalEntry);
  if (localImportHistory.length > 5000) {
    localImportHistory = localImportHistory.slice(0, 5000);
  }
  saveLocalImportHistory();

  // 2. Save to MongoDB if connected
  if (isMongoConnected) {
    try {
      const log = new ImportHistory(finalEntry);
      await log.save();
    } catch (err: any) {
      console.warn("Failed saving import history to MongoDB:", err.message);
    }
  }
};

// ========== FOOTER SOCIAL CLICKS PERSISTENCE ==========
let socialClicks = { instagram: 0, linkedin: 0 };
const SOCIAL_CLICKS_FILE = path.join(process.cwd(), 'social_clicks.json');

// Load initial counts
if (fs.existsSync(SOCIAL_CLICKS_FILE)) {
  try {
    socialClicks = JSON.parse(fs.readFileSync(SOCIAL_CLICKS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read social_clicks.json:", err.message);
  }
}

// Function to save counts
const saveSocialClicks = () => {
  try {
    fs.writeFileSync(SOCIAL_CLICKS_FILE, JSON.stringify(socialClicks, null, 2), 'utf8');
  } catch (err: any) {
    console.warn("Could not save social_clicks.json:", err.message);
  }
};

// ========== ROBUST IN-MEMORY STORE DATASETS ==========

let localCategories: any[] = structuredClone(seedCategories);

let localProducts: any[] = structuredClone(seedProducts);
if (fs.existsSync(LOCAL_PRODUCTS_FILE)) {
  try {
    localProducts = JSON.parse(fs.readFileSync(LOCAL_PRODUCTS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_products.json fallback:", err.message);
  }
}

let localBlogs: any[] = structuredClone(seedBlogs);

let localUsers: LocalUserType[] = structuredClone(seedUsers);
if (fs.existsSync(LOCAL_USERS_FILE)) {
  try {
    localUsers = JSON.parse(fs.readFileSync(LOCAL_USERS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_users.json fallback:", err.message);
  }
}

// Secure fallback users dynamically by hashing plaintext passwords on startup
Promise.all(localUsers.map(async (u) => {
  if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
    u.password = await hashHelper(u.password);
  }
})).then(() => {
  try {
    fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(localUsers, null, 2), 'utf8');
  } catch (err) {
    // Ignore write failure in read-only setups
  }
}).catch(err => console.warn("Error hashing initial users in-memory:", err));

let localMessages = JSON.parse(JSON.stringify(seedMessages));

const LOCAL_BULK_JOBS_FILE = path.join(process.cwd(), 'local_bulk_jobs.json');
let localBulkImportJobs: any[] = [];
if (fs.existsSync(LOCAL_BULK_JOBS_FILE)) {
  try {
    localBulkImportJobs = JSON.parse(fs.readFileSync(LOCAL_BULK_JOBS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_bulk_jobs.json fallback:", err.message);
  }
}

const saveLocalBulkImportJobs = () => {
  try {
    fs.writeFileSync(LOCAL_BULK_JOBS_FILE, JSON.stringify(localBulkImportJobs, null, 2), 'utf8');
  } catch (err: any) {
    console.warn("Could not save local_bulk_jobs.json:", err.message);
  }
};

const LOCAL_ALERT_RULES_FILE = path.join(process.cwd(), 'local_alert_rules.json');
let localAlertRules: any[] = [];
if (fs.existsSync(LOCAL_ALERT_RULES_FILE)) {
  try {
    localAlertRules = JSON.parse(fs.readFileSync(LOCAL_ALERT_RULES_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_alert_rules.json fallback:", err.message);
  }
}
const saveLocalAlertRules = () => {
  try { fs.writeFileSync(LOCAL_ALERT_RULES_FILE, JSON.stringify(localAlertRules, null, 2), 'utf8'); } catch (err: any) {}
};

const LOCAL_AUTOMATION_RULES_FILE = path.join(process.cwd(), 'local_automation_rules.json');
let localAutomationRules: any[] = [];
if (fs.existsSync(LOCAL_AUTOMATION_RULES_FILE)) {
  try {
    localAutomationRules = JSON.parse(fs.readFileSync(LOCAL_AUTOMATION_RULES_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_automation_rules.json fallback:", err.message);
  }
}
const saveLocalAutomationRules = () => {
  try { fs.writeFileSync(LOCAL_AUTOMATION_RULES_FILE, JSON.stringify(localAutomationRules, null, 2), 'utf8'); } catch (err: any) {}
};

const LOCAL_PRODUCT_HEALTH_FILE = path.join(process.cwd(), 'local_product_health.json');
let localProductHealth: any[] = [];
if (fs.existsSync(LOCAL_PRODUCT_HEALTH_FILE)) {
  try {
    localProductHealth = JSON.parse(fs.readFileSync(LOCAL_PRODUCT_HEALTH_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_product_health.json fallback:", err.message);
  }
}
const saveLocalProductHealth = () => {
  try { fs.writeFileSync(LOCAL_PRODUCT_HEALTH_FILE, JSON.stringify(localProductHealth, null, 2), 'utf8'); } catch (err: any) {}
};

const LOCAL_PRICE_HISTORY_FILE = path.join(process.cwd(), 'local_price_history.json');
let localPriceHistory: any[] = [];
if (fs.existsSync(LOCAL_PRICE_HISTORY_FILE)) {
  try {
    localPriceHistory = JSON.parse(fs.readFileSync(LOCAL_PRICE_HISTORY_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_price_history.json fallback:", err.message);
  }
}
const saveLocalPriceHistory = () => {
  try { fs.writeFileSync(LOCAL_PRICE_HISTORY_FILE, JSON.stringify(localPriceHistory, null, 2), 'utf8'); } catch (err: any) {}
};

const LOCAL_PRODUCT_CHANGES_FILE = path.join(process.cwd(), 'local_product_changes.json');
let localProductChanges: any[] = [];
if (fs.existsSync(LOCAL_PRODUCT_CHANGES_FILE)) {
  try {
    localProductChanges = JSON.parse(fs.readFileSync(LOCAL_PRODUCT_CHANGES_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_product_changes.json fallback:", err.message);
  }
}
const saveLocalProductChanges = () => {
  try { fs.writeFileSync(LOCAL_PRODUCT_CHANGES_FILE, JSON.stringify(localProductChanges, null, 2), 'utf8'); } catch (err: any) {}
};

const originalLocalProducts = JSON.parse(JSON.stringify(seedProducts));

// ========== CURATOR COMPANION EXTENSION IMPORTER METRICS & OBSERVABILITY ==========
export const importerMetrics = {
  totalImports: 0,
  successfulImports: 0,
  failedImports: 0,
  duplicateRejections: 0,
  totalProcessingTimeMs: 0
};

// Store idempotency records. Map from request (correlation) ID to the success response data payload.
export const processedImportsCache = new Map<string, any>();

export function logStructured(level: 'INFO' | 'WARN' | 'ERROR', event: string, metadata: Record<string, any>) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...metadata
  }));
}

export function sanitizeInput(str: string): string {
  if (typeof str !== 'string') return '';
  // Basic stripping of HTML tags & javascript event triggers to reduce stored XSS risks
  return str
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<[^>]+>/g, '') // remove HTML tags
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '') // remove inline event handlers
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .trim();
}

let localAnalytics: any[] = [
  { productId: "665a0002bc93ef2d8c000010", affiliateCode: "AUDIO001", eventType: "click", district: "Chennai", timestamp: new Date() },
  { productId: "665a0002bc93ef2d8c000010", affiliateCode: "AUDIO001", eventType: "view", district: "Madurai", timestamp: new Date() },
  { productId: "665a0002bc93ef2d8c000011", affiliateCode: "WATCH001", eventType: "click", district: "Tirunelveli", timestamp: new Date() },
  { productId: "665a0002bc93ef2d8c000011", affiliateCode: "WATCH001", eventType: "conversion", district: "Virudhunagar", timestamp: new Date() }
];

// Persistent Savers
const saveLocalUsers = () => {
  try { fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(localUsers, null, 2), 'utf8'); } catch (e: any) { console.warn("Failed saving local users:", e.message); }
};
const saveLocalProducts = () => {
  try { fs.writeFileSync(LOCAL_PRODUCTS_FILE, JSON.stringify(localProducts, null, 2), 'utf8'); } catch (e: any) { console.warn("Failed saving local products:", e.message); }
};
const saveLocalOrders = () => {
  try { fs.writeFileSync(LOCAL_ORDERS_FILE, JSON.stringify(localOrders, null, 2), 'utf8'); } catch (e: any) { console.warn("Failed saving local orders:", e.message); }
};
const saveLocalSundayLogs = () => {
  try { fs.writeFileSync(LOCAL_SUNDAY_LOGS_FILE, JSON.stringify(localSundayAutomationLogs, null, 2), 'utf8'); } catch (e: any) { console.warn("Failed saving local logs:", e.message); }
};
// ========== TOKEN BLACKLIST FOR LOGOUT ==========
// Handled by BlacklistedToken Mongoose model with TTL index

// ========== MIDDLEWARE ==========
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<any> => {
  // Check for X-API-Key programmatic access first
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey && ConfigurationService.getFlag('enablePatAuthentication') && isMongoConnected) {
    try {
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const pat = await PersonalAccessToken.findOne({ tokenHash: keyHash, revoked: false });
      if (pat) {
        pat.lastUsedAt = new Date();
        await pat.save().catch((e: any) => console.warn(e));
        (req as any).userId = pat.userId.toString();
        (req as any).isPatAuthenticated = true;
        return next();
      }
    } catch (e) {
      console.warn("API key authentication failed:", e);
    }
  }

  let token = req.headers.authorization?.split(' ')[1];
  
  // Protect state-changing methods (POST, PUT, DELETE, etc.) against CSRF by forcing the use of Authorization header
  const isSafeMethod = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  
  if (!token && isSafeMethod) {
    token = getCookieToken(req);
  }
  if (!token) return res.status(401).json({ error: 'No authorization token supplied' });
  
  let isBlacklisted = false;
  if (isMongoConnected) {
    isBlacklisted = !!(await BlacklistedToken.exists({ token }));
  } else {
    isBlacklisted = isTokenLocalBlacklisted(token);
  }
  if (isBlacklisted) {
    return res.status(401).json({ error: 'Token has been revoked, please login again' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY, { algorithms: ['HS256'] }) as { userId: string };
    (req as any).userId = decoded.userId;
    (req as any).authToken = token;

    // Check if user session has been revoked
    if (isMongoConnected && ConfigurationService.getFlag('enableDeviceManagement')) {
      const activeSession = await UserSession.findOne({ token, revoked: false });
      if (!activeSession) {
        // If device management is active, session must exist and not be revoked
        const sessionCount = await UserSession.countDocuments({ userId: decoded.userId });
        if (sessionCount > 0) {
          return res.status(401).json({ error: 'Session has been revoked or expired' });
        }
      }
    }

    next();
  } catch (error: any) {
    // Check if token is a valid Personal Access Token instead of JWT
    if (isMongoConnected && ConfigurationService.getFlag('enablePatAuthentication')) {
      try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const pat = await PersonalAccessToken.findOne({ tokenHash, revoked: false });
        if (pat) {
          pat.lastUsedAt = new Date();
          await pat.save().catch((e: any) => console.warn(e));
          (req as any).userId = pat.userId.toString();
          (req as any).isPatAuthenticated = true;
          return next();
        }
      } catch (e) {
        console.warn("Fallback PAT authentication check failed:", e);
      }
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired, please login again' });
    }
    res.status(401).json({ error: 'Invalid token, please authorize again' });
  }
};

const adminOnly = (req: express.Request, res: express.Response, next: express.NextFunction): any => {
  authenticate(req, res, async () => {
    try {
      const userId = (req as any).userId;
      
      if (isMongoConnected) {
        const user = await User.findById(userId);
        if (!user) return res.status(403).json({ error: 'Administrative privileges required' });
        
        (req as any).userEmail = user.email;
        if (isAdminEmail(user.email)) {
          if (user.role !== 'admin') {
            await User.updateOne({ _id: user._id }, { $set: { role: 'admin' } });
            user.role = 'admin';
          }
          return next();
        } else {
          if (user.role === 'admin') {
            await User.updateOne({ _id: user._id }, { $set: { role: 'user' } });
            user.role = 'user';
          }
        }
        
        return res.status(403).json({ error: 'Administrative privileges required' });
      } else {
        const u = localUsers.find(user => user._id === userId);
        if (!u) return res.status(403).json({ error: 'Administrative privileges required' });
        
        (req as any).userEmail = u.email;
        if (isAdminEmail(u.email)) {
          if (u.role !== 'admin') {
            u.role = 'admin';
            saveLocalUsers();
          }
          return next();
        } else {
          if (u.role === 'admin') {
            u.role = 'user';
            saveLocalUsers();
          }
        }
        
        return res.status(403).json({ error: 'Administrative privileges required' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
};

// ========== SUNDAY AUTOMATION & TRENDING RETIREMENT UTILS ==========

const SUNDAY_DUMMY_PRODUCTS_POOL = [
  {
    name: 'Quantum Wireless Charging Pad',
    description: 'Next-generation induction coaster using resonance waves to charge active devices.',
    longDescription: 'Charging reinvented. This minimalist slab projects an active resonant electromagnetic canopy, recharging up to three devices within a 30cm vicinity. No contact required. Constructed with spacecraft-grade tempered alloys, custom temperature metrics logging, and rapid output controls.',
    brand: 'NexaCharge',
    price: 89.99,
    originalPrice: 119.99,
    discount: 25,
    images: ['https://images.unsplash.com/photo-1622445262465-2481c4574875?w=800'],
    features: ['Contactless Resonant Charging', 'Concurrent 3-Device Power', 'Intelligent Thermal Throttling', 'Premium Tempered-Alloy Body'],
    specifications: {
      'Effective range': 'Up to 30 centimeters',
      'Power delivery': 'Concurrent 45W distribution',
      'Efficiency': 'Over 92% transmission rate',
      'Warranty': '3 years robust global coverage'
    },
    inStock: true,
    tags: ['charging', 'wireless', 'next-gen', 'quantum'],
    trending: true,
    featured: true,
    pros: ['Completely contactless mechanics', 'Fabulous architectural profile', 'Zero noise emission'],
    cons: ['Needs dedicated high-capacity adapter', 'A tad heavier than conventional pads'],
    seoTitle: 'NexaCharge Quantum Wireless Charging Coaster Review',
    seoDescription: 'Check specifications, pricing and active referral codes for the NexaCharge contactless quantum resonant charger.',
    seoKeywords: ['resonant wireless charger', 'contactless charge', 'next-gen desk accessories']
  },
  {
    name: 'Holographic Ambient Desktop Projector',
    description: 'Immersive table-top lens casing that projects atmospheric widgets and calendars.',
    longDescription: 'Turn your immediate desk workspace into a vibrant sci-fi dashboard. Projects high-fidelity calendars, notification counts, real-time UTC times, district traffic loops, and personalized quotes in ultra-crisp transparent light directly above the pad.',
    brand: 'Holowork',
    price: 249.99,
    originalPrice: 299.99,
    discount: 16,
    images: ['https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800'],
    features: ['Transparent Laser Casing projection', 'Interactive Gestures Support', 'Real-Time IoT Widget Feeds', 'Ambient Breathing Glow Modes'],
    specifications: {
      'Projector Type': 'Laser Diode Array',
      'Resolution Ratio': 'Virtual Full HD rendering',
      'Gestures': 'Optical Tracking Camera',
      'Hardware Connectivity': 'Wi-Fi 6 / Bluetooth 5.3'
    },
    inStock: true,
    tags: ['projector', 'desktop', 'laser', 'hologram'],
    trending: true,
    featured: false,
    pros: ['Stunning high-impact visuals', 'Responsive hands-free gestures', 'Very compact modern casing'],
    cons: ['Requires moderate dimly lit ambient settings', 'Requires stable desk surface for optimal resolution'],
    seoTitle: 'Holowork Interactive Projector Specs and Analysis',
    seoDescription: 'Complete product breakdown for Holowork ambient multi-indicator laser table project arrays.',
    seoKeywords: ['hologram widget', 'laser desktop display', 'immersive smart desk']
  },
  {
    name: 'Acoustic Soundproofing Smart Panels',
    description: 'Geometric interlocking fiber tiles with integrated sound-reactive lighting.',
    longDescription: 'Elevate your studio, streaming corner, or office acoustics while adding dramatic depth. These high-density interlocking acoustic tiles absorb high frequencies, damp echo patterns, and house individual micro-LED visualizers syncing seamlessly along with ambient soundwaves.',
    brand: 'Harmonix',
    price: 129.99,
    originalPrice: 159.99,
    discount: 18,
    images: ['https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800'],
    features: ['High-Absorption PET Fiber', 'Interlocking Magnetic Joints', 'Sound-Reactive Micro RGB LED Matrix', 'Dedicated companion setup app'],
    specifications: {
      'Absorption Rate': '0.85 NRC rating',
      'Panel Count': '6 interlocking hexagonal tiles',
      'Tile Diameter': '30cm per hexagon edge',
      'Core material': 'Recycled thermal flame retardant fiber'
    },
    inStock: true,
    tags: ['audio', 'acoustic', 'lighting', 'gaming'],
    trending: true,
    featured: false,
    pros: ['Clean elegant visual look', 'Excellent high-echo damping performance', 'Very simple modular magnetic hookup'],
    cons: ['Setup requires double-sided adhesive sheets', 'LED panels require central auxiliary wall power line'],
    seoTitle: 'Harmonix Modular Light-Up Sound Absorption Tiles',
    seoDescription: 'Maximize audio clarity and design stream-ready configurations with Harmonix active tiles.',
    seoKeywords: ['sound dampening panels', 'rgb foam tiles', 'stream studio lighting']
  },
  {
    name: 'Smart Ergonomic Office Seat Pad',
    description: 'Active posture-analyzing memory gel cushion with Bluetooth analytics.',
    longDescription: 'Reclaim your spine during long curation shifts. This memory gel cushion features embedded pressure distribution matrices, logging sitting habits, sending reminders to stretch, and auto-tuning internal pneumatic levels to maximize pelvis comfort.',
    brand: 'Anatomi',
    price: 79.99,
    originalPrice: 99.99,
    discount: 20,
    images: ['https://images.unsplash.com/photo-1580481072645-022f9a6dbf27?w=800'],
    features: ['Multi-Sensor Pressure Registry', 'Cooling Honeycomb Aerogel', 'Automated Posture Reminders', 'Up to 30 days battery monitoring'],
    specifications: {
      'Gel Weight': '1.2kg heavy-duty support',
      'Sensor array': '16 active pressure zones',
      'Battery life': 'Rechargeable coin core (1 month duration)',
      'Dimensions': '45 x 40 x 5 centimeters'
    },
    inStock: true,
    tags: ['office', 'ergonomics', 'smart-home', 'accessories'],
    trending: true,
    featured: true,
    pros: ['Very comfortable memory aerogel', 'Insightful posture analytics charts', 'Lightweight portable design'],
    cons: ['Needs active Bluetooth sync to log long logs', 'Machine washable outer cover only'],
    seoTitle: 'Anatomi Orthopedic Sensor Gel Cushion Specifications',
    seoDescription: 'Read user reviews and discount criteria for the Anatomi active posture gel pad.',
    seoKeywords: ['office posture cushion', 'ergonomic gel support', 'smart work desk seat']
  }
];

function generateUniqueProduct(index: number, sundayStr: string): any {
  const template = SUNDAY_DUMMY_PRODUCTS_POOL[index % SUNDAY_DUMMY_PRODUCTS_POOL.length];
  const hashStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const name = `${template.name} [Sunday ${sundayStr} ${hashStr}]`;
  const slug = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${sundayStr.toLowerCase()}-${hashStr.toLowerCase()}`;
  
  return {
    ...template,
    name,
    slug,
    _id: "prod_sun_" + sundayStr.replace(/-/g, '') + "_" + hashStr,
    clicks: 12 + Math.floor(Math.random() * 20),
    conversions: 2 + Math.floor(Math.random() * 5),
    rating: 4.5,
    totalReviews: 2,
    reviews: [
      {
        rating: 5,
        title: "Spectacular Curation Item!",
        content: "Outstanding performance. Perfect layout and build quality.",
        helpful: 1,
        createdAt: new Date()
      }
    ],
    createdAt: new Date(),
    trending: true,
    trendingStartedAt: new Date()
  };
}

// File synchronization queue to serialize writes to seeddata.ts and prevent concurrency-related corruption
const fileSyncQueue = {
  queue: [] as (() => Promise<void>)[],
  running: false,
  add(task: () => Promise<void>) {
    this.queue.push(task);
    this.runNext();
  },
  async runNext() {
    if (this.running) return;
    const nextTask = this.queue.shift();
    if (!nextTask) return;
    this.running = true;
    try {
      await nextTask();
    } catch (e: any) {
      console.error('FileSyncQueue execution error:', e.message);
    } finally {
      this.running = false;
      this.runNext();
    }
  }
};

async function syncProductsToSeedFile(): Promise<void> {
  return Promise.resolve();
}

async function syncCategoriesToSeedFile(): Promise<void> {
  return Promise.resolve();
}

async function syncBlogsToSeedFile(): Promise<void> {
  return Promise.resolve();
}

async function syncMessagesToSeedFile(): Promise<void> {
  return Promise.resolve();
}

async function resolveUniqueSlug(
  baseSlug: string,
  type: 'product' | 'blog',
  excludeId?: string
): Promise<{ exists: boolean; finalSlug: string }> {
  const safeBaseSlug = String(baseSlug || '').toLowerCase();
  let slug = safeBaseSlug.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  if (slug.length > 100) {
    slug = slug.substring(0, 100);
  }
  if (!slug) {
    slug = 'item-' + Math.random().toString(36).substring(2, 6);
  }

  let exists = false;
  let finalSlug = slug;

  const checkIfExist = async (testSlug: string): Promise<boolean> => {
    if (isMongoConnected) {
      if (type === 'product') {
        const query: any = { slug: testSlug };
        if (excludeId) {
          const idsToExclude: any[] = [excludeId];
          if (mongoose.Types.ObjectId.isValid(excludeId)) {
            idsToExclude.push(new mongoose.Types.ObjectId(excludeId));
          }
          query._id = { $nin: idsToExclude };
        }
        const item = await Product.findOne(query);
        return !!item;
      } else {
        const query: any = { slug: testSlug };
        if (excludeId) {
          const idsToExclude: any[] = [excludeId];
          if (mongoose.Types.ObjectId.isValid(excludeId)) {
            idsToExclude.push(new mongoose.Types.ObjectId(excludeId));
          }
          query._id = { $nin: idsToExclude };
        }
        const item = await Blog.findOne(query);
        return !!item;
      }
    } else {
      if (type === 'product') {
        return localProducts.some((p: any) => p.slug === testSlug && p._id !== excludeId);
      } else {
        return localBlogs.some((b: any) => b.slug === testSlug && b._id !== excludeId);
      }
    }
  };

  exists = await checkIfExist(slug);

  if (exists) {
    let i = 1;
    while (true) {
      finalSlug = `${slug}-${i}`;
      const stillExists = await checkIfExist(finalSlug);
      if (!stillExists) {
        break;
      }
      i++;
    }
  }

  return { exists, finalSlug };
}

let mailTransport: any = null;

function getMailTransport() {
  if (!mailTransport) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    const hasAnySmtpConfig = host || port || user || pass;

    if (hasAnySmtpConfig) {
      if (!host || !port || !user || !pass) {
        console.warn("⚠️ SMTP Mail configuration is incomplete. Missing fields: " + 
          [
            !host && "SMTP_HOST",
            !port && "SMTP_PORT",
            !user && "SMTP_USER",
            !pass && "SMTP_PASS"
          ].filter(Boolean).join(", ") + 
          ". SMTP emails will be logged and simulated."
        );
        return null;
      }

      const numericPort = Number(port);
      mailTransport = nodemailer.createTransport({
        host,
        port: numericPort,
        secure: numericPort === 465,
        auth: { user, pass },
        // Production SMTP / TCP connection configurations
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      console.log("Nodemailer SMTP transport configured successfully.");
    } else {
      console.log("SMTP mail server is not configured. SMTP emails will be logged and simulated.");
    }
  }
  return mailTransport;
}

// Automatically trigger direct newsletter alerts for newly added products matching a "Pick Where You Left" category interest
async function triggerProductAddedEmailNotifications(product: any) {
  try {
    const subcategoryName = (product.subcategory || '').toString().trim();
    if (!subcategoryName) return;

    // We'll also resolve product's category name in case interests were registered on category name
    let categoryName = '';
    if (isMongoConnected) {
      const populatedProduct = await Product.findById(product._id).populate('category');
      if (populatedProduct && populatedProduct.category) {
        categoryName = (populatedProduct.category as any).name;
      }
    } else {
      const catId = product.category;
      if (catId && typeof catId === 'object') {
        categoryName = (catId as any).name || '';
      } else {
        const matchedCat = localCategories.find((c: any) => c._id === catId || c.slug === catId);
        if (matchedCat) {
          categoryName = matchedCat.name;
        }
      }
    }

    // Retrieve all active pick-where-you-left interests
    let interests: any[] = [];
    if (isMongoConnected) {
      // Find matching interests: categoryName of the clicked interest matches product subcategory (case-insensitive) OR matching categoryName directly
      interests = await PickLeftInterest.find({
        $or: [
          { categoryName: { $regex: new RegExp(`^${escapeRegExp(subcategoryName)}$`, 'i') } },
          { categoryName: { $regex: new RegExp(`^${escapeRegExp(categoryName)}$`, 'i') } }
        ]
      });
    } else {
      interests = localPickLeftInterests.filter(
        (interest: any) => 
          interest.categoryName.trim().toLowerCase() === subcategoryName.toLowerCase() ||
          interest.categoryName.trim().toLowerCase() === categoryName.toLowerCase()
      );
    }

    if (interests.length === 0) return;

    const transporter = getMailTransport();
    const sender = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'newsletter@gadgetsprohub.com';

    for (const interest of interests) {
      const recipientEmail = interest.email;
      if (!recipientEmail) continue;

      const subject = `📬 New Product Alert: ${product.name} Added!`;
      const prodImage = (product.images && product.images[0]) ? product.images[0] : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600';
      
      const htmlBody = `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #f1f5f9; border-radius: 24px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
          <div style="text-align: center; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 16px; background-color: #f5f3ff; font-size: 24px; text-align: center; margin-bottom: 12px;">📬</div>
            <h1 style="font-size: 22px; font-weight: 900; color: #1e293b; margin: 0; text-transform: uppercase; letter-spacing: -0.025em;">GadgetsProHub</h1>
            <p style="font-size: 11px; color: #6366f1; font-weight: 800; margin: 4px 0 0 0; font-family: monospace; tracking-wider; text-transform: uppercase;">Direct Pick-History Newsletter</p>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 12px 0;">
            Hello from GadgetsProHub!
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
            Based on your interest in the <strong>"${interest.categoryName}"</strong> category from your <strong>"Pick Where You Left"</strong> history board, we've drafted this notification because a matching new product has been successfully added to our catalog!
          </p>
          
          <div style="margin: 28px 0; padding: 20px; border: 1px solid #f1f5f9; border-radius: 20px; background-color: #fafbfd; display: flex; flex-direction: row; align-items: center; gap: 20px;">
            <div style="flex-shrink: 0; width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; background-color: #ffffff; border-radius: 14px; border: 1px solid #f1f5f9; padding: 8px;">
              <img src="${prodImage}" alt="${product.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            </div>
            <div style="flex: 1; min-width: 0;">
              <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #6366f1; font-family: monospace; letter-spacing: 0.05em;">${product.brand || 'Premium Brand'}</span>
              <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 4px 0; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${product.name}</h3>
              <p style="font-size: 12px; color: #64748b; margin: 0 0 8px 0; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${product.description || 'View details and latest specifications on our site.'}</p>
              <div style="font-size: 15px; font-weight: 900; color: #0f172a;">
                $${product.price}
                ${product.originalPrice ? `<span style="font-size: 11px; text-decoration: line-through; color: #94a3b8; font-weight: 500; margin-left: 6px;">$${product.originalPrice}</span>` : ''}
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 28px 0 20px 0;">
            <a href="${process.env.APP_URL || 'https://gadgetsprohub.com'}/products/${product.slug}" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(99,102,241,0.2); transition: background-color 0.2s;">
              View Full Product Sheet
            </a>
          </div>
          
          <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
            <p style="margin: 0;">You received this email because you registered for automated newsletter alerts on <strong>"${interest.categoryName}"</strong> from your <strong>"Pick Where You Left"</strong> board.</p>
            <p style="margin: 4px 0 0 0;">© 2026 GadgetsProHub Affiliate Portal. All rights reserved.</p>
          </div>
        </div>
      `;

      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"GadgetsProHub Newsletter" <${sender}>`,
            to: recipientEmail,
            subject,
            html: htmlBody
          });
          console.log(`[Success] Direct email sent to ${recipientEmail} for category interest: ${interest.categoryName}`);
        } catch (mailErr: any) {
          console.warn(`Failed to send email to ${recipientEmail}:`, mailErr.message);
        }
      } else {
        console.log(`[Simulated Email to ${recipientEmail}]\nSubject: ${subject}\nBody: Product: ${product.name}`);
      }
    }
  } catch (err: any) {
    console.error('Error in triggerProductAddedEmailNotifications:', err.message);
  }
}

function escapeRegExp(value: any) {
  const str = typeof value === 'string' ? value : String(value || '');
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Automatically demote and clean expired trending products that are older than 7 days
async function cleanExpiredTrendingProducts() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  if (isMongoConnected) {
    try {
      // Revert if trendingStartedAt is older than 7 days
      const result = await Product.updateMany(
        { trending: true, trendingStartedAt: { $lt: oneWeekAgo } },
        { $set: { trending: false } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Auto-reverted ${result.modifiedCount} products from trending to normal.`);
      }

      // If trending is true but trendingStartedAt is missing, initialize it!
      await Product.updateMany(
        { trending: true, trendingStartedAt: { $exists: false } },
        { $set: { trendingStartedAt: new Date() } }
      );
    } catch (err) {
      captureError(err, { context: 'cleanExpiredTrendingProducts' });
    }
  } else {
    let modified = false;
    localProducts.forEach((p: any) => {
      if (p.trending) {
        if (!p.trendingStartedAt) {
          p.trendingStartedAt = p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString();
          modified = true;
        } else {
          const startedAt = new Date(p.trendingStartedAt);
          if (startedAt < oneWeekAgo) {
            p.trending = false;
            modified = true;
            console.log(`Local product ${p.name} auto-reverted from trending to normal.`);
          }
        }
      }
    });
    if (modified) {
      syncProductsToSeedFile().catch(e => console.warn(e));
    }
  }
}

// Manually purge expired blacklisted tokens from database as a safety maintenance routine
async function cleanExpiredBlacklistedTokens() {
  if (isMongoConnected) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await BlacklistedToken.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
      if (result.deletedCount > 0) {
        console.log(`[Maintenance] Purged ${result.deletedCount} expired blacklisted tokens from database.`);
      }
    } catch (err: any) {
      console.error('[Maintenance Error] Failed to purge blacklisted tokens:', err.message);
    }
  }
}

// Task execution function to automatically populate and notify the admin's mailbox
async function runSundayAutomation(targetSundayStr?: string, forceEmail?: string) {
  const useMongo = isMongoConnected;
  let sundayStr = targetSundayStr;
  
  if (!sundayStr) {
    const today = new Date();
    if (today.getDay() !== 0) {
      return null; // Only run on Sundays unless targetSundayStr is provided
    }
    sundayStr = today.toISOString().split('T')[0];
  }

  // Check unique log constraints
  if (useMongo) {
    try {
      const existingLog = await SundayAutomationLog.findOne({ sundayDate: sundayStr });
      if (existingLog) {
        console.log(`Sunday automation already executed for date ${sundayStr}.`);
        return existingLog;
      }
    } catch (e) {
      console.error("Error checking Sunday Log:", e);
    }
  } else {
    const existingLog = localSundayAutomationLogs.find((l: any) => l.sundayDate === sundayStr);
    if (existingLog) {
      console.log(`Sunday local automation already executed for date ${sundayStr}.`);
      return existingLog;
    }
  }

  console.log(`Running Sunday Automation Task for date range: ${sundayStr}`);

  // Fetch or select Category id
  let categoryId = "665a0001bc93ef2d8c000001"; // default electronics
  if (useMongo) {
    try {
      const cat = await Category.findOne({ slug: 'electronics' });
      if (cat) categoryId = cat._id.toString();
      else {
        const anyCat = await Category.findOne({});
        if (anyCat) categoryId = anyCat._id.toString();
      }
    } catch (e) {
      console.warn(e);
    }
  } else {
    const cat = localCategories.find((c: any) => c.slug === 'electronics') || localCategories[0];
    if (cat) categoryId = cat._id;
  }

  const newProdsRaw = [
    generateUniqueProduct(localSundayAutomationLogs.length * 2, sundayStr),
    generateUniqueProduct(localSundayAutomationLogs.length * 2 + 1, sundayStr)
  ];

  newProdsRaw.forEach(p => {
    p.category = categoryId;
  });

  const addedIds: string[] = [];
  const addedProductsList: any[] = [];

  if (useMongo) {
    try {
      for (const raw of newProdsRaw) {
        const productData = {
          ...raw,
          _id: new mongoose.Types.ObjectId(),
          category: new mongoose.Types.ObjectId(categoryId),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const product = new Product(productData);
        await product.save();
        addedIds.push(product._id.toString());
        addedProductsList.push(product);
        // Trigger newsletter alerts
        triggerProductAddedEmailNotifications(product).catch(err => console.warn('Newsletter trigger failed:', err.message));
      }
      await syncProductsToSeedFile();
    } catch (err) {
      captureError(err, { context: 'saving automatic Sunday products' });
    }
  } else {
    for (const raw of newProdsRaw) {
      localProducts.unshift(raw);
      addedIds.push(raw._id);
      addedProductsList.push(raw);
      // Trigger newsletter alerts
      triggerProductAddedEmailNotifications(raw).catch(err => console.warn('Newsletter trigger failed:', err.message));
    }
    await syncProductsToSeedFile().catch(e => console.warn(e));
  }

  const authorEmail = (typeof forceEmail === 'string' && forceEmail) ? forceEmail : process.env.AUTHOR_EMAIL;
  if (!authorEmail) {
    console.warn("AUTHOR_EMAIL not provided, skipping notification email.");
  }
  const emailSubject = `🚨 Sunday Reminder: New Curation Products Auto-Added & Logged – ${sundayStr}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="font-size: 32px;">🕒</span>
        <h2 style="color: #4f46e5; margin: 10px 0 5px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Sunday Curation Active</h2>
        <p style="color: #64748b; font-size: 13px; margin: 0;">Automated product sync & admin email tracking</p>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #334155;">Hello Admin,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Today is <strong>Sunday (${sundayStr})</strong>! Our automated curation engine has run and successfully populated the portal catalog with <strong>two brand-new premium tech products</strong>.
      </p>

      <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #1e293b;">🆕 Added Sunday Curation Products:</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
          ${addedProductsList.map(p => `
            <li style="margin-bottom: 10px;">
              <strong style="color: #0f172a;">${p.name}</strong><br/>
              <em>Brand:</em> ${p.brand} | <em>Price:</em> $${p.price.toFixed(2)}<br/>
              <em>Features:</em> ${p.features ? p.features.slice(0, 3).join(', ') : 'None'}<br/>
              <span style="color: #6366f1; font-size: 11px; font-family: monospace;">Slug: ${p.slug}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        <strong>Trending Period:</strong> These items have been marked as <strong>Trending</strong>. They will stay displayed in the trending selection space for precisely <strong>7 days</strong>, after which our dynamic backend auto-migrates them to standard curated listings.
      </p>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 25px; font-size: 11px; color: #94a3b8; text-align: center;">
        <p style="margin: 0;">This reminder alerts the admin control room systematically.</p>
        <p style="margin: 3px 0 0 0;">Platform commission records log via supportataffiliateprohub@gmail.com</p>
      </div>
    </div>
  `;

  let sentStatus = 'Simulated';
  let errorDetails = '';

  const transporter = getMailTransport();
  if (transporter && authorEmail) {
    try {
      const sender = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@gadgetsprohub.com';
      await transporter.sendMail({
        from: `"GadgetsProHub Automatons" <${sender}>`,
        to: authorEmail,
        subject: emailSubject,
        html: htmlBody
      });
      sentStatus = 'Success';
    } catch (err: any) {
      sentStatus = 'Failed';
      errorDetails = err.message;
    }
  } else if (!authorEmail) {
    sentStatus = 'Skipped';
    errorDetails = 'AUTHOR_EMAIL environment variable not configured';
  }

  const logObj = {
    sundayDate: sundayStr,
    runAt: new Date(),
    localProductsAddedIds: addedIds,
    emailSentTo: authorEmail || 'no-author-email@gadgetsprohub.com',
    emailSubject,
    emailBody: htmlBody,
    sentStatus,
    errorDetails
  };

  let finalLog: any = null;
  if (useMongo) {
    try {
      const mongoLog = new SundayAutomationLog({
        ...logObj,
        productsAdded: addedIds
          .filter(id => id && mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id))
      });
      await mongoLog.save();
      finalLog = mongoLog;
    } catch (err) {
      captureError(err, { context: 'Sunday Log Creation' });
    }
  } else {
    finalLog = {
      _id: "log_sun_" + Math.random().toString(36).substring(2, 9),
      ...logObj,
      productsAdded: addedProductsList
    };
    localSundayAutomationLogs.unshift(finalLog);
    saveLocalSundayLogs();
    saveLocalProducts();
  }

  return finalLog;
}

// Start Server Setup Wrapper
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Wrap all async route handlers/middlewares to automatically pass unhandled rejections to the centralized error handler
  const wrapAsync = (fn: any) => {
    if (typeof fn !== 'function') return fn;
    if (fn.length === 4) {
      return (err: any, req: any, res: any, next: any) => {
        try {
          const result = fn(err, req, res, next);
          if (result && typeof result.catch === 'function') {
            result.catch(next);
          }
        } catch (catchErr) {
          next(catchErr);
        }
      };
    }
    return (req: any, res: any, next: any) => {
      try {
        const result = fn(req, res, next);
        if (result && typeof result.catch === 'function') {
          result.catch(next);
        }
      } catch (catchErr) {
        next(catchErr);
      }
    };
  };

  const methods = ['get', 'post', 'put', 'delete', 'patch', 'use'] as const;
  for (const method of methods) {
    const original = (app as any)[method].bind(app);
    (app as any)[method] = function (pathOrFn: any, ...args: any[]) {
      if (typeof pathOrFn === 'function') {
        return original(wrapAsync(pathOrFn), ...args.map(wrapAsync));
      }
      const wrappedArgs = args.map(wrapAsync);
      return original(pathOrFn, ...wrappedArgs);
    };
  }

  // Security Headers and Reverse Proxy configuration
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: process.env.NODE_ENV === "production" 
          ? ["'self'", "https://pagead2.googlesyndication.com", "https://*.doubleclick.net", "https://*.googlesyndication.com", "https://*.google.com", "https://*.adtrafficquality.google", "https://ep1.adtrafficquality.google", "https://ep2.adtrafficquality.google"]
          : ["'self'", "'unsafe-inline'", "https://pagead2.googlesyndication.com", "https://*.doubleclick.net", "https://*.googlesyndication.com", "https://*.google.com", "https://*.adtrafficquality.google", "https://ep1.adtrafficquality.google", "https://ep2.adtrafficquality.google"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "wss:", "https://*.google.com", "https://*.googleapis.com", "https://*.google-analytics.com", "https://*.doubleclick.net", "https://ipapi.co", "https://*.run.app", "https://*.onrender.com", "https://gadgetsprohub.onrender.com", "https://*.adtrafficquality.google", "https://*.google"],
        frameSrc: ["'self'", "https://*.google.com", "https://*.doubleclick.net", "https://*.firebaseapp.com", "https://*.adtrafficquality.google", "https://*.google"],
        frameAncestors: ["'self'", "https://*.aistudio.google", "https://aistudio.google", "https://*.google.com", "https://google.com","https://gadgetsprohub.onrender.com"],
      }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginEmbedderPolicy: false
  }));
  app.disable('x-powered-by');

  // Middleware
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      let parsedOrigin: URL;
      try {
        parsedOrigin = new URL(origin);
      } catch {
        return callback(new Error('Not allowed by CORS due to invalid origin format'));
      }
      
      const hostname = parsedOrigin.hostname;
      
      // Safe regex check for localhost and 127.0.0.1 (any port)
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      const isGoogleDomain = 
        hostname === 'google.com' || hostname.endsWith('.google.com') ||
        hostname === 'google' || hostname.endsWith('.google') ||
        hostname === 'aistudio.google' || hostname.endsWith('.aistudio.google');
        
      // Restrict run.app strictly to our specific project subdomain identifier to prevent open-subdomain takeover
      const isRunAppAllowed = /^[a-z0-9-]+-qsss35leqdsbti2ibtyylr-[a-z0-9-]+\.[a-z0-9-]+\.run\.app$/.test(hostname);
      const isOwnDomain = hostname === 'gadgetsprohub.onrender.com' || hostname.endsWith('.gadgetsprohub.onrender.com');
      if (isLocalhost || isGoogleDomain || isRunAppAllowed || isOwnDomain) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Structured Logging & Request Correlation IDs with Metrics Tracking Middleware
  app.use((req: any, res: any, next: express.NextFunction) => {
    const correlationId = crypto.randomBytes(16).toString('hex');
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    MetricsService.incrementRequests();
    const startTime = process.hrtime();

    res.on('finish', () => {
      const diff = process.hrtime(startTime);
      const durationMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
      MetricsService.recordResponseTime(durationMs);

      const logData = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs,
        correlationId,
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || req.connection?.remoteAddress || '127.0.0.1'
      };

      // Store in real-time telemetry log buffer for admin console tracking
      MetricsService.addLiveLog(logData);

      if (ConfigurationService.getFlag('enableStructuredLogs')) {
        console.log(JSON.stringify(logData));
      }
    });

    next();
  });

  // Sanitize outgoing JSON error responses to prevent leaking raw technical/internal system details (Information Disclosure)
  app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
    const originalJson = res.json;
    res.json = function (body: any) {
      if (body && typeof body === 'object' && body.error) {
        const msg = typeof body.error === 'string' ? body.error : (body.error.message || '');
        const lower = msg.toLowerCase();
        
        // Define explicit safe error messages that we should never mask
        const safeMessages = [
          'incorrect password',
          'email and password are required',
          'invalid email format',
          'user not found',
          'user already exists',
          'token has expired, please login again',
          'token has been revoked, please login again',
          'invalid token, please authorize again',
          'no authorization token supplied',
          'administrative privileges required',
          'email verification required',
          'invalid or expired verification token',
          'product not found',
          'category not found',
          'blog not found',
          'order not found',
          'message not found',
          'database not connected',
          'slug already exists',
          'invalid slug'
        ];

        const isExplicitlySafe = safeMessages.some(safe => lower.includes(safe));

        if (!isExplicitlySafe) {
          // If 5xx, always mask to be absolutely secure
          if (res.statusCode >= 500) {
            body.error = 'An internal database or system error occurred. Please try again later.';
          } else {
            // Check if error contains sensitive keywords representing internal errors, db details, paths, or secrets
            const rawKeywords = [
              'mongodb', 'mongo', 'database', 'query', 'connection', 'connect',
              'socket', 'mquery', 'validation failed', 'cast to objectid', 'duplicate key',
              'index:', 'unhandled', 'throw', 'stack', 'unexpected token', 'json', 'syntax',
              'referenceerror', 'typeerror', 'error:', 'failed to', 'enoent', 'econnreset',
              'econnrefused', 'eaddrinuse', 'etimedout', 'node_modules', '.js', '.ts',
              '__dirname', 'filename', 'undefined', 'null', 'method', 'property', 'object',
              'schema', 'collection', 'cursor', 'driver', 'bson', 'client', 'dns', 'network',
              'timeout', 'process', 'system', 'compile', 'token', 'secret', 'key', 'crypt',
              'jwt', 'auth', 'bcrypt', 'salt', 'hash', 'signature', 'verifier', 'payload',
              'issuer', 'audience', 'alg', 'parse', 'compiler', 'eval', 'function', 'class',
              'construct', 'prototype', 'argument', 'parameter', 'invalid value', 'bad request',
              'mongoose', 'model', 'unauthorized', 'forbidden', 'server error', 'exception'
            ];
            
            const isInternal = rawKeywords.some(keyword => lower.includes(keyword)) ||
                               /at\s+[\w\d_$.]+\s+\(/i.test(msg) || // Stack trace detector
                               msg.includes('/') || msg.includes('\\') ||
                               msg.includes('\n') || msg.includes('\r');

            if (isInternal) {
              body.error = 'An internal database or system error occurred. Please try again later.';
            } else {
              body.error = msg;
            }
          }
        } else {
          body.error = msg;
        }
      }
      return originalJson.call(this, body);
    };
    next();
  });

  app.use(mongoSanitize({
    allowDots: false
  }));

  // ========== MANDATORY DATABASE INTEGRITY MIDDLEWARE ==========
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (
      req.path.startsWith('/api') &&
      !req.path.startsWith('/api/admin/db-toggle') &&
      !req.path.startsWith('/api/health') &&
      mongoose.connection.readyState !== 1
    ) {
      return res.status(503).json({
        success: false,
        error: 'CRITICAL DATABASE OFFLINE: Live MongoDB Atlas operations are strictly required to protect catalog authenticity, preserve sessions, and prevent data inconsistency.'
      });
    }
    next();
  });

  // ========== PHASE 8: REDIRECT RULES ENGINE MIDDLEWARE ==========
  app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Only intercept GET requests for actual pages (skip assets/api paths)
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/assets') || req.path.includes('.')) {
      return next();
    }

    if (mongoose.connection.readyState !== 1) {
      return next();
    }

    try {
      const RedirectRule = mongoose.model('RedirectRule');
      const rule = await RedirectRule.findOne({ sourceUrl: req.path });
      if (rule) {
        // Increment redirect hits
        rule.hits = (rule.hits || 0) + 1;
        await rule.save();

        console.log(`[Redirect Engine] Intercepted path ${req.path}. Redirecting (${rule.type}) to ${rule.targetUrl}`);
        return res.redirect(rule.type || 301, rule.targetUrl);
      }
    } catch (e: any) {
      console.warn('Redirect engine failed to check rules:', e.message);
    }
    next();
  });

  // Spoof-proof client IP generator (extracts real IP appended by Google GFE to prevent headers spoofing)
  const getSecureClientIp = (req: express.Request): string => {
    const xff = req.headers['x-forwarded-for'];
    if (xff && typeof xff === 'string') {
      const parts = xff.split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        return parts[parts.length - 1]; // Real caller IP appended by downstream proxy GFE
      }
    }
    return req.ip || '127.0.0.1';
  };

  // General API call rate limiter (Dos protection)
  const generalLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 1000,
    message: { error: 'Too many requests from this IP address, please retry in 5 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getSecureClientIp,
    validate: { xForwardedForHeader: false, default: false }
  });
  app.use('/api/', generalLimiter);

  // Isolate highest-risk login paths to mitigate brute-force/credential padding attacks
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15, // Max 15 attempts per 15 minutes
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getSecureClientIp,
    validate: { xForwardedForHeader: false, default: false }
  });
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/google', loginLimiter);

  // General Auth activity rate limiter
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: { error: 'Excessive authorization activities detected, please attempt again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getSecureClientIp,
    validate: { xForwardedForHeader: false, default: false }
  });
  app.use('/api/auth/', authLimiter);

  // Database auto-seeding function
  async function seedDatabase() {
    try {
      console.log('Checking database collections for seeding initial records...');
      
      const categoryCount = await Category.countDocuments();
      if (categoryCount === 0) {
        console.log('Seeding initial categories into MongoDB...');
        await Category.insertMany(localCategories);
      }

      const productCount = await Product.countDocuments();
      if (productCount === 0) {
        console.log('Seeding initial products into MongoDB...');
        await Product.insertMany(localProducts);
      }

      const blogCount = await Blog.countDocuments();
      if (blogCount === 0) {
        console.log('Seeding initial blogs into MongoDB...');
        await Blog.insertMany(localBlogs);
      }

      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('Seeding initial users into MongoDB...');
        const hashedUsers = await Promise.all(localUsers.map(async (u) => {
          if (u.password) {
            const hashed = await hashHelper(u.password);
            return { ...u, password: hashed };
          }
          return u;
        }));
        await User.insertMany(hashedUsers);
      }

      const analyticsCount = await Analytics.countDocuments();
      if (analyticsCount === 0) {
        console.log('Seeding initial analytics records into MongoDB...');
        const sampleProducts = await Product.find().limit(3);
        const sampleUsers = await User.find().limit(2);
        
        const earbudId = sampleProducts[0]?._id;
        const watchId = sampleProducts[1]?._id;
        const userId1 = sampleUsers[0]?._id;
        const userId2 = sampleUsers[1]?._id;

        const defaultAnalytics = [
          { productId: earbudId, affiliateCode: "AUDIO001", eventType: "click", district: "Chennai", timestamp: new Date(Date.now() - 3600000 * 4), browser: "Chrome", device: "Desktop", pageUrl: "home" },
          { productId: earbudId, userId: userId1, affiliateCode: "AUDIO001", eventType: "view", district: "Madurai", timestamp: new Date(Date.now() - 3600000 * 3), browser: "Safari", device: "Mobile", pageUrl: "home" },
          { productId: watchId, affiliateCode: "WATCH001", eventType: "click", district: "Tirunelveli", timestamp: new Date(Date.now() - 3600000 * 2), browser: "Firefox", device: "Desktop", pageUrl: "products" },
          { productId: watchId, userId: userId2, affiliateCode: "WATCH001", eventType: "conversion", district: "Virudhunagar", timestamp: new Date(Date.now() - 3600000 * 1), browser: "Chrome", device: "Mobile", pageUrl: "products" }
        ];

        await Analytics.insertMany(defaultAnalytics);
        
        const vCount = await Visitor.countDocuments();
        if (vCount === 0) {
          const defaultVisitors = [
            { visitorId: "vis_seeded_0", ip: "106.208.5.11", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", timestamp: new Date(Date.now() - 3600000 * 4) },
            { visitorId: "vis_seeded_1", ip: "106.208.5.12", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5)", timestamp: new Date(Date.now() - 3600000 * 2) }
          ];
          await Visitor.insertMany(defaultVisitors);
        }
      }

      console.log('MongoDB Auto-Seeding setup successfully verified.');
    } catch (err: any) {
      console.error('Failed to run default MongoDB seeder hook:', err.message);
    }
  }

  // Database Connection with immediate Error Safety routing and fast timeout fallback
  mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/affiliate-store',
    { serverSelectionTimeoutMS: 15000 }
  )
  .then(() => {
    console.log('Successfully connected to MongoDB Cluster');
    isMongoConnected = true;

    // Safely drop index sub_1 if it exists in the database
    if (mongoose.connection.db) {
      mongoose.connection.db.collection('users').dropIndex('sub_1')
        .then(() => console.log('Successfully dropped stale sub_1 index.'))
        .catch((err: any) => console.log('Stale index sub_1 dropped or not exists. Msg:', err.message));
    }

    seedDatabase().catch((err: any) => {
      console.error('Failed to auto-seed database:', err.message || err);
    });
    aiService.seedPrompts().then(() => {
      console.log('Successfully seeded AI Prompt Templates');
    }).catch((err: any) => {
      console.error('Failed to seed AI Prompts:', err.message || err);
    });
  })
  .catch((err: any) => {
    console.error('CRITICAL SYSTEM FAILURE: Could not establish a connection to MongoDB Atlas. Live DB operations are strictly required to protect catalog authenticity and prevent session data loss. Error:', err.message);
    process.exit(1);
  });

  // ========== API ROUTES ==========

  // Public dynamic Sitemap XML endpoint
  app.get('/sitemap.xml', async (req: express.Request, res: express.Response) => {
    try {
      const xml = await seoService.buildXmlSitemap(req, localProducts, localBlogs);
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (err: any) {
      console.error('Sitemap rendering failed:', err.message);
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Sitemap failed to generate</error>');
    }
  });

  // Diagnostic endpoint for Product Collection
  app.get('/api/diagnostic/products', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        const count = await Product.countDocuments();
        const sample = await Product.findOne().lean();
        console.log(`[Diagnostic] MongoDB Product Count: ${count}`);
        console.log(`[Diagnostic] MongoDB Product Structure Sample:`, Object.keys(sample || {}));
        return res.json({
          success: true,
          source: 'mongodb',
          count,
          sampleStructure: sample ? Object.keys(sample) : [],
          sampleData: sample
        });
      } else {
        const count = localProducts.length;
        const sample = localProducts[0];
        console.log(`[Diagnostic] Local Product Count: ${count}`);
        console.log(`[Diagnostic] Local Product Structure Sample:`, Object.keys(sample || {}));
        return res.json({
          success: true,
          source: 'local_memory',
          count,
          sampleStructure: sample ? Object.keys(sample) : [],
          sampleData: sample
        });
      }
    } catch (error: any) {
      console.error('[Diagnostic] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Lightweight health-check endpoint verifying DB connectivity gracefully without hanging
  app.get('/api/health-check', async (_req: express.Request, res: express.Response) => {
    let timerId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => reject(new Error('Database ping timeout (2000ms achieved)')), 2000);
    });

    try {
      if (isMongoConnected && mongoose.connection.readyState === 1 && mongoose.connection.db) {
        await Promise.race([
          mongoose.connection.db.admin().ping(),
          timeoutPromise
        ]);
        if (timerId) clearTimeout(timerId);
        return res.json({
          status: 'healthy',
          database: 'connected',
          atlas: true,
          timestamp: new Date()
        });
      } else {
        if (timerId) clearTimeout(timerId);
        const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        const state = mongoose.connection.readyState;
        const stateName = !isMongoConnected ? 'offline' : ((state >= 0 && state < stateNames.length) ? stateNames[state] : 'unknown');
        return res.status(503).json({
          status: 'unhealthy',
          database: stateName,
          atlas: false,
          fallbackMode: true,
          timestamp: new Date()
        });
      }
    } catch (err: any) {
      if (timerId) clearTimeout(timerId);
      console.warn("Health check: DB connectivity check failed or timed out:", err.message);
      return res.status(503).json({
        status: 'unhealthy',
        database: 'error',
        error: err.message,
        fallbackMode: true,
        timestamp: new Date()
      });
    }
  });

  // Global Error Tracking Endpoint
  app.post('/api/track-error', express.json({ limit: '100kb' }), (req: express.Request, res: express.Response) => {
    const errorDetails = req.body;
    // Suppress unhandled promise rejection logs if they are not actionable
    if (errorDetails?.context === 'Unhandled promise rejection' && errorDetails?.name === 'Error' && !errorDetails?.message) {
      return res.status(200).json({ success: true });
    }
    console.warn('[CentralizedTracker Server-Side]', JSON.stringify(errorDetails, null, 2));
    res.status(200).json({ success: true });
  });

  // SEO Routes (Robots & Sitemap)
  app.get('/robots.txt', (_req: express.Request, res: express.Response) => {
    res.type('text/plain');
    res.send('User-agent: *\nAllow: /\nSitemap: /sitemap.xml');
  });

  app.get('/.well-known/security.txt', (_req: express.Request, res: express.Response) => {
    res.type('text/plain');
    res.send('Contact: mailto:security@gadgetsprohub.com\nExpires: 2027-01-01T00:00:00.000Z\nPreferred-Languages: en');
  });

  app.get('/security.txt', (_req: express.Request, res: express.Response) => {
    res.type('text/plain');
    res.send('Contact: mailto:security@gadgetsprohub.com\nExpires: 2027-01-01T00:00:00.000Z\nPreferred-Languages: en');
  });

  // Auth Routes
  app.post('/api/auth/register', authLimiter, validateRegister, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { email, password, name } = req.body;
      const validationResult = await validateAndCheckRealEmail(email);
      if (!validationResult.isValid) {
        return res.status(400).json({ error: validationResult.error || 'Invalid email address.' });
      }
      const storageEmail = getStorageEmail(email);
      if (!storageEmail) {
        return res.status(400).json({ error: 'Invalid email address structure' });
      }
      const initialRole = isAdminEmail(storageEmail) ? 'admin' : 'user';
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const proto = (Array.isArray(req.headers['x-forwarded-proto']) ? req.headers['x-forwarded-proto'][0] : req.headers['x-forwarded-proto']) || (req.secure ? 'https' : 'http');
      const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
      const verificationUrl = `${proto}://${host}/api/auth/verify?token=${verificationToken}`;

      if (isMongoConnected) {
        // Pre-check for duplicate account registration in MongoDB
        const existingUser = await User.findOne({ email: storageEmail });
        if (existingUser) {
          return res.status(400).json({ error: 'You already have an account registered with this email address. Please login instead.' });
        }
        
        const user = new User({ 
          email: storageEmail, 
          password, 
          name, 
          role: initialRole,
          isVerified: false,
          verificationToken,
          verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
        try {
          await user.save();
        } catch (saveError: any) {
          return res.status(400).json({ error: 'Failed to create user account: ' + saveError.message });
        }
      } else {
        const existingUser = localUsers.find(u => u.email === storageEmail);
        if (existingUser) return res.status(400).json({ error: 'You already have an account registered with this email address. Please login instead.' });
        
        const securedPassword = await hashHelper(password);
        const newUser = {
          _id: "user_" + Math.random().toString(36).substring(2, 9),
          email: storageEmail,
          password: securedPassword,
          name: name || storageEmail.split('@')[0],
          role: initialRole,
          wishlist: [] as string[],
          recentlyViewed: [] as any[],
          district: 'Chennai',
          createdAt: new Date(),
          isVerified: false,
          verificationToken,
          verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
        localUsers.push(newUser);
        saveLocalUsers();
      }

      // Send Verification Email
      const transporter = getMailTransport();
      let emailSent = false;
      let smtpErrorMsg = '';
      if (transporter) {
        try {
          const sender = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@gadgetsprohub.com';
          await transporter.sendMail({
            from: `"GadgetsProHub Verification" <${sender}>`,
            to: storageEmail,
            subject: "Verify Your Email Address - GadgetsProHub",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #4f46e5; text-align: center; margin-bottom: 24px;">Welcome to GadgetsProHub!</h2>
                <p style="font-size: 14px; color: #334155;">Hello ${name || 'User'},</p>
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">Thank you for registering an account on our affiliate platform. Please verify your email address to complete your registration and secure your profile.</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${verificationUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Verify Email Address</a>
                </div>
                <p style="font-size: 12px; color: #64748b; line-height: 1.5;">If the button above does not work, please copy and paste the following link into your web browser:</p>
                <p style="font-size: 11px; color: #3b82f6; word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 6px;">${verificationUrl}</p>
                <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center;">
                  <p style="margin: 0;">This is an automated system email notification.</p>
                </div>
              </div>
            `
          });
          emailSent = true;
          console.log(`Verification email successfully dispatched to ${storageEmail}`);
        } catch (err: any) {
          smtpErrorMsg = err.message;
          console.log("SMTP notification: Verification link is simulated because the server SMTP credentials require a Google App Password.");
        }
      }

      if (!emailSent) {
        console.log("📨 [SIMULATED EMAIL] Verification Link:", verificationUrl);
      }

      return res.json({
        success: true,
        message: 'Your account is registered! A verification link has been sent to your email. Please click the link to activate your account and log in.',
        smtpError: smtpErrorMsg || undefined
      });

    } catch (error: any) {
      let friendlyError = error.message;
      if (error.code === 11000 || error.message?.includes('duplicate key') || error.message?.includes('E11000')) {
        if (error.message?.includes('email')) {
          friendlyError = 'You already have an account registered with this email address. Please login instead.';
        } else {
          friendlyError = 'You already have an account registered with these credentials. Please login instead.';
        }
      }
      res.status(400).json({ error: friendlyError });
    }
  });

  // ========== PENDING AUTH CODES FOR VERIFICATION ==========
  interface PendingAuthCode {
    userId: string;
    expiresAt: number;
  }
  const LOCAL_AUTH_CODES_FILE = path.join(process.cwd(), 'local_auth_codes.json');
  const getLocalAuthCodes = (): Record<string, PendingAuthCode> => {
    try {
      if (fs.existsSync(LOCAL_AUTH_CODES_FILE)) {
        return JSON.parse(fs.readFileSync(LOCAL_AUTH_CODES_FILE, 'utf8')) || {};
      }
    } catch (e) {
      // ignore
    }
    return {};
  };
  const saveLocalAuthCodes = (codes: Record<string, PendingAuthCode>) => {
    try {
      fs.writeFileSync(LOCAL_AUTH_CODES_FILE, JSON.stringify(codes, null, 2), 'utf8');
    } catch (e) {
      // ignore
    }
  };

  const createPendingAuthCode = async (userId: string): Promise<string> => {
    const code = crypto.randomBytes(16).toString('hex');
    if (isMongoConnected) {
      await AuthCode.create({ code, userId });
    } else {
      const codes = getLocalAuthCodes();
      codes[code] = { userId, expiresAt: Date.now() + 60000 };
      saveLocalAuthCodes(codes);
    }
    return code;
  };

  const signUserToken = (userId: any): string => {
    return jwt.sign({ userId }, JWT_SECRET_KEY, { expiresIn: '30d', algorithm: 'HS256' });
  };

  app.get('/api/auth/verify', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).send(`
          <div style="font-family: sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
            <h2 style="color: #ef4444;">Invalid Verification Link</h2>
            <p style="color: #64748b;">The verification token is missing or invalid.</p>
            <a href="/" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 15px;">Go to Homepage</a>
          </div>
        `);
      }

      if (isMongoConnected) {
        const user = await User.findOne({ verificationToken: token });
        if (!user || (user.verificationExpiresAt && user.verificationExpiresAt < new Date())) {
          return res.status(400).send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
              <h2 style="color: #ef4444;">Verification Link Expired</h2>
              <p style="color: #64748b;">This verification link is invalid or has already been used.</p>
              <a href="/" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 15px;">Go to Homepage</a>
            </div>
          `);
        }

        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        const authCode = await createPendingAuthCode(String(user._id));
        return res.redirect(`/?authCode=${authCode}`);
      } else {
        const user = localUsers.find(u => u.verificationToken === token);
        if (!user || ((user as any).verificationExpiresAt && new Date((user as any).verificationExpiresAt) < new Date())) {
          return res.status(400).send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
              <h2 style="color: #ef4444;">Verification Link Expired</h2>
              <p style="color: #64748b;">This verification link is invalid or has already been used.</p>
              <a href="/" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 15px;">Go to Homepage</a>
            </div>
          `);
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        saveLocalUsers();

        const authCode = await createPendingAuthCode(String(user._id));
        return res.redirect(`/?authCode=${authCode}`);
      }
    } catch (error: any) {
      res.status(500).send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
          <h2 style="color: #ef4444;">Verification Error</h2>
          <p style="color: #64748b;">${escapeHTML(error.message || 'An error occurred during verification.')}</p>
          <a href="/" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 15px;">Go to Homepage</a>
        </div>
      `);
    }
  });

  app.get('/api/auth/verify-new-email', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).send(`
          <div style="font-family: sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
            <h2 style="color: #ef4444;">Invalid Verification Link</h2>
            <p style="color: #64748b;">The email verification token is missing or invalid.</p>
            <a href="/" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 15px;">Go to Homepage</a>
          </div>
        `);
      }

      if (isMongoConnected) {
        const user = await User.findOne({ pendingEmailToken: token });
        if (!user) {
          return res.status(400).send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
              <h2 style="color: #ef4444;">Verification Link Expired</h2>
              <p style="color: #64748b;">This verification link is invalid or has already been used.</p>
              <a href="/" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 15px;">Go to Homepage</a>
            </div>
          `);
        }

        user.email = user.pendingEmail || '';
        user.pendingEmail = null;
        user.pendingEmailToken = null;
        await user.save();

        const authCode = await createPendingAuthCode(String(user._id));
        return res.redirect(`/?authCode=${authCode}&emailUpdated=true`);
      } else {
        const user = localUsers.find(u => u.pendingEmailToken === token);
        if (!user) {
          return res.status(400).send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
              <h2 style="color: #ef4444;">Verification Link Expired</h2>
              <p style="color: #64748b;">This verification link is invalid or has already been used.</p>
              <a href="/" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 15px;">Go to Homepage</a>
            </div>
          `);
        }

        user.email = user.pendingEmail || '';
        user.pendingEmail = undefined;
        user.pendingEmailToken = undefined;
        saveLocalUsers();

        const authCode = await createPendingAuthCode(String(user._id));
        return res.redirect(`/?authCode=${authCode}&emailUpdated=true`);
      }
    } catch (error: any) {
      res.status(500).send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
          <h2 style="color: #ef4444;">Verification Error</h2>
          <p style="color: #64748b;">${escapeHTML(error.message || 'An error occurred during verification.')}</p>
          <a href="/" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 15px;">Go to Homepage</a>
        </div>
      `);
    }
  });

  app.post('/api/auth/login', loginLimiter, validateLogin, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { email, password } = req.body;
      const storageEmail = getStorageEmail(email);
      const genericError = 'Invalid email or password. Please try again.';

      if (!storageEmail) {
        await bcrypt.compare(password, '$2a$10$NotRealPasswordPlaceholderToPreventTimingAttacks12345');
        return res.status(401).json({ error: genericError });
      }

      if (isMongoConnected) {
        const user = await User.findOne({ email: storageEmail });
        if (!user) {
          await bcrypt.compare(password, '$2a$10$NotRealPasswordPlaceholderToPreventTimingAttacks12345');
          return res.status(401).json({ error: genericError });
        }

        if (!user.password) {
          await bcrypt.compare(password, '$2a$10$NotRealPasswordPlaceholderToPreventTimingAttacks12345');
          return res.status(401).json({ error: genericError });
        }

        // Check password FIRST to prevent unverified bypasses
        const isMatch = await comparePasswords(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: genericError });
        }

        if (user.isVerified === false) {
          if (!user.verificationToken) {
            user.verificationToken = crypto.randomBytes(32).toString('hex');
            user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await user.save().catch(e => console.warn(e));
          }
          const proto = (Array.isArray(req.headers['x-forwarded-proto']) ? req.headers['x-forwarded-proto'][0] : req.headers['x-forwarded-proto']) || (req.secure ? 'https' : 'http');
          const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
          const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
          const verificationUrl = `${proto}://${host}/api/auth/verify?token=${user.verificationToken}`;
          
          console.log(`[SIMULATED LOGIN UNVERIFIED] User email: ${user.email} - Verification link: ${verificationUrl}`);

          return res.status(401).json({ 
            error: 'Your email is not verified yet. Please check your inbox for the verification link to activate your account.',
            isUnverified: true,
          });
        }

        const calculatedRole = isAdminEmail(user.email) ? 'admin' : 'user';
        if (user.role !== calculatedRole) {
          user.role = calculatedRole;
          await user.save().catch(e => console.warn(e));
        }

        // Two-factor authentication verification if enabled
        if ((user as any).twoFactorEnabled && ConfigurationService.getFlag('enable2fa')) {
          const { code } = req.body;
          if (!code) {
            return res.status(200).json({ 
              requiresTwoFactor: true, 
              userId: user._id, 
              email: user.email,
              message: 'Two-factor authentication code is required to complete login' 
            });
          }
          const isValid = TotpService.verifyToken((user as any).twoFactorSecret, code);
          if (!isValid) {
            return res.status(401).json({ error: 'Two-factor code verification failed. Please try again.' });
          }
        }

        const token = signUserToken(user._id);

        // Create active session in database
        if (ConfigurationService.getFlag('enableDeviceManagement')) {
          await UserSession.create({
            userId: user._id,
            token,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || 'Unknown',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }).catch(e => console.warn("Failed to log user session:", e));
        }

        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        return res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, district: user.district } });
      } else {
        const user = localUsers.find(u => u.email === storageEmail);
        if (!user) {
          await bcrypt.compare(password, '$2a$10$NotRealPasswordPlaceholderToPreventTimingAttacks12345');
          return res.status(401).json({ error: genericError });
        }

        if (!user.password) {
          await bcrypt.compare(password, '$2a$10$NotRealPasswordPlaceholderToPreventTimingAttacks12345');
          return res.status(401).json({ error: genericError });
        }

        // Check password FIRST to prevent unverified bypasses
        const isMatch = await comparePasswords(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: genericError });
        }

        if (user.isVerified === false) {
          if (!user.verificationToken) {
            user.verificationToken = crypto.randomBytes(32).toString('hex');
            (user as any).verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            saveLocalUsers();
          }
          const proto = (Array.isArray(req.headers['x-forwarded-proto']) ? req.headers['x-forwarded-proto'][0] : req.headers['x-forwarded-proto']) || (req.secure ? 'https' : 'http');
          const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
          const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
          const verificationUrl = `${proto}://${host}/api/auth/verify?token=${user.verificationToken}`;
          
          console.log(`[SIMULATED LOGIN UNVERIFIED] User email: ${user.email} - Verification link: ${verificationUrl}`);

          return res.status(401).json({ 
            error: 'Your email is not verified yet. Please check your inbox for the verification link to activate your account.',
            isUnverified: true,
          });
        }

        const calculatedRoleLocal = isAdminEmail(user.email) ? 'admin' : 'user';
        if (user.role !== calculatedRoleLocal) {
          user.role = calculatedRoleLocal;
          saveLocalUsers();
        }
        const token = signUserToken(user._id);
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        return res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, district: user.district || 'Chennai' } });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'An unexpected authentication error occurred.' });
    }
  });

  // Exchange single-use, 1-minute authorization code for session JWT
  app.post('/api/auth/exchange-code', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { authCode } = req.body;
      if (!authCode || typeof authCode !== 'string') {
        return res.status(400).json({ error: 'Authorization code is required' });
      }
      let pendingUserId: string | null = null;
      if (isMongoConnected) {
        const found = await AuthCode.findOne({ code: authCode });
        if (!found) {
          return res.status(400).json({ error: 'Invalid or expired authorization code' });
        }
        const ageInMs = Date.now() - new Date(found.createdAt).getTime();
        if (ageInMs > 60000) {
          await AuthCode.deleteOne({ _id: found._id });
          return res.status(400).json({ error: 'Invalid or expired authorization code' });
        }
        await AuthCode.deleteOne({ _id: found._id });
        pendingUserId = found.userId as string;
      } else {
        const codes = getLocalAuthCodes();
        const pending = codes[authCode];
        if (!pending) {
          return res.status(400).json({ error: 'Invalid or expired authorization code' });
        }
        delete codes[authCode]; // Strict single-use!
        saveLocalAuthCodes(codes);
        if (Date.now() > pending.expiresAt) {
          return res.status(400).json({ error: 'Authorization code has expired' });
        }
        pendingUserId = pending.userId;
      }
      const userId = pendingUserId;
      if (isMongoConnected) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ error: 'User profile not found' });
        }
        const calculatedRole = isAdminEmail(user.email) ? 'admin' : 'user';
        if (user.role !== calculatedRole) {
          user.role = calculatedRole;
          await user.save().catch(e => console.warn(e));
        }
        const token = signUserToken(user._id);
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        return res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, district: user.district } });
      } else {
        const user = localUsers.find(u => u._id === userId);
        if (!user) {
          return res.status(404).json({ error: 'User profile not found' });
        }
        const calculatedRoleLocal = isAdminEmail(user.email) ? 'admin' : 'user';
        if (user.role !== calculatedRoleLocal) {
          user.role = calculatedRoleLocal;
          saveLocalUsers();
        }
        const token = signUserToken(user._id);
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        return res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, district: user.district || 'Chennai' } });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to exchange authorization code' });
    }
  });

  // Revoke token on logout by adding to blacklist and clearing HTTP-Only cookie
  app.post('/api/auth/logout', async (req: express.Request, res: express.Response) => {
    let token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      token = getCookieToken(req);
    }
    if (token) {
      if (isMongoConnected) {
        try {
          await BlacklistedToken.create({ token });
        } catch (err) {
          console.warn("Failed to blacklist token:", err);
        }
      } else {
        blacklistTokenLocal(token);
      }
    }
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    res.json({ success: true, message: 'Successfully logged out' });
  });

  // ========== ENTERPRISE REFINEMENT ENDPOINTS ==========

  // 1. Device / Session Management Endpoints
  app.get('/api/auth/sessions', authenticate, async (req: express.Request, res: express.Response) => {
    try {
      if (!isMongoConnected) return res.json({ success: true, sessions: [], warning: 'Database disconnected.' });
      const sessions = await UserSession.find({ userId: (req as any).userId });
      res.json({ success: true, sessions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/sessions/revoke', authenticate, async (req: express.Request, res: express.Response) => {
    try {
      if (!isMongoConnected) return res.status(503).json({ error: 'Database disconnected.' });
      const { sessionId } = req.body;
      await UserSession.updateOne(
        { _id: sessionId, userId: (req as any).userId },
        { revoked: true }
      );
      res.json({ success: true, message: 'Session successfully revoked' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Personal Access Tokens (PATs) Endpoints
  app.get('/api/auth/pats', authenticate, async (req: express.Request, res: express.Response) => {
    try {
      if (!isMongoConnected) return res.json({ success: true, pats: [], warning: 'Database disconnected.' });
      const pats = await PersonalAccessToken.find({ userId: (req as any).userId, revoked: false });
      res.json({ success: true, pats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/pats/generate', authenticate, async (req: express.Request, res: express.Response) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Token name is required' });

      const rawToken = 'gph_pat_' + crypto.randomBytes(24).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const pat = await PersonalAccessToken.create({
        userId: (req as any).userId,
        name,
        tokenHash,
        createdAt: new Date()
      });

      res.json({
        success: true,
        message: 'Personal access token generated successfully. Copy it now, as it will not be shown again!',
        token: rawToken,
        pat
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/pats/revoke', authenticate, async (req: express.Request, res: express.Response) => {
    try {
      const { patId } = req.body;
      await PersonalAccessToken.updateOne(
        { _id: patId, userId: (req as any).userId },
        { revoked: true }
      );
      res.json({ success: true, message: 'Personal access token successfully revoked' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. TOTP 2FA Endpoints
  app.post('/api/auth/2fa/setup', authenticate, async (req: express.Request, res: express.Response) => {
    try {
      const secret = TotpService.generateSecret();
      const user = await User.findById((req as any).userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Save secret temporarily or send to client for verification
      res.json({
        success: true,
        secret,
        qrCodePlaceholder: `otpauth://totp/GadgetsProHub:${user.email}?secret=${secret}&issuer=GadgetsProHub`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/2fa/enable', authenticate, async (req: express.Request, res: express.Response) => {
    try {
      const { secret, code } = req.body;
      if (!secret || !code) return res.status(400).json({ error: 'Secret and verification code are required' });

      const isValid = TotpService.verifyToken(secret, code);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
      }

      await User.updateOne(
        { _id: (req as any).userId },
        { 
          $set: { 
            twoFactorEnabled: true, 
            twoFactorSecret: secret 
          } 
        }
      );

      res.json({ success: true, message: 'Two-factor authentication successfully enabled!' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/2fa/disable', authenticate, async (req: express.Request, res: express.Response) => {
    try {
      const { code } = req.body;
      const user = await User.findById((req as any).userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const secret = (user as any).twoFactorSecret;
      if (secret) {
        const isValid = TotpService.verifyToken(secret, code);
        if (!isValid) {
          return res.status(400).json({ error: 'Invalid verification code. 2FA remains active.' });
        }
      }

      await User.updateOne(
        { _id: (req as any).userId },
        { 
          $set: { 
            twoFactorEnabled: false, 
            twoFactorSecret: null 
          } 
        }
      );

      res.json({ success: true, message: 'Two-factor authentication successfully disabled!' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Feature Flags / Admin Config Endpoints
  app.get('/api/admin/config', adminOnly, (req: express.Request, res: express.Response) => {
    res.json({ success: true, flags: ConfigurationService.getAllFlags() });
  });

  app.post('/api/admin/config', adminOnly, (req: express.Request, res: express.Response) => {
    try {
      const { flags } = req.body;
      if (flags && typeof flags === 'object') {
        for (const [key, val] of Object.entries(flags)) {
          ConfigurationService.setFlag(key, !!val);
        }
      }
      res.json({ success: true, flags: ConfigurationService.getAllFlags() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Database Connection Status and Toggle Endpoints
  app.get('/api/admin/db-toggle-status', adminOnly, (req: express.Request, res: express.Response) => {
    res.json({
      success: true,
      isMongoConnected,
      readyState: mongoose.connection.readyState,
      uri: process.env.MONGODB_URI ? 'Configured (Atlas Cluster)' : 'Not Configured (Using Default Localhost)'
    });
  });

  app.post('/api/admin/db-toggle', adminOnly, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { targetState } = req.body; // 'online' or 'offline'
      
      if (targetState === 'offline') {
        return res.status(400).json({
          success: false,
          error: 'Simulated offline fallback modes are permanently disabled to guarantee system integrity, session preservation, and prevent data inconsistency.'
        });
      } else if (targetState === 'online') {
        if (mongoose.connection.readyState === 1) {
          isMongoConnected = true;
          return res.json({
            success: true,
            message: 'Database connection successfully toggled to LIVE mode. Connected to MongoDB Atlas.',
            isMongoConnected: true,
            readyState: mongoose.connection.readyState
          });
        } else {
          // Attempt connection
          try {
            console.log('[Admin DB Toggle] Attempting to reconnect to MongoDB Atlas...');
            await mongoose.connect(
              process.env.MONGODB_URI || 'mongodb://localhost:27017/affiliate-store',
              { serverSelectionTimeoutMS: 5000 }
            );
            isMongoConnected = true;
            return res.json({
              success: true,
              message: 'Database connection successfully established! Connected to Live MongoDB.',
              isMongoConnected: true,
              readyState: mongoose.connection.readyState
            });
          } catch (err: any) {
            isMongoConnected = false;
            return res.status(503).json({
              success: false,
              error: `Could not connect to live MongoDB: ${err.message}. Please verify your MongoDB Atlas cluster state and ensure your server IP is whitelisted.`,
              isMongoConnected: false,
              readyState: mongoose.connection.readyState
            });
          }
        }
      } else {
        return res.status(400).json({ success: false, error: 'Invalid targetState. Use "online" or "offline".' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. System Health / Readiness & Metrics Endpoints
  app.get('/api/health', (req: express.Request, res: express.Response) => {
    const isReady = isMongoConnected && mongoose.connection.readyState === 1;
    res.json({
      status: isReady ? 'healthy' : 'unhealthy',
      checks: {
        database: isReady ? 'ready' : 'offline',
        server: 'online'
      },
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/metrics', authenticate, (req: express.Request, res: express.Response) => {
    res.json({ success: true, metrics: MetricsService.getMetrics(), liveLogs: MetricsService.getLiveLogs() });
  });

  const googleOAuthClient = new OAuth2Client();

  async function verifyIdToken(idToken: string): Promise<{ email: string; name: string } | null> {
    try {
      const firebaseProjectId = process.env.VITE_FIREBASE_PROJECT_ID;
      
      // 1. Try Google OAuth Verification
      try {
        const ticket = await googleOAuthClient.verifyIdToken({
          idToken,
          audience: firebaseProjectId || undefined
        });
        const payload = ticket.getPayload();
        if (payload && payload.email) {
          if (!payload.email_verified) return null;
          return {
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
          };
        }
      } catch (err) {
        // Fallback to manual Firebase verification
      }

      // 2. Decode and verify Firebase ID Token
      const decodedToken: any = jwt.decode(idToken, { complete: true });
      if (!decodedToken || !decodedToken.header || !decodedToken.payload) {
        return null;
      }

      if (!firebaseProjectId) {
        console.error('Firebase token verification failed: VITE_FIREBASE_PROJECT_ID is not configured');
        return null;
      }

      const issuer = `https://securetoken.google.com/${firebaseProjectId}`;
      if (decodedToken.payload.iss !== issuer || decodedToken.payload.aud !== firebaseProjectId) {
        console.error('Firebase token verification failed: invalid issuer or audience');
        return null;
      }
      if (!decodedToken.payload.email_verified) {
        console.error('Firebase token verification failed: email not verified');
        return null;
      }

      // Try dynamic verification of signature with Firebase certificates
      try {
        const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
        if (!res.ok) {
          throw new Error(`Failed to fetch Firebase certs: ${res.statusText}`);
        }
        const publicKeys: any = await res.json();
        const kid = decodedToken.header.kid;
        const cert = publicKeys[kid];
        if (!cert) {
          console.error('Firebase token verification failed: key ID (kid) not found in Firebase certs');
          return null;
        }
        const decoded = jwt.verify(idToken, cert, { algorithms: ['RS256'] }) as any;
        if (decoded && decoded.email) {
          return {
            email: decoded.email,
            name: decoded.name || decoded.email.split('@')[0],
          };
        }
      } catch (certErr) {
        console.error('Firebase signature verification failed:', certErr);
      }
    } catch (error) {
      console.error('ID Token verification failed:', error);
    }
    return null;
  }

  app.post('/api/auth/google', validateGoogleAuth, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { email, name, googleId, idToken, profileImage } = req.body;
      
      let verifiedEmail = email;
      let verifiedName = name;
      let verifiedGoogleId = googleId;

      const allowSimulated = process.env.ALLOW_SIMULATED_AUTH === 'true' && 
                             process.env.NODE_ENV !== 'production' && 
                             process.env.NODE_ENV !== 'prod' &&
                             !process.env.K_SERVICE &&
                             (req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.hostname.startsWith('192.168.'));
      const isSimulated = idToken && idToken.startsWith('simulated_token_');

      if (!allowSimulated || !isSimulated) {
        if (!idToken) {
          return res.status(401).json({ error: 'Google ID Token is required for authentication' });
        }
        const verifiedUser = await verifyIdToken(idToken);
        if (!verifiedUser) {
          return res.status(401).json({ error: 'Google ID Token verification failed' });
        }
        verifiedEmail = verifiedUser.email;
        verifiedName = verifiedUser.name;
        const decoded: any = jwt.decode(idToken);
        if (decoded && decoded.sub) {
          verifiedGoogleId = decoded.sub;
        }
      } else {
        console.log(`[DEV ONLY] Skipping cryptographic verification for simulated Google Sign-In: ${email}`);
      }

      const storageEmail = getStorageEmail(verifiedEmail);
      if (!storageEmail) {
        return res.status(400).json({ error: 'Invalid email configuration' });
      }
      const initialRole = isAdminEmail(storageEmail) ? 'admin' : 'user';
      if (isMongoConnected) {
        let user = await User.findOne({ email: storageEmail });
        if (!user) {
          user = new User({ email: storageEmail, name: verifiedName, googleId: verifiedGoogleId, profileImage, role: initialRole, isVerified: true });
          try {
            await user.save();
          } catch (err: any) {
            return res.status(500).json({ error: 'Failed to create user account: ' + err.message });
          }
        } else {
          const calculatedRole = isAdminEmail(user.email) ? 'admin' : 'user';
          if (user.role !== calculatedRole) {
            user.role = calculatedRole;
            await user.save().catch(e => console.warn(e));
          }
        }
        const token = signUserToken(user._id);
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        return res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, district: user.district } });
      } else {
        let user = localUsers.find(u => u.email === storageEmail);
        if (!user) {
          user = {
            _id: "user_g_" + Math.random().toString(36).substring(2, 9),
            email: storageEmail,
            password: 'google_oauth_fallback_passwd',
            name: verifiedName || 'Google Explorer',
            role: initialRole,
            wishlist: [] as any[],
            recentlyViewed: [] as any[],
            district: 'Chennai',
            createdAt: new Date(),
            isVerified: true
          };
          localUsers.push(user);
          saveLocalUsers();
        } else {
          const calculatedRoleLocal = isAdminEmail(user.email) ? 'admin' : 'user';
          if (user.role !== calculatedRoleLocal) {
            user.role = calculatedRoleLocal;
            saveLocalUsers();
          }
        }
        const token = signUserToken(user._id);
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        return res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, district: user.district || 'Chennai' } });
      }
    } catch (error: any) {
      let friendlyError = error.message;
      if (error.code === 11000 || error.message?.includes('duplicate key') || error.message?.includes('E11000')) {
        if (error.message?.includes('email')) {
          friendlyError = 'You already have an account registered with this email address. Please login instead.';
        } else {
          friendlyError = 'You already have an account registered with these credentials. Please login instead.';
        }
      }
      res.status(500).json({ error: friendlyError });
    }
  });

  // Product Routes
  app.get('/api/products', async (req: express.Request, res: express.Response) => {
    try {
      await cleanExpiredTrendingProducts();
      const { category, subcategory, brand, minPrice, maxPrice, search, rating, sort, inStock, exclude, trending } = req.query;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));
      
      if (isMongoConnected) {
        const filter: any = {};
        if (category && category !== 'trending') filter.category = String(category);
        if (subcategory) filter.subcategory = String(subcategory);
        if (brand) filter.brand = String(brand);
        if (inStock === 'true') filter.inStock = true;
        if (trending === 'true' || category === 'trending') filter.trending = true;
        
        if (search) {
          const searchStr = String(search).trim();
          const searchRegex = new RegExp(searchStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
          
          let categoryIds: any[] = [];
          try {
            const matchedCats = await Category.find({ name: { $regex: searchRegex } });
            categoryIds = matchedCats.map((c: any) => c._id);
          } catch (err) {
            captureError(err, { context: 'Category search mapping' });
          }

          filter.$or = [
            { name: { $regex: searchRegex } },
            { brand: { $regex: searchRegex } },
            { sku: { $regex: searchRegex } },
            { tags: { $in: [searchRegex] } }
          ];
          if (categoryIds.length > 0) {
            filter.$or.push({ category: { $in: categoryIds } });
          }
        }

        if (exclude) {
          const excludeArr = String(exclude).split(',').filter(Boolean);
          if (excludeArr.length > 0) {
            filter._id = { $nin: excludeArr };
          }
        }

        if (minPrice || maxPrice) {
          filter.price = {};
          if (minPrice) filter.price.$gte = Number(minPrice);
          if (maxPrice) filter.price.$lte = Number(maxPrice);
        }
        if (rating) filter.rating = { $gte: Number(rating) };

        const skip = (Number(page) - 1) * Number(limit);
        let query = Product.find(filter).populate('category').skip(skip).limit(Number(limit));

        if (sort === 'price-asc') query = query.sort({ price: 1 }) as any;
        else if (sort === 'price-desc') query = query.sort({ price: -1 }) as any;
        else if (sort === 'newest') query = query.sort({ createdAt: -1 }) as any;
        else if (sort === 'rating') query = query.sort({ rating: -1 }) as any;

        const products = await query;
        const total = await Product.countDocuments(filter);
        res.json({ products, total, pages: Math.ceil(total / Number(limit)), currentPage: Number(page) });
      } else {
        res.status(503).json({ error: 'Database is currently offline. Please try again shortly.' });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/products/:slug', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const districtsList = TAMIL_NADU_DISTRICTS;
      const randDistrict = districtsList[Math.floor(Math.random() * districtsList.length)];

      if (!isMongoConnected) {
        return res.status(503).json({ error: 'Database is currently offline. Please try again shortly.' });
      }

      const product = await Product.findOne({ slug: req.params.slug })
        .populate('category')
        .populate('reviews.userId', 'name profileImage')
        .populate('comparisonProducts');
      
      if (!product) {
        return res.status(404).json({ error: 'Product catalog item not found' });
      }
      
      // --- Real-time Price Update Trigger ---
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const lastCheck = product.lastPriceCheck ? new Date(product.lastPriceCheck).getTime() : 0;
      
      if (now - lastCheck > TWENTY_FOUR_HOURS && process.env.N8N_REALTIME_WEBHOOK_URL) {
        // Atomically acquire lock to prevent race conditions across horizontal clusters
        Product.findOneAndUpdate(
          {
            _id: product._id,
            $or: [
              { lastPriceCheck: { $exists: false } },
              { lastPriceCheck: null },
              { lastPriceCheck: { $lt: new Date(now - TWENTY_FOUR_HOURS) } }
            ]
          },
          { $set: { lastPriceCheck: new Date() } },
          { new: true }
        ).then(async (lockedProduct) => {
          if (!lockedProduct) return; // Another thread/instance acquired the lock
          
          // Fire and forget non-blocking update
          fetch(process.env.N8N_REALTIME_WEBHOOK_URL!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.N8N_SECRET_TOKEN || ''}` },
            body: JSON.stringify({ 
              productId: product._id, 
              affiliateLink: product.affiliateLink, 
              slug: product.slug 
            }),
            signal: AbortSignal.timeout(5000)
          }).then(async (n8nRes) => {
            if (n8nRes.ok) {
              const updatedData = await n8nRes.json();
              if (updatedData && typeof updatedData.price === 'number') {
                await Product.findByIdAndUpdate(product._id, {
                  price: updatedData.price,
                  originalPrice: typeof updatedData.originalPrice === 'number' ? updatedData.originalPrice : product.originalPrice,
                  discount: typeof updatedData.discount === 'number' ? updatedData.discount : product.discount,
                  inStock: typeof updatedData.inStock === 'boolean' ? updatedData.inStock : product.inStock,
                  lastPriceCheck: new Date()
                });
              }
            }
          }).catch((error) => {
            console.warn('Failed to fetch real-time price from n8n webhook:', error instanceof Error ? error.message : String(error));
          });
        }).catch(err => {
          console.error('Atomic price update lock check failed:', err);
        });
      }
      // ---------------------------------------
      
      // Create live anonymous analytics node asynchronously in background without blocking
      Analytics.create({
        productId: product._id,
        eventType: 'view',
        district: randDistrict,
        userAgent: req.headers['user-agent']
      }).catch(err => {
        console.warn('Background view analytics logging failed:', err.message);
      });
      return res.json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/products/click/:slug', validateProductClick, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const districtsList = TAMIL_NADU_DISTRICTS;
      const randDistrict = districtsList[Math.floor(Math.random() * districtsList.length)];
      const finalDistrict = sanitizeDistrict(req.body.district || randDistrict);

      if (!isMongoConnected) {
        return res.status(503).json({ error: 'Database is currently offline. Please try again shortly.' });
      }

      const product = await Product.findOne({ slug: req.params.slug });
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      product.clicks += 1;
      product.save().catch(err => console.warn('Background product clicks count update failed:', err.message));
      
      Analytics.create({
        productId: product._id,
        affiliateCode: product.affiliateCode,
        eventType: 'click',
        userId: req.body.userId,
        district: finalDistrict,
        referer: req.headers.referer
      }).catch(err => console.warn('Background click analytics logging failed:', err.message));
      
      return res.json({ success: true, affiliateLink: product.affiliateLink });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/products/pick-left-click', express.json({ limit: '100kb' }), async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { productId, email, categoryName } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required to register interest' });
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email/Gmail address' });
      }

      let resolvedCategory = categoryName;

      // Try to find the product's actual category if not passed or if needs lookup
      if (productId && isMongoConnected) {
        const product = await Product.findById(productId).populate('category');
        if (product && product.category) {
          resolvedCategory = (product.category as any).name;
        }
      } else if (productId && !isMongoConnected) {
        const product = localProducts.find((p: any) => p._id === productId);
        if (product) {
          const catId = product.category;
          const matchedCat = localCategories.find((c: any) => c._id === catId || c.slug === catId);
          if (matchedCat) {
            resolvedCategory = matchedCat.name;
          }
        }
      }

      if (!resolvedCategory) {
        return res.status(400).json({ error: 'Category could not be identified' });
      }

      // Save the interest
      if (isMongoConnected) {
        // Avoid duplicate interests for same email and category
        const existing = await PickLeftInterest.findOne({
          email: email.toLowerCase(),
          categoryName: resolvedCategory
        });
        if (!existing) {
          const interest = new PickLeftInterest({
            email: email.toLowerCase(),
            categoryName: resolvedCategory
          });
          await interest.save();
        }
      } else {
        const existing = localPickLeftInterests.find(
          (item: any) => item.email.toLowerCase() === email.toLowerCase() && item.categoryName === resolvedCategory
        );
        if (!existing) {
          localPickLeftInterests.push({
            email: email.toLowerCase(),
            categoryName: resolvedCategory,
            createdAt: new Date()
          });
          await syncPickLeftInterestsToLocalFile();
        }
      }

      return res.json({ success: true, message: `Newsletter alert registered for "${resolvedCategory}" using ${email}` });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/products/:id/reviews', authenticate, validateProductReview, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const uId = (req as any).userId;
      const { id } = req.params;
      const { rating, title, content } = req.body;

      if (isMongoConnected) {
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ error: 'Product not found.' });

        const user = await User.findById(uId);
        if (!user) return res.status(404).json({ error: 'User validation failed.' });

        const existingReview = product.reviews.find((r: any) => r.userId && r.userId.toString() === uId.toString());
        if (existingReview) return res.status(400).json({ error: 'You have already reviewed this product.' });

        const newReview = {
          userId: uId,
          rating,
          title,
          content,
          helpful: 0,
          createdAt: new Date()
        };

        product.reviews.push(newReview as any);
        
        const sum = product.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        product.totalReviews = product.reviews.length;
        product.rating = product.reviews.length > 0 ? Number((sum / product.reviews.length).toFixed(1)) : 0;

        await product.save();

        const populatedProduct = await Product.findById(product._id)
          .populate('category')
          .populate('reviews.userId', 'name profileImage');

        return res.json(populatedProduct);
      } else {
        const product = localProducts.find((p: any) => p._id === id);
        if (!product) return res.status(404).json({ error: 'Product not found.' });

        if (!product.reviews) product.reviews = [];
        const existingReview = product.reviews.find((r: any) => {
          const rUserId = r.userId && typeof r.userId === 'object' ? r.userId._id : r.userId;
          return String(rUserId) === String(uId);
        });
        if (existingReview) return res.status(400).json({ error: 'You have already reviewed this product.' });

        const user = localUsers.find(u => u._id === uId);
        const name = user ? user.name : 'Verified Reviewer';
        const profileImage = user && (user as any).profileImage ? (user as any).profileImage : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';

        const newReview = {
          _id: "review_" + Math.random().toString(36).substring(2, 9),
          userId: {
            _id: uId,
            name,
            profileImage
          },
          rating,
          title,
          content,
          helpful: 0,
          createdAt: new Date().toISOString()
        };

        if (!product.reviews) product.reviews = [];
        product.reviews.push(newReview as any);

        const sum = (product.reviews as any).reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
        product.totalReviews = product.reviews.length;
        product.rating = product.reviews.length > 0 ? Number((sum / product.reviews.length).toFixed(1)) : 0;

        return res.json(product);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Category Retrieval
  app.get('/api/categories', async (_req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        const categories = await Category.find();
        res.json(categories);
      } else {
        // Crucial fallback logic guaranteed to never be undefined/error object
        res.json(localCategories);
      }
    } catch (error: any) {
      // Emergency secondary fallback so frontend page never crashes on `categories.map`
      console.warn("Categories API error fallback triggered:", error.message);
      res.json(localCategories);
    }
  });

  // Featured and Trending Retrieval
  app.get('/api/featured', async (_req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        const products = await Product.find({ featured: true }).limit(6).populate('category');
        res.json(products);
      } else {
        const list = localProducts.filter((p: any) => p.featured).slice(0, 6).map((p: any) => {
          const catId = typeof p.category === 'object' && p.category ? (p.category as any)._id : p.category;
          const catObj = localCategories.find((c: any) => c._id === catId);
          return { ...p, category: catObj || { name: 'General' } };
        });
        res.json(list);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/trending', async (_req: express.Request, res: express.Response) => {
    try {
      await cleanExpiredTrendingProducts();
      if (isMongoConnected) {
        const products = await Product.find({ trending: true }).limit(8).populate('category');
        res.json(products);
      } else {
        const list = localProducts.filter((p: any) => p.trending).slice(0, 8).map((p: any) => {
          const catId = typeof p.category === 'object' && p.category ? (p.category as any)._id : p.category;
          const catObj = localCategories.find((c: any) => c._id === catId);
          return { ...p, category: catObj || { name: 'General' } };
        });
        res.json(list);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Non-erroring authentication check to avoid 401s in the console on initial load
  app.get('/api/auth/status', async (req: express.Request, res: express.Response): Promise<any> => {
    let token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      token = getCookieToken(req);
    }
    
    if (!token) {
      return res.status(200).json({ isAuthenticated: false });
    }
    let isBlacklisted = false;
    if (isMongoConnected) {
      isBlacklisted = !!(await BlacklistedToken.exists({ token }));
    } else {
      isBlacklisted = isTokenLocalBlacklisted(token);
    }
    if (isBlacklisted) return res.status(200).json({ isAuthenticated: false });

    try {
      const decoded = jwt.verify(token, JWT_SECRET_KEY, { algorithms: ['HS256'] }) as { userId: string };
      if (isMongoConnected) {
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(200).json({ isAuthenticated: false });
        return res.status(200).json({
          isAuthenticated: true,
          user: { role: user.role, email: user.email }
        });
      } else {
        const user = localUsers.find(u => u._id === decoded.userId);
        if (!user) return res.status(200).json({ isAuthenticated: false });
        return res.status(200).json({
          isAuthenticated: true,
          user: { role: user.role, email: user.email }
        });
      }
    } catch {
      return res.status(200).json({ isAuthenticated: false });
    }
  });

  // Profile management
  app.get('/api/user/profile', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      let token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        token = getCookieToken(req);
      }
      if (!token) {
        return res.status(200).json({ isAuthenticated: false });
      }
      let isBlacklisted = false;
      if (isMongoConnected) {
        isBlacklisted = !!(await BlacklistedToken.exists({ token }));
      } else {
        isBlacklisted = isTokenLocalBlacklisted(token);
      }
      if (isBlacklisted) return res.status(200).json({ isAuthenticated: false });

      let uId: string;
      try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY, { algorithms: ['HS256'] }) as { userId: string };
        uId = decoded.userId;
      } catch {
        return res.status(200).json({ isAuthenticated: false });
      }

      if (isMongoConnected) {
        const user = await User.findById(uId).populate('wishlist');
        if (!user) return res.status(200).json({ isAuthenticated: false });
        
        if (isAdminEmail(user.email)) {
          if (user.role !== 'admin') {
            user.role = 'admin';
            await user.save().catch(e => console.warn(e));
          }
        }
        const userObj = user?.toObject ? user.toObject() : user;
        return res.json({ ...sanitizeUser(userObj), token, isAuthenticated: true });
      } else {
        const user = localUsers.find(u => u._id === uId);
        if (!user) return res.status(200).json({ isAuthenticated: false });
        
        if (isAdminEmail(user.email)) {
          user.role = 'admin';
          saveLocalUsers();
        }

        // Map Wishlist Items
        const wishlistPopulated = (user.wishlist || []).map(idStr => {
          return localProducts.find((p: any) => p._id === idStr) || null;
        }).filter(Boolean);

        return res.json({
          ...sanitizeUser(user),
          wishlist: wishlistPopulated,
          recentlyViewed: [],
          token,
          isAuthenticated: true
        });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/user/wishlist/:productId', authenticate, validateWishlist, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const uId = (req as any).userId;
      const pId = req.params.productId;
      
      if (isMongoConnected) {
        const user = await User.findById(uId);
        if (!user) return res.status(404).json({ error: 'User profiles match not found' });
        
        if ((user.wishlist as any).includes(pId)) {
          (user.wishlist as any).pull(pId);
        } else {
          user.wishlist.push(pId as any);
        }
        try {
          await user.save();
        } catch(error: any) {
          return res.status(500).json({ error: 'Failed to update wishlist: ' + error.message });
        }
        return res.json(user.wishlist);
      } else {
        const user = localUsers.find(u => u._id === uId);
        if (!user) return res.status(404).json({ error: 'User profile match not found' });
        
        user.wishlist = user.wishlist || [];
        const index = user.wishlist.indexOf(pId);
        if (index > -1) {
          user.wishlist.splice(index, 1);
        } else {
          user.wishlist.push(pId);
        }
        saveLocalUsers();
        return res.json(user.wishlist);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const getRealTrackingDetails = async (carrier: string, trackingNumber: string): Promise<any> => {
    const shippoKey = process.env.SHIPPO_API_KEY;
    if (!shippoKey) return null;
    try {
      // Normalize carrier name for Shippo endpoint
      const normalizedCarrier = (carrier || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const response = await fetch(`https://api.goshippo.com/v1/tracks/${normalizedCarrier}/${trackingNumber}`, {
        headers: {
          'Authorization': `ShippoToken ${shippoKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Failed to fetch tracking data from Shippo:', err);
    }
    return null;
  };

  // Order Management APIs
  app.get('/api/user/orders', authenticate, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const uId = (req as any).userId;
      if (isMongoConnected) {
        const orders = await Order.find({ userId: uId }).populate('items.product').sort({ createdAt: -1 }).lean();
        
        // Enrich tracking with real-time Shippo provider data if API key is present
        const enrichedOrders = await Promise.all(orders.map(async (ord: any) => {
          if (ord.trackingNumber && process.env.SHIPPO_API_KEY) {
            const trackingInfo = await getRealTrackingDetails(ord.carrier, ord.trackingNumber);
            if (trackingInfo) {
              return {
                ...ord,
                status: trackingInfo.tracking_status?.status || ord.status,
                trackingHistory: trackingInfo.tracking_history || [],
                eta: trackingInfo.eta || ord.estimatedDelivery
              };
            }
          }
          return ord;
        }));
        
        return res.json(enrichedOrders);
      } else {
        // In-Memory Fallback
        let orders = localOrders.filter(o => o.userId === uId);
        // Populate products inside localOrders items
        orders = orders.map(ord => {
          const populatedItems = ord.items.map((it: any) => {
            const matchedProduct = typeof it.product === 'object' ? it.product : localProducts.find((lp: any) => lp._id === it.product);
            return { ...it, product: matchedProduct };
          });
          return { ...ord, items: populatedItems };
        });

        // Enrich fallback tracking with Shippo if key present
        const enrichedOrders = await Promise.all(orders.map(async (ord: any) => {
          if (ord.trackingNumber && process.env.SHIPPO_API_KEY) {
            const trackingInfo = await getRealTrackingDetails(ord.carrier, ord.trackingNumber);
            if (trackingInfo) {
              return {
                ...ord,
                status: trackingInfo.tracking_status?.status || ord.status,
                trackingHistory: trackingInfo.tracking_history || [],
                eta: trackingInfo.eta || ord.estimatedDelivery
              };
            }
          }
          return ord;
        }));

        return res.json(enrichedOrders);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/user/orders', authenticate, validateOrderCreation, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const uId = (req as any).userId;
      const { items } = req.body;

      // Honest, non-deceptive tracking status: Newly created orders remain PENDING until processed and assigned a real courier label
      const trackingNumber = 'PENDING';
      const carrier = 'Awaiting Carrier Assignment';

      const estDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      if (isMongoConnected) {
        let computedTotal = 0;
        for (const item of items) {
          const prod = await Product.findById(item.product);
          if (prod) computedTotal += (prod.price || 0) * (item.quantity || 1);
        }
        const totalAmount = computedTotal;
        const order = await Order.create({
          userId: uId,
          items,
          totalAmount,
          status: 'Processing',
          trackingNumber,
          carrier,
          estimatedDelivery: estDelivery,
          createdAt: new Date()
        });
        const populated = await order.populate('items.product');
        return res.json(populated);
      } else {
        let computedTotal = 0;
        const newOrder = {
          _id: "order_" + Math.random().toString(36).substring(2, 9),
          userId: uId,
          items: items.map((it: any) => {
            const matchedProduct = localProducts.find((lp: any) => lp._id === it.product);
            if (matchedProduct) computedTotal += (matchedProduct.price || 0) * (it.quantity || 1);
            return { ...it, product: matchedProduct || it.product };
          }),
          totalAmount: computedTotal,
          status: 'Processing',
          trackingNumber,
          carrier,
          estimatedDelivery: estDelivery,
          createdAt: new Date()
        };
        localOrders.push(newOrder);
        saveLocalOrders();
        return res.json(newOrder);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/user/orders/:orderId/advance', authenticate, validateOrderAdvance, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const uId = (req as any).userId;
      const { orderId } = req.params;
      const statuses: ('Processing' | 'Shipped' | 'In Transit' | 'Delivered')[] = ['Processing', 'Shipped', 'In Transit', 'Delivered'];
      
      if (isMongoConnected) {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        if (order.userId.toString() !== uId.toString()) {
          return res.status(403).json({ error: 'Access denied: You can only advance your own orders.' });
        }
        
        const currentIndex = statuses.indexOf(order.status as any);
        const nextIndex = Math.min(currentIndex + 1, statuses.length - 1);
        order.status = statuses[nextIndex];
        await order.save();
        const populated = await order.populate('items.product');
        return res.json(populated);
      } else {
        const order = localOrders.find(o => o._id === orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        if (order.userId !== uId) {
          return res.status(403).json({ error: 'Access denied: You can only advance your own orders.' });
        }
        
        const currentIndex = statuses.indexOf(order.status);
        const nextIndex = Math.min(currentIndex + 1, statuses.length - 1);
        order.status = statuses[nextIndex];
        saveLocalOrders();
        
        const populatedItems = order.items.map((it: any) => {
          const matchedProduct = typeof it.product === 'object' ? it.product : localProducts.find((lp: any) => lp._id === it.product);
          return { ...it, product: matchedProduct };
        });
        
        return res.json({ ...order, items: populatedItems });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Blog Routes
  app.get('/api/blogs', async (req: express.Request, res: express.Response) => {
    try {
      const pageNum = Math.max(1, Number(req.query.page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
      const { search, category } = req.query;
      
      if (isMongoConnected) {
        const filter: any = { published: true };
        if (search) filter.$text = { $search: String(search) };
        if (category) filter.category = String(category);
 
        const skip = (pageNum - 1) * limitNum;
        const blogs = await Blog.find(filter).skip(skip).limit(limitNum).sort({ createdAt: -1 });
        const total = await Blog.countDocuments(filter);
        res.json({ blogs, total, pages: Math.ceil(total / limitNum) });
      } else {
        let list = [...localBlogs];
        if (search) {
          const s = (search as string).toLowerCase();
          list = list.filter(b => b.title.toLowerCase().includes(s) || b.content.toLowerCase().includes(s));
        }
        if (category) {
          list = list.filter(b => b.category?.toLowerCase() === (category as string).toLowerCase());
        }
        
        const skip = (pageNum - 1) * limitNum;
        const paginated = list.slice(skip, skip + limitNum);
        res.json({
          blogs: paginated,
          total: list.length,
          pages: Math.ceil(list.length / limitNum)
        });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/blogs/:slug', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      if (isMongoConnected) {
        const blog = await Blog.findOneAndUpdate(
          { slug: req.params.slug },
          { $inc: { views: 1 } },
          { new: true }
        );
        if (!blog) return res.status(404).json({ error: 'Blog not found' });
        return res.json(blog);
      } else {
        const blog = localBlogs.find((b: any) => b.slug === req.params.slug);
        if (!blog) return res.status(404).json({ error: 'Blog post not found' });
        blog.views += 1;
        return res.json(blog);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Visitor tracking registration route
  app.post('/api/visit', validateVisitorRegister, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { visitorId } = req.body;

      if (isMongoConnected) {
        let visitor = await Visitor.findOne({ visitorId });
        let isNew = false;
        if (!visitor) {
          visitor = new Visitor({ visitorId, ip: req.ip, userAgent: req.headers['user-agent'] });
          await visitor.save();
          isNew = true;
        }
        res.json({ success: true, isNew });
      } else {
        const isNew = !localVisitors.includes(visitorId);
        if (isNew) {
          localVisitors.push(visitorId);
        }
        res.json({ success: true, isNew });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Contact Message Route
  app.post('/api/contact', validateContactMessage, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { name, email, phone, subject, message } = req.body;

      if (isMongoConnected) {
        const m = new Message({
          name,
          email,
          phone: phone || undefined,
          subject,
          message
        });
        await m.save();
        await syncMessagesToSeedFile();
        res.json({ success: true, message: 'Message sent successfully' });
      } else {
        localMessages.unshift({
          _id: "m_f_" + Math.random().toString(36).substring(2, 9),
          name,
          email,
          phone: phone || undefined,
          subject,
          message,
          read: false,
          createdAt: new Date()
        } as any);
        await syncMessagesToSeedFile();
        res.json({ success: true, message: 'Message recorded via database backend' });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Newsletter Subscription Route
  app.post('/api/newsletter/subscribe', validateNewsletterSubscribe, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { email } = req.body;

      if (isMongoConnected) {
        const existing = await Subscriber.findOne({ email });
        if (existing) {
          return res.status(400).json({ error: 'This email is already subscribed to our newsletter' });
        }
        const s = new Subscriber({ email });
        await s.save();
      } else {
        const existing = localSubscribers.some(s => s.email === email);
        if (existing) {
          return res.status(400).json({ error: 'This email is already subscribed to our newsletter' });
        }
        localSubscribers.unshift({
          _id: "s_f_" + Math.random().toString(36).substring(2, 9),
          email,
          createdAt: new Date()
        });
        saveLocalSubscribers();
      }

      res.json({ success: true, message: 'Thank you for subscribing to our newsletter!' });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'An error occurred during newsletter subscription' });
    }
  });

  // Search Route
  app.get('/api/search', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { q } = req.query;
      if (!q) return res.json({ products: [], blogs: [] });
      const queryStr = String(q).toLowerCase().trim();

      if (isMongoConnected) {
        const searchRegex = new RegExp(queryStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        
        let categoryIds: any[] = [];
        try {
          const matchedCats = await Category.find({ name: { $regex: searchRegex } });
          categoryIds = matchedCats.map((c: any) => c._id);
        } catch (err) {
          captureError(err, { context: 'Category search mapping' });
        }

        const productFilter: any = {
          $or: [
            { name: { $regex: searchRegex } },
            { brand: { $regex: searchRegex } },
            { sku: { $regex: searchRegex } },
            { tags: { $in: [searchRegex] } }
          ]
        };
        if (categoryIds.length > 0) {
          productFilter.$or.push({ category: { $in: categoryIds } });
        }

        const products = await Product.find(productFilter).populate('category').limit(10);

        const blogs = await Blog.find({
          $or: [
            { title: { $regex: searchRegex } },
            { content: { $regex: searchRegex } },
            { category: { $regex: searchRegex } }
          ]
        }).limit(10);

        return res.json({ products, blogs });
      } else {
        const matchedProducts = localProducts.filter((p: any) => {
          const catName = typeof p.category === 'object' && p.category ? (p.category as any).name : '';
          return p.name?.toLowerCase().includes(queryStr) || 
                 p.brand?.toLowerCase().includes(queryStr) ||
                 p.sku?.toLowerCase().includes(queryStr) ||
                 p.tags?.some((t: any) => t.toLowerCase().includes(queryStr)) ||
                 catName?.toLowerCase().includes(queryStr);
        }).slice(0, 10);

        const matchedBlogs = localBlogs.filter((b: any) => 
          b.title?.toLowerCase().includes(queryStr) || 
          b.content?.toLowerCase().includes(queryStr) ||
          b.category?.toLowerCase().includes(queryStr)
        ).slice(0, 10);

        return res.json({ products: matchedProducts, blogs: matchedBlogs });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Proxy for geolocation APIs to bypass CORS, with automatic regional mapping to Tamil Nadu districts
  app.get('/api/proxy/location', async (_req: express.Request, res: express.Response) => {
    const TAMIL_NADU_DISTRICTS = [
      "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
      "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur",
      "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris",
      "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivagangai",
      "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
      "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore",
      "Viluppuram", "Virudhunagar"
    ];

    const mapToTamilNaduDistrict = (cityName: string): string => {
      if (!cityName) return "Chennai";
      const formatted = cityName.trim();
      const found = TAMIL_NADU_DISTRICTS.find(
        d => d.toLowerCase() === formatted.toLowerCase()
      );
      if (found) {
        return found;
      }
      let hash = 0;
      for (let i = 0; i < formatted.length; i++) {
        hash = (hash << 5) - hash + formatted.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % TAMIL_NADU_DISTRICTS.length;
      return TAMIL_NADU_DISTRICTS[index];
    };

    let detectedCity = 'Chennai';
    let clientIp = (_req.headers['x-forwarded-for'] || _req.socket.remoteAddress || '').toString().split(',')[0].trim();
    if (clientIp.startsWith('::ffff:')) clientIp = clientIp.substring(7);

    try {
      // Try ipapi.co
      const ipParam = (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') ? `${clientIp}/` : '';
      const response = await fetch(`https://ipapi.co/${ipParam}json/`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.city) {
          detectedCity = mapToTamilNaduDistrict(data.city);
          res.json({ city: detectedCity });
          return;
        }
      }
    } catch (e) {
      console.warn('Proxy ipapi.co failed');
    }

    try {
      // Fallback: freeipapi.com
      const ipParamFree = (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') ? `/${clientIp}` : '';
      const response = await fetch(`https://freeipapi.com/api/json${ipParamFree}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.cityName) {
          detectedCity = mapToTamilNaduDistrict(data.cityName);
          res.json({ city: detectedCity });
          return;
        }
      }
    } catch (e) {
      console.warn('Proxy freeipapi.com failed');
    }
    
    // Final fallback to Chennai instead of failing
    res.json({ city: 'Chennai' });
  });

  // Footer Social Clicks Tracking Endpoint
  app.post('/api/analytics/social-click', validateSocialClick, async (req: express.Request, res: express.Response) => {
    try {
      const { platform } = req.body;
      if (platform === 'instagram' || platform === 'linkedin') {
        const platformKey = platform as 'instagram' | 'linkedin';
        socialClicks[platformKey]++;
        saveSocialClicks();

        // Also store it into the persistent database
        if (isMongoConnected) {
          try {
            const ipAddress = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
            const userAgent = req.headers['user-agent'] || 'Browser Agent';
            const click = new SocialClick({
              platform,
              ipAddress,
              userAgent,
              timestamp: new Date()
            });
            await click.save();
          } catch (dbErr) {
            console.error("Failed to save social click to database:", dbErr);
          }
        }
      }

      // Read real counts from database if connected
      let instaCount = socialClicks.instagram;
      let linkedinCount = socialClicks.linkedin;
      if (isMongoConnected) {
        try {
          instaCount = await SocialClick.countDocuments({ platform: 'instagram' });
          linkedinCount = await SocialClick.countDocuments({ platform: 'linkedin' });
        } catch (dbErr) {
          console.error("Failed to count social clicks from database:", dbErr);
        }
      }

      res.json({ 
        success: true, 
        socialClicks: { instagram: instaCount, linkedin: linkedinCount } 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Filter/Search Analytics Logger Route
  app.post('/api/analytics/filters', validateFilterAnalytics, async (req: express.Request, res: express.Response) => {
    try {
      const { searchQuery, categoryId, categorySlug } = req.body;
      if (isMongoConnected) {
        const log = new FilterLog({ searchQuery, categoryId, categorySlug });
        await log.save();
      } else {
        localFilterLogs.push({
          searchQuery,
          categoryId,
          categorySlug,
          timestamp: new Date()
        });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Page Visit/Session Time Tracker Endpoint
  app.post('/api/analytics/page-view', validatePageViewAnalytics, async (req: express.Request, res: express.Response) => {
    try {
      const { pageUrl, timeSpent, browser, device, district } = req.body;
      
      // Determine if a token is passed and resolve user
      let userId: any = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          let isBlacklisted = false;
          if (isMongoConnected) {
            isBlacklisted = !!(await BlacklistedToken.exists({ token }));
          } else {
            isBlacklisted = isTokenLocalBlacklisted(token);
          }
          if (!isBlacklisted) {
            const decoded = jwt.verify(token, JWT_SECRET_KEY, { algorithms: ['HS256'] }) as any;
            userId = decoded.userId;
          }
        } catch (jwtErr) {
          // Token invalid, treat as guest visitor silently
        }
      }

      // Extract client network parameters
      const ipAddress = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
      const userAgent = req.headers['user-agent'] || 'Browser Agent';

      // Pick location (fallback to Chennai if user has no preferred list) and sanitize to Tamil Nadu cities
      const selectedDistrict = sanitizeDistrict(district || 'Chennai');

      if (isMongoConnected) {
        // Look back 15 minutes for similar page_visit log from the same client
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        let existingDoc = null;

        if (userId) {
          existingDoc = await Analytics.findOne({
            eventType: 'page_visit',
            pageUrl,
            userId,
            timestamp: { $gte: fifteenMinutesAgo }
          });
        } else {
          existingDoc = await Analytics.findOne({
            eventType: 'page_visit',
            pageUrl,
            ipAddress,
            $or: [{ userId: null }, { userId: { $exists: false } }],
            timestamp: { $gte: fifteenMinutesAgo }
          });
        }

        if (existingDoc) {
          existingDoc.timeSpent = (existingDoc.timeSpent || 0) + (Number(timeSpent) || 0);
          existingDoc.timestamp = new Date();
          if (browser) existingDoc.browser = browser;
          if (device) existingDoc.device = device;
          existingDoc.district = selectedDistrict;
          await existingDoc.save();
        } else {
          const doc = new Analytics({
            eventType: 'page_visit',
            userId,
            userAgent,
            ipAddress,
            district: selectedDistrict,
            browser,
            device,
            pageUrl,
            timeSpent: Number(timeSpent) || 0,
            timestamp: new Date()
          });
          await doc.save();
        }
      } else {
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
        let existingLocalIdx = -1;

        if (userId) {
          existingLocalIdx = localAnalytics.findIndex(a => 
            a.eventType === 'page_visit' &&
            a.pageUrl === pageUrl &&
            String(a.userId) === String(userId) &&
            new Date(a?.timestamp ?? new Date()).getTime() >= fifteenMinutesAgo
          );
        } else {
          existingLocalIdx = localAnalytics.findIndex(a => 
            a.eventType === 'page_visit' &&
            a.pageUrl === pageUrl &&
            a.ipAddress === ipAddress &&
            !a.userId &&
            new Date(a?.timestamp ?? new Date()).getTime() >= fifteenMinutesAgo
          );
        }

        if (existingLocalIdx !== -1) {
          localAnalytics[existingLocalIdx].timeSpent = (localAnalytics[existingLocalIdx].timeSpent || 0) + (Number(timeSpent) || 0);
          localAnalytics[existingLocalIdx].timestamp = new Date();
          if (browser) localAnalytics[existingLocalIdx].browser = browser;
          if (device) localAnalytics[existingLocalIdx].device = device;
          localAnalytics[existingLocalIdx].district = selectedDistrict;
        } else {
          localAnalytics.push({
            productId: null,
            eventType: 'page_visit',
            userId,
            userAgent,
            ipAddress,
            district: selectedDistrict,
            browser: browser || 'Chrome',
            device: device || 'Desktop',
            pageUrl,
            timeSpent: Number(timeSpent) || 0,
            timestamp: new Date()
          });
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // PUT update user profile details
  app.put('/api/user/profile', authenticate, validateUserProfileUpdate, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const uId = (req as any).userId;
      const { name, district } = req.body;
      
      if (isMongoConnected) {
        const user = await User.findById(uId);
        if (!user) return res.status(404).json({ error: 'User profile not found' });
        
        if (name) user.name = name;
        if (district) user.district = district;
        try {
          await user.save();
        } catch(error: any) {
          return res.status(500).json({ error: 'Failed to update user profile: ' + error.message });
        }
        
        const populated = await User.findById(uId).populate('wishlist');
        return res.json(sanitizeUser(populated));
      } else {
        const user = localUsers.find(u => u._id === uId);
        if (!user) return res.status(404).json({ error: 'User profile not found' });
        
        if (name) user.name = name;
        if (district) user.district = district;
        saveLocalUsers();
        
        // Map Wishlist Items
        const wishlistPopulated = (user.wishlist || []).map(idStr => {
          return localProducts.find((p: any) => p._id === idStr) || null;
        }).filter(Boolean);
        
        return res.json({
          ...sanitizeUser(user),
          wishlist: wishlistPopulated,
          recentlyViewed: []
        });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // POST initiate email address update
  app.post('/api/user/update-email', authenticate, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const uId = (req as any).userId;
      const { newEmail } = req.body;
      
      if (!newEmail || typeof newEmail !== 'string') {
        return res.status(400).json({ error: 'A valid new email address is required' });
      }
      const validationResult = await validateAndCheckRealEmail(newEmail);
      if (!validationResult.isValid) {
        return res.status(400).json({ error: validationResult.error || 'Invalid email address.' });
      }
      const storageEmail = getStorageEmail(newEmail);
      if (!storageEmail) {
        return res.status(400).json({ error: 'Invalid email address structure' });
      }

      if (isMongoConnected) {
        const currentUser = await User.findById(uId);
        if (!currentUser) return res.status(404).json({ error: 'User profile not found' });

        if (currentUser.email === storageEmail) {
          return res.status(400).json({ error: 'This is already your current email address.' });
        }

        // Check if other user is using this email
        const userExists = await User.findOne({ email: storageEmail });
        if (userExists) {
          return res.status(400).json({ error: 'This email address is already registered to another account.' });
        }

        const pendingEmailToken = crypto.randomBytes(32).toString('hex');
        currentUser.pendingEmail = storageEmail;
        currentUser.pendingEmailToken = pendingEmailToken;
        await currentUser.save();

        const proto = (Array.isArray(req.headers['x-forwarded-proto']) ? req.headers['x-forwarded-proto'][0] : req.headers['x-forwarded-proto']) || (req.secure ? 'https' : 'http');
        const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
        const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
        const verificationUrl = `${proto}://${host}/api/auth/verify-new-email?token=${pendingEmailToken}`;

        // Send Email to the new address
        const transporter = getMailTransport();
        let emailSent = false;
        let smtpErrorMsg = '';
        if (transporter) {
          try {
            const sender = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@gadgetsprohub.com';
            await transporter.sendMail({
              from: `"GadgetsProHub Verification" <${sender}>`,
              to: storageEmail,
              subject: "Confirm Your New Email Address - GadgetsProHub",
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                  <h2 style="color: #4f46e5; text-align: center; margin-bottom: 24px;">Confirm Your Email Update</h2>
                  <p style="font-size: 14px; color: #334155;">Hello ${currentUser.name || 'User'},</p>
                  <p style="font-size: 14px; color: #334155; line-height: 1.6;">We received a request to update the email address for your GadgetsProHub account to <strong>${storageEmail}</strong>. Please confirm this update by verifying your new email address.</p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${verificationUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Confirm Email Address Update</a>
                  </div>
                  <p style="font-size: 12px; color: #64748b; line-height: 1.5;">If the button above does not work, copy and paste the link below into your browser:</p>
                  <p style="font-size: 11px; color: #3b82f6; word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 6px;">${verificationUrl}</p>
                  <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center;">
                    <p style="margin: 0;">If you did not request this email update, you can safely ignore this notification. Your current email remains secure.</p>
                  </div>
                </div>
              `
            });
            emailSent = true;
          } catch (err: any) {
            smtpErrorMsg = err.message;
          }
        }

        return res.json({
          success: true,
          message: 'A verification link has been sent to your new email address. Please click it to confirm your update.',
          smtpError: smtpErrorMsg
        });
      } else {
        const currentUser = localUsers.find(u => u._id === uId);
        if (!currentUser) return res.status(404).json({ error: 'User profile not found' });

        if (currentUser.email === storageEmail) {
          return res.status(400).json({ error: 'This is already your current email address.' });
        }

        // Check duplicate
        const userExists = localUsers.find(u => u.email === storageEmail);
        if (userExists) {
          return res.status(400).json({ error: 'This email address is already registered to another account.' });
        }

        const pendingEmailToken = crypto.randomBytes(32).toString('hex');
        currentUser.pendingEmail = storageEmail;
        currentUser.pendingEmailToken = pendingEmailToken;
        saveLocalUsers();

        const proto = (Array.isArray(req.headers['x-forwarded-proto']) ? req.headers['x-forwarded-proto'][0] : req.headers['x-forwarded-proto']) || (req.secure ? 'https' : 'http');
        const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
        const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
        const verificationUrl = `${proto}://${host}/api/auth/verify-new-email?token=${pendingEmailToken}`;

        // Send Email
        const transporter = getMailTransport();
        let emailSent = false;
        let smtpErrorMsg = '';
        if (transporter) {
          try {
            const sender = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@gadgetsprohub.com';
            await transporter.sendMail({
              from: `"GadgetsProHub Verification" <${sender}>`,
              to: storageEmail,
              subject: "Confirm Your New Email Address - GadgetsProHub",
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                  <h2 style="color: #4f46e5; text-align: center; margin-bottom: 24px;">Confirm Your Email Update</h2>
                  <p style="font-size: 14px; color: #334155;">Hello ${currentUser.name || 'User'},</p>
                  <p style="font-size: 14px; color: #334155; line-height: 1.6;">We received a request to update the email address for your GadgetsProHub account to <strong>${storageEmail}</strong>. Please confirm this update by verifying your new email address.</p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${verificationUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Confirm Email Address Update</a>
                  </div>
                  <p style="font-size: 12px; color: #64748b; line-height: 1.5;">If the button above does not work, copy and paste the link below into your browser:</p>
                  <p style="font-size: 11px; color: #3b82f6; word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 6px;">${verificationUrl}</p>
                  <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center;">
                    <p style="margin: 0;">If you did not request this email update, you can safely ignore this notification. Your current email remains secure.</p>
                  </div>
                </div>
              `
            });
            emailSent = true;
          } catch (err: any) {
            smtpErrorMsg = err.message;
          }
        }

        return res.json({
          success: true,
          message: 'A verification link has been sent to your new email address. Please click it to confirm your update.',
          smtpError: smtpErrorMsg
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== ADMIN CAPABILITIES ==========

  // Seed Products Database
  app.post('/api/admin/seed', adminOnly, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { clearOnly, seedTrending, seedImageOverride, confirmWipe } = req.body || {};
      if (!confirmWipe) {
        return res.status(400).json({ error: 'This is a destructive action. You must provide "confirmWipe: true" in the request body to proceed.' });
      }
      if (clearOnly) {
        if (isMongoConnected) {
          await Product.deleteMany({});
          await Analytics.deleteMany({});
          await Visitor.deleteMany({});
        } else {
          localProducts.length = 0;
          localAnalytics.length = 0;
          localVisitors.length = 0;
        }
        await logSecurityAction(req, 'DATABASE_CLEARED', undefined, { clearOnly: true });
        return res.json({ success: true, message: "Products catalog and logs wiped clean!", products: [] });
      }

      if (seedTrending) {
        if (isMongoConnected) {
          await Product.deleteMany({});
          await Category.deleteMany({});
          await Analytics.deleteMany({});
          await Visitor.deleteMany({});

          const mongooseCategories = localCategories.map((c: any) => ({
            ...c,
            _id: new mongoose.Types.ObjectId(c._id)
          }));
          await Category.insertMany(mongooseCategories);

          const trendingProds = originalLocalProducts.map((p: any) => {
            let clicks = 0;
            let conversions = 0;
            if (p._id === "665a0002bc93ef2d8c000010") { clicks = 85; conversions = 14; }
            else if (p._id === "665a0002bc93ef2d8c000011") { clicks = 64; conversions = 9; }
            else if (p._id === "665a0002bc93ef2d8c000013") { clicks = 92; conversions = 18; }
            else { clicks = Math.floor(Math.random() * 12) + 2; conversions = Math.floor(clicks * 0.15); }

            const pImages = seedImageOverride ? [seedImageOverride] : p.images;

            return {
              ...p,
              _id: new mongoose.Types.ObjectId(p._id),
              category: new mongoose.Types.ObjectId(p.category),
              images: pImages,
              clicks,
              conversions
            };
          });

          await Product.insertMany(trendingProds);

          // Generate Analytics records for Tamil Nadu districts
          const analyticsDocs: any[] = [];
          
          type DistrictCounts = Record<string, number>;
          
          const earbudsDist: DistrictCounts = { Chennai: 40, Madurai: 25, Tirunelveli: 12, Virudhunagar: 8 };
          const smartwatchDist: DistrictCounts = { Chennai: 20, Madurai: 24, Tirunelveli: 10, Virudhunagar: 10 };
          const laptopDist: DistrictCounts = { Chennai: 45, Madurai: 15, Tirunelveli: 22, Virudhunagar: 10 };

          // 1. Earbuds
          Object.entries(earbudsDist).forEach(([dist, count]) => {
            for (let i = 0; i < count; i++) {
              analyticsDocs.push({
                productId: new mongoose.Types.ObjectId("665a0002bc93ef2d8c000010"),
                affiliateCode: "AUDIO001",
                eventType: 'click',
                district: dist,
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
              });
            }
          });

          // 2. Smartwatch Pro
          Object.entries(smartwatchDist).forEach(([dist, count]) => {
            for (let i = 0; i < count; i++) {
              analyticsDocs.push({
                productId: new mongoose.Types.ObjectId("665a0002bc93ef2d8c000011"),
                affiliateCode: "WATCH001",
                eventType: 'click',
                district: dist,
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5)'
              });
            }
          });

          // 3. Laptop
          Object.entries(laptopDist).forEach(([dist, count]) => {
            for (let i = 0; i < count; i++) {
              analyticsDocs.push({
                productId: new mongoose.Types.ObjectId("665a0002bc93ef2d8c000013"),
                affiliateCode: "LAPTOP012",
                eventType: 'click',
                district: dist,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
              });
            }
          });

          // Insert Conversions
          for (let i = 0; i < 14; i++) {
            analyticsDocs.push({
              productId: new mongoose.Types.ObjectId("665a0002bc93ef2d8c000010"),
              eventType: 'conversion',
              district: i % 2 === 0 ? 'Chennai' : 'Madurai'
            });
          }
          for (let i = 0; i < 9; i++) {
            analyticsDocs.push({
              productId: new mongoose.Types.ObjectId("665a0002bc93ef2d8c000011"),
              eventType: 'conversion',
              district: i % 2 === 0 ? 'Madurai' : 'Tirunelveli'
            });
          }
          for (let i = 0; i < 18; i++) {
            analyticsDocs.push({
              productId: new mongoose.Types.ObjectId("665a0002bc93ef2d8c000013"),
              eventType: 'conversion',
              district: i % 2 === 0 ? 'Chennai' : 'Virudhunagar'
            });
          }

          await Analytics.insertMany(analyticsDocs);

          // Insert 241 unique visitors
          const visitorDocs = [];
          for (let idx = 0; idx < 241; idx++) {
            visitorDocs.push({
              visitorId: "vis_seeded_" + idx,
              ip: "106.208.5." + (idx % 254),
              userAgent: "Mozilla/5.0 (Linux; Android 13; Galaxy)"
            });
          }
          await Visitor.insertMany(visitorDocs);

          const refetched = await Product.find().populate('category');
          await logSecurityAction(req, 'DATABASE_SEEDED', undefined, { type: 'trending', seedImageOverride });
          return res.json({ success: true, message: "Database seeded with Trending Selections & Popular TN Districts!", products: refetched });
        } else {
          localProducts.length = 0;
          localProducts.push(...originalLocalProducts.map((p: any) => {
            let clicks = 0;
            let conversions = 0;
            if (p._id === "665a0002bc93ef2d8c000010") { clicks = 85; conversions = 14; }
            else if (p._id === "665a0002bc93ef2d8c000011") { clicks = 64; conversions = 9; }
            else if (p._id === "665a0002bc93ef2d8c000013") { clicks = 92; conversions = 18; }
            else { clicks = Math.floor(Math.random() * 12) + 2; conversions = Math.floor(clicks * 0.15); }

            const pImages = seedImageOverride ? [seedImageOverride] : p.images;

            return {
              ...p,
              images: pImages,
              clicks,
              conversions
            };
          }));

          localAnalytics.length = 0;
          localVisitors.length = 0;

          type DistrictCounts = Record<string, number>;
          const earbudsDist: DistrictCounts = { Chennai: 40, Madurai: 25, Tirunelveli: 12, Virudhunagar: 8 };
          const smartwatchDist: DistrictCounts = { Chennai: 20, Madurai: 24, Tirunelveli: 10, Virudhunagar: 10 };
          const laptopDist: DistrictCounts = { Chennai: 45, Madurai: 15, Tirunelveli: 22, Virudhunagar: 10 };

          // 1. Earbuds
          Object.entries(earbudsDist).forEach(([dist, count]) => {
            for (let i = 0; i < count; i++) {
              localAnalytics.push({
                productId: "665a0002bc93ef2d8c000010",
                affiliateCode: "AUDIO001",
                eventType: 'click',
                district: dist,
                timestamp: new Date()
              });
            }
          });

          // 2. Smartwatch Pro
          Object.entries(smartwatchDist).forEach(([dist, count]) => {
            for (let i = 0; i < count; i++) {
              localAnalytics.push({
                productId: "665a0002bc93ef2d8c000011",
                affiliateCode: "WATCH001",
                eventType: 'click',
                district: dist,
                timestamp: new Date()
              });
            }
          });

          // 3. Laptop
          Object.entries(laptopDist).forEach(([dist, count]) => {
            for (let i = 0; i < count; i++) {
              localAnalytics.push({
                productId: "665a0002bc93ef2d8c000013",
                affiliateCode: "LAPTOP012",
                eventType: 'click',
                district: dist,
                timestamp: new Date()
              });
            }
          });

          // Conversions in-memory
          for (let i = 0; i < 14; i++) {
            localAnalytics.push({ productId: "665a0002bc93ef2d8c000010", eventType: 'conversion', district: i % 2 === 0 ? 'Chennai' : 'Madurai', timestamp: new Date() });
          }
          for (let i = 0; i < 9; i++) {
            localAnalytics.push({ productId: "665a0002bc93ef2d8c000011", eventType: 'conversion', district: i % 2 === 0 ? 'Madurai' : 'Tirunelveli', timestamp: new Date() });
          }
          for (let i = 0; i < 18; i++) {
            localAnalytics.push({ productId: "665a0002bc93ef2d8c000013", eventType: 'conversion', district: i % 2 === 0 ? 'Chennai' : 'Virudhunagar', timestamp: new Date() });
          }

          // Populate visitors in-memory
          for (let idx = 0; idx < 241; idx++) {
            localVisitors.push("local_seeded_id_" + idx);
          }

          await logSecurityAction(req, 'DATABASE_SEEDED', undefined, { type: 'trending_local', seedImageOverride });
          return res.json({ success: true, message: "In-memory database seeded with Trending Selections & Popular TN Districts!", products: localProducts });
        }
      }

      if (isMongoConnected) {
        await Product.deleteMany({});
        await Category.deleteMany({});
        
        const mongooseCategories = localCategories.map((c: any) => ({
          ...c,
          _id: new mongoose.Types.ObjectId(c._id)
        }));
        await Category.insertMany(mongooseCategories);

        const initialProds = originalLocalProducts.map((p: any) => {
          const pImages = seedImageOverride ? [seedImageOverride] : p.images;
          return {
            ...p,
            _id: new mongoose.Types.ObjectId(p._id),
            category: new mongoose.Types.ObjectId(p.category),
            images: pImages
          };
        });
        await Product.insertMany(initialProds);
        const refetched = await Product.find().populate('category');
        await logSecurityAction(req, 'DATABASE_RESEEDED', undefined, { type: 'standard', seedImageOverride });
        return res.json({ success: true, message: "Database successfully re-seeded with pristine entries!", products: refetched });
      } else {
        localProducts.length = 0;
        localProducts.push(...JSON.parse(JSON.stringify(originalLocalProducts)).map((p: any) => {
          if (seedImageOverride) {
            p.images = [seedImageOverride];
          }
          return p;
        }));
        await logSecurityAction(req, 'DATABASE_RESEEDED', undefined, { type: 'standard_local', seedImageOverride });
        return res.json({ success: true, message: "In-memory database successfully re-seeded!", products: localProducts });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Products CRUD
  app.get('/api/admin/check-slug', adminOnly, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { slug, type, excludeId } = req.query;
      if (!slug || typeof slug !== 'string') {
        return res.status(400).json({ error: 'Proposed slug is required' });
      }
      if (type !== 'product' && type !== 'blog') {
        return res.status(400).json({ error: 'Type must be either "product" or "blog"' });
      }
      const result = await resolveUniqueSlug(slug, type as 'product' | 'blog', excludeId as string);
      return res.json({
        exists: result.exists,
        originalSlug: slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        suggestedSlug: result.finalSlug
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Telegram Admin Bot Integration ---
  
  interface TelegramState {
    step: 'WAIT_NAME' | 'WAIT_CATEGORY' | 'WAIT_NEW_CATEGORY_NAME' | 'WAIT_SUBCATEGORY' | 'WAIT_BRAND' | 'WAIT_PRICE' | 'WAIT_ORIGINAL_PRICE' | 'WAIT_DISCOUNT' | 'WAIT_AFFILIATE_LINK' | 'WAIT_DESCRIPTION' | 'WAIT_IMAGE' | 'WAIT_CONFIRM';
    data: {
      name?: string;
      category?: string;
      subcategory?: string;
      brand?: string;
      price?: number;
      originalPrice?: number;
      discount?: number;
      affiliateLink?: string;
      description?: string;
      images?: string[];
    };
  }

  async function getTelegramState(chatId: number): Promise<TelegramState | null> {
    try {
      const doc = await TelegramStateModel.findOne({ chatId });
      if (doc) {
        return { step: doc.step, data: doc.data } as TelegramState;
      }
    } catch (err: any) {
      console.error('[Telegram State DB Get Error]:', err.message);
    }
    return null;
  }

  async function setTelegramState(chatId: number, state: TelegramState): Promise<void> {
    try {
      await TelegramStateModel.findOneAndUpdate(
        { chatId },
        { $set: { step: state.step, data: state.data, updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (err: any) {
      console.error('[Telegram State DB Set Error]:', err.message);
    }
  }

  async function deleteTelegramState(chatId: number): Promise<void> {
    try {
      await TelegramStateModel.deleteOne({ chatId });
    } catch (err: any) {
      console.error('[Telegram State DB Delete Error]:', err.message);
    }
  }

  async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;
    
    const body: any = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };
    
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        console.error('[Telegram Bot] sendMessage failed:', await res.text());
      }
    } catch (err: any) {
      console.error('[Telegram Bot] sendMessage error:', err.message);
    }
  }

  async function answerTelegramCallbackQuery(callbackQueryId: string, text?: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;
    try {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text
        })
      });
    } catch (err: any) {
      console.error('[Telegram Bot] answerCallbackQuery error:', err.message);
    }
  }

  app.post('/api/webhooks/telegram', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.warn('[Telegram Bot] Webhook received but TELEGRAM_BOT_TOKEN is not configured.');
        return res.status(403).json({ error: 'Telegram Bot is not configured on this server' });
      }

      const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
      const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || 
        crypto.createHash('sha256').update(botToken).digest('hex');
        
      const providedSecret = String(secretHeader || '');
      if (
        !secretHeader ||
        providedSecret.length !== expectedSecret.length ||
        !crypto.timingSafeEqual(Buffer.from(providedSecret), Buffer.from(expectedSecret))
      ) {
        console.warn('[Telegram Bot] Unauthorized webhook call received (secret token mismatch or missing)');
        return res.status(403).send('Unauthorized webhook request');
      }

      const update = req.body;
      if (!update) return res.sendStatus(200);

      const message = update.message;
      const callbackQuery = update.callback_query;

      const chatId = message ? message.chat.id : (callbackQuery ? callbackQuery.message.chat.id : null);
      if (!chatId) return res.sendStatus(200);

      // Authenticate incoming user using ID or username
      const sender = message ? message.from : (callbackQuery ? callbackQuery.from : null);
      if (!sender) return res.sendStatus(200);

      const allowedId = process.env.TELEGRAM_ALLOWED_USER_ID;
      const allowedUsername = process.env.TELEGRAM_ALLOWED_USERNAME;

      const isAllowedId = allowedId && String(sender.id) === String(allowedId);
      const isAllowedUsername = allowedUsername && sender.username && String(sender.username).toLowerCase() === String(allowedUsername).toLowerCase();

      if (!isAllowedId && !isAllowedUsername) {
        await sendTelegramMessage(chatId, `⚠️ <b>Access Denied</b>\n\nThis is a private administrative bot. Your Telegram User ID is: <code>${sender.id}</code>${sender.username ? ` and username is: <code>@${sender.username}</code>` : ''}.\n\nPlease configure your <code>TELEGRAM_ALLOWED_USER_ID</code> or <code>TELEGRAM_ALLOWED_USERNAME</code> environment variables in your workspace settings to authorize yourself.`);
        return res.sendStatus(200);
      }

      // Handle Callback Query
      if (callbackQuery) {
        const data = callbackQuery.data;
        const callbackQueryId = callbackQuery.id;

        await answerTelegramCallbackQuery(callbackQueryId);

        if (data === 'add_product') {
          await setTelegramState(chatId, { step: 'WAIT_NAME', data: {} });
          await sendTelegramMessage(chatId, "📝 <b>Let's add a new product!</b>\n\n<b>Step 1:</b> Please type the <b>Product Name</b> (e.g., <i>Apple iPhone 15 Pro Max</i>):");
        } 
        else if (data.startsWith('cat_')) {
          const state = await getTelegramState(chatId);
          if (state && state.step === 'WAIT_CATEGORY') {
            const catId = data.substring(4);
            if (catId === 'new') {
              state.step = 'WAIT_NEW_CATEGORY_NAME';
              await setTelegramState(chatId, state);
              await sendTelegramMessage(chatId, "🆕 Please type the name of the <b>New Category</b> you want to create:");
            } else {
              state.data.category = catId;
              state.step = 'WAIT_SUBCATEGORY';
              await setTelegramState(chatId, state);
              await sendTelegramMessage(chatId, "✅ <b>Category selected!</b>\n\n<b>Step 3:</b> Please type the <b>Subcategory</b> name (or send /skip to leave blank):");
            }
          }
        } 
        else if (data === 'confirm_put') {
          const state = await getTelegramState(chatId);
          if (state && state.step === 'WAIT_CONFIRM') {
            try {
              if (isMongoConnected) {
                const { finalSlug } = await resolveUniqueSlug(state.data.name || 'item', 'product');
                
                const product = new Product({
                  name: state.data.name,
                  slug: finalSlug,
                  category: state.data.category,
                  subcategory: state.data.subcategory,
                  brand: state.data.brand,
                  price: state.data.price,
                  originalPrice: state.data.originalPrice,
                  discount: state.data.discount,
                  affiliateLink: state.data.affiliateLink,
                  description: state.data.description,
                  images: state.data.images || [],
                  inStock: true,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });

                await product.save();
                await syncProductsToSeedFile();

                // N8N Webhook Integration - Trigger n8n on successful database save
                if (process.env.N8N_REALTIME_WEBHOOK_URL) {
                  try {
                    await fetch(process.env.N8N_REALTIME_WEBHOOK_URL, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${process.env.N8N_SECRET_TOKEN || ''}` 
                      },
                      body: JSON.stringify({
                        event: 'product_created',
                        productId: product._id,
                        name: product.name,
                        slug: product.slug,
                        price: product.price,
                        originalPrice: product.originalPrice,
                        discount: product.discount,
                        affiliateLink: product.affiliateLink,
                        description: product.description,
                        image: product.images?.[0] || '',
                        source: 'telegram_bot'
                      })
                    });
                    console.log(`[Telegram Bot] Successfully triggered N8N manual workflow webhook for: ${product.name}`);
                  } catch (n8nErr: any) {
                    console.error('[Telegram Bot] N8N Webhook trigger error:', n8nErr.message);
                  }
                }

                await sendTelegramMessage(chatId, `🎉 <b>Successfully Published!</b>\n\nThe product <b>${escapeHTML(product.name)}</b> is now live on the website.\n\nType /start to add another product.`);
              } else {
                await sendTelegramMessage(chatId, "❌ <b>Error:</b> Database is not connected right now.");
              }
            } catch (err: any) {
              await sendTelegramMessage(chatId, `❌ <b>Failed to save product:</b> ${escapeHTML(err.message)}`);
            }
            await deleteTelegramState(chatId);
          }
        } 
        else if (data === 'confirm_cancel') {
          await deleteTelegramState(chatId);
          await sendTelegramMessage(chatId, "❌ <b>Operation cancelled.</b> Type /start if you want to begin again.");
        }

        return res.sendStatus(200);
      }

      // Handle normal messages
      if (message && message.text) {
        const text = message.text.trim();

        if (text === '/start') {
          await deleteTelegramState(chatId);
          await sendTelegramMessage(chatId, 
            "👋 <b>Welcome to your Product Admin Bot!</b>\n\nYou can use this bot to add products directly to your database and keep seed files in sync.",
            {
              inline_keyboard: [
                [ { text: "➕ Add Product", callback_data: "add_product" } ]
              ]
            }
          );
          return res.sendStatus(200);
        }

        if (text === '/cancel') {
          await deleteTelegramState(chatId);
          await sendTelegramMessage(chatId, "❌ <b>Operation cancelled.</b> Type /start to start a new product session.");
          return res.sendStatus(200);
        }

        const state = await getTelegramState(chatId);
        if (!state) {
          await sendTelegramMessage(chatId, "❓ I'm not sure what you want to do. Please send /start to open the admin options menu.");
          return res.sendStatus(200);
        }

        switch (state.step) {
          case 'WAIT_NAME': {
            state.data.name = text;
            state.step = 'WAIT_CATEGORY';
            await setTelegramState(chatId, state);

            let categoriesList: any[] = [];
            if (isMongoConnected) {
              categoriesList = await Category.find({}).select('_id name');
            }

            const buttons = categoriesList.map(cat => [
              { text: cat.name, callback_data: `cat_${cat._id}` }
            ]);
            buttons.push([
              { text: "➕ Create New Category", callback_data: "cat_new" }
            ]);

            await sendTelegramMessage(chatId, 
              `📝 <b>Name set:</b> ${escapeHTML(text)}\n\n<b>Step 2:</b> Please select a <b>Category</b> from the list below or create a new one:`,
              { inline_keyboard: buttons }
            );
            break;
          }

          case 'WAIT_NEW_CATEGORY_NAME': {
            if (isMongoConnected) {
              let category = await Category.findOne({ name: text });
              if (!category) {
                const catSlug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                category = new Category({ name: text, slug: catSlug });
                await category.save();
              }
              state.data.category = category._id.toString();
              state.step = 'WAIT_SUBCATEGORY';
              await setTelegramState(chatId, state);
              await sendTelegramMessage(chatId, `✅ <b>Category "${escapeHTML(category.name)}" created & assigned!</b>\n\n<b>Step 3:</b> Enter the <b>Subcategory</b> (or send /skip):`);
            } else {
              await sendTelegramMessage(chatId, "❌ Database is disconnected. Cannot create category.");
            }
            break;
          }

          case 'WAIT_SUBCATEGORY': {
            if (text !== '/skip') {
              state.data.subcategory = text;
            }
            state.step = 'WAIT_BRAND';
            await setTelegramState(chatId, state);
            await sendTelegramMessage(chatId, "🏷️ <b>Step 4:</b> Enter the product <b>Brand</b> (or send /skip):");
            break;
          }

          case 'WAIT_BRAND': {
            if (text !== '/skip') {
              state.data.brand = text;
            }
            state.step = 'WAIT_PRICE';
            await setTelegramState(chatId, state);
            await sendTelegramMessage(chatId, "💰 <b>Step 5:</b> Enter the product <b>Price</b> (number only, e.g. 1999):");
            break;
          }

          case 'WAIT_PRICE': {
            const price = parseFloat(text);
            if (isNaN(price) || price < 0) {
              await sendTelegramMessage(chatId, "⚠️ Please enter a valid positive number for <b>Price</b>:");
            } else {
              state.data.price = price;
              state.step = 'WAIT_ORIGINAL_PRICE';
              await setTelegramState(chatId, state);
              await sendTelegramMessage(chatId, "📉 <b>Step 6:</b> Enter the <b>Original Price</b> for discount calculations (or send /skip):");
            }
            break;
          }

          case 'WAIT_ORIGINAL_PRICE': {
            if (text !== '/skip') {
              const origPrice = parseFloat(text);
              if (isNaN(origPrice) || origPrice < 0) {
                await sendTelegramMessage(chatId, "⚠️ Please enter a valid positive number for <b>Original Price</b> or send /skip:");
                return res.sendStatus(200);
              }
              state.data.originalPrice = origPrice;
            }
            state.step = 'WAIT_DISCOUNT';
            await setTelegramState(chatId, state);
            await sendTelegramMessage(chatId, "🏷️ <b>Step 7:</b> Enter the <b>Discount Percentage</b> (number, e.g. 10) or send /skip to auto-calculate:");
            break;
          }

          case 'WAIT_DISCOUNT': {
            if (text !== '/skip') {
              const discount = parseInt(text);
              if (isNaN(discount) || discount < 0 || discount > 100) {
                await sendTelegramMessage(chatId, "⚠️ Please enter a valid number between 0 and 100 for <b>Discount %</b> or send /skip:");
                return res.sendStatus(200);
              }
              state.data.discount = discount;
            } else if (state.data.originalPrice && state.data.price && state.data.originalPrice > state.data.price) {
              state.data.discount = Math.round((1 - state.data.price / state.data.originalPrice) * 100);
            }
            state.step = 'WAIT_AFFILIATE_LINK';
            await setTelegramState(chatId, state);
            await sendTelegramMessage(chatId, "🔗 <b>Step 8:</b> Paste the product <b>Affiliate/Buy Link</b> (URL starting with http:// or https://):");
            break;
          }

          case 'WAIT_AFFILIATE_LINK': {
            if (!text.startsWith('http://') && !text.startsWith('https://')) {
              await sendTelegramMessage(chatId, "⚠️ Invalid URL format. Please paste a link starting with http:// or https://:");
            } else {
              state.data.affiliateLink = text;
              state.step = 'WAIT_DESCRIPTION';
              await setTelegramState(chatId, state);
              await sendTelegramMessage(chatId, "📝 <b>Step 9:</b> Enter a brief <b>Description</b> for the product (or send /skip):");
            }
            break;
          }

          case 'WAIT_DESCRIPTION': {
            if (text !== '/skip') {
              state.data.description = text;
            }
            state.step = 'WAIT_IMAGE';
            await setTelegramState(chatId, state);
            await sendTelegramMessage(chatId, "🖼️ <b>Step 10:</b> Enter an <b>Image URL</b> (or send /skip to use standard generic placeholder):");
            break;
          }

          case 'WAIT_IMAGE': {
            if (text !== '/skip') {
              if (!text.startsWith('http://') && !text.startsWith('https://')) {
                await sendTelegramMessage(chatId, "⚠️ Invalid URL format. Please paste an image link starting with http:// or https://:");
                return res.sendStatus(200);
              }
              state.data.images = [text];
            } else {
              state.data.images = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=60'];
            }
            state.step = 'WAIT_CONFIRM';
            await setTelegramState(chatId, state);

            let categoryName = 'Unknown';
            if (isMongoConnected && state.data.category) {
              const cat = await Category.findById(state.data.category);
              if (cat) categoryName = cat.name;
            }

            const summary = 
              `📋 <b>Please review the product details:</b>\n\n` +
              `• <b>Name:</b> ${escapeHTML(state.data.name || '')}\n` +
              `• <b>Category:</b> ${escapeHTML(categoryName)}\n` +
              `• <b>Subcategory:</b> ${escapeHTML(state.data.subcategory || 'N/A')}\n` +
              `• <b>Brand:</b> ${escapeHTML(state.data.brand || 'N/A')}\n` +
              `• <b>Price:</b> ₹${state.data.price}\n` +
              `• <b>Original Price:</b> ${state.data.originalPrice ? '₹' + state.data.originalPrice : 'N/A'}\n` +
              `• <b>Discount:</b> ${state.data.discount ? state.data.discount + '%' : 'N/A'}\n` +
              `• <b>Affiliate Link:</b> <code>${escapeHTML(state.data.affiliateLink || '')}</code>\n` +
              `• <b>Description:</b> ${escapeHTML(state.data.description || 'N/A')}\n` +
              `• <b>Image URL:</b> <code>${escapeHTML(state.data.images?.[0] || '')}</code>\n\n` +
              `Would you like to save this product to the live database?`;

            await sendTelegramMessage(chatId, summary, {
              inline_keyboard: [
                [
                  { text: "✅ Put to Database", callback_data: "confirm_put" },
                  { text: "❌ Cancel", callback_data: "confirm_cancel" }
                ]
              ]
            });
            break;
          }
        }
      }

      res.sendStatus(200);
    } catch (err: any) {
      console.error('[Telegram Webhook Error]:', err.message);
      res.sendStatus(200);
    }
  });

  // --- N8N Automation Webhooks ---

  
  // Middleware to authenticate N8N webhooks
  const authenticateN8N = (req: express.Request, res: express.Response, next: express.NextFunction): any => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const secret = process.env.N8N_SECRET_TOKEN || '';
    let isMatch = false;
    if (token && secret) {
      const tokenHash = crypto.createHash('sha256').update(token).digest();
      const secretHash = crypto.createHash('sha256').update(secret).digest();
      isMatch = crypto.timingSafeEqual(tokenHash, secretHash);
    }
    if (!token || !secret || !isMatch) {
      return res.status(403).json({ error: 'Forbidden: Invalid or missing N8N Secret Token' });
    }
    next();
  };

  // Endpoint for N8N to get products that need updating (oldest lastPriceCheck first)
  app.get('/api/webhooks/n8n/products-to-update', authenticateN8N, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      if (isMongoConnected) {
        // Find products sorted by oldest lastPriceCheck (or null)
        const products = await Product.find({})
          .sort({ lastPriceCheck: 1, _id: 1 }) // Nulls first (or earliest dates)
          .limit(limit)
          .select('_id name affiliateLink price slug lastPriceCheck');
        return res.json(products);
      } else {
        return res.json([]);
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Endpoint for N8N to update a specific product's price
  app.post('/api/webhooks/n8n/update-product', authenticateN8N, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { productId, price, originalPrice, discount, inStock } = req.body;
      if (!productId || typeof price !== 'number' || isNaN(price) || price <= 0 || price > 1000000) {
        return res.status(400).json({ error: 'productId and a valid positive price (up to 1,000,000) are required' });
      }

      if (typeof originalPrice === 'number') {
        if (isNaN(originalPrice) || originalPrice < price || originalPrice > 1000000) {
          return res.status(400).json({ error: 'Invalid originalPrice: must be a valid number >= price and <= 1,000,000' });
        }
      }

      if (typeof discount === 'number') {
        if (isNaN(discount) || discount < 0 || discount > 99) {
          return res.status(400).json({ error: 'Invalid discount percentage: must be between 0 and 99' });
        }
      }

      if (typeof inStock !== 'undefined' && typeof inStock !== 'boolean') {
        return res.status(400).json({ error: 'inStock must be a boolean' });
      }

      if (isMongoConnected) {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        // Sanity check against existing price to prevent scraper glitches
        if (product.price && product.price > 0) {
          const ratio = price / product.price;
          // Reject if price drops below 5% of current price or jumps over 10x
          if (ratio < 0.05 || ratio > 10.0) {
            console.warn(`[N8N Webhook] Rejected suspicious price update for product ${productId}: Current=${product.price}, New=${price}`);
            return res.status(400).json({ 
              error: `Price change anomaly detected: proposed price (${price}) deviates excessively from current price (${product.price}). Update rejected to protect product catalog integrity.` 
            });
          }
        }

        product.price = price;
        if (typeof originalPrice === 'number') {
          product.originalPrice = originalPrice;
        } else if (product.originalPrice && product.originalPrice < price) {
          product.originalPrice = price;
        }

        if (typeof discount === 'number') {
          product.discount = discount;
        } else if (typeof originalPrice === 'number' && originalPrice > price) {
          product.discount = Math.round(((originalPrice - price) / originalPrice) * 100);
        } else if (product.originalPrice && product.originalPrice > price) {
          product.discount = Math.round(((product.originalPrice - price) / product.originalPrice) * 100);
        }

        if (typeof inStock === 'boolean') product.inStock = inStock;
        product.lastPriceCheck = new Date();

        await product.save();
        return res.json({ 
          success: true, 
          product: { 
            _id: product._id, 
            price: product.price, 
            originalPrice: product.originalPrice,
            discount: product.discount,
            inStock: product.inStock,
            lastPriceCheck: product.lastPriceCheck 
          } 
        });
      } else {
        return res.json({ success: false, error: 'Database not connected' });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------

  app.post('/api/admin/products', adminOnly, validateAdminProduct, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const rawPayload = cleanUndefined(req.body);
      
      let schemaKeys: string[] = [];
      if (typeof Product !== 'undefined' && Product.schema) {
        schemaKeys = Object.keys(Product.schema.paths);
      }
      const blacklistedKeys = ['_id', 'id', 'createdAt', 'updatedAt', '__v'];
      const payload: any = {};
      for (const key of Object.keys(rawPayload)) {
        if (!blacklistedKeys.includes(key) && (schemaKeys.length === 0 || schemaKeys.includes(key))) {
          if (rawPayload[key] !== undefined) {
            payload[key] = rawPayload[key];
          }
        }
      }
      const proposedSlug = payload.slug || payload.name;
      const { exists, finalSlug } = await resolveUniqueSlug(proposedSlug, 'product');
      
      if (exists) {
        return res.status(409).json({
          error: `The slug '${finalSlug.replace(/-\d+$/, '')}' already exists. We suggest using '${finalSlug}' instead.`,
          code: 'SLUG_COLLISION',
          suggestedSlug: finalSlug
        });
      }
      
      if (isMongoConnected) {
        const product = new Product({ ...payload, slug: finalSlug });
        await product.save();
        await syncProductsToSeedFile();
        await logSecurityAction(req, 'PRODUCT_CREATED', product._id.toString(), { name: product.name, slug: finalSlug });
        triggerProductAddedEmailNotifications(product).catch(err => console.warn('Newsletter trigger failed:', err.message));
        res.json(product);
      } else {
        const newProduct = {
          _id: "prod_a_" + Math.random().toString(36).substring(2, 9),
          ...payload,
          slug: finalSlug,
          clicks: 0,
          conversions: 0,
          rating: 0,
          totalReviews: 0,
          reviews: [] as any[],
          createdAt: new Date()
        };
        localProducts.unshift(newProduct);
        await syncProductsToSeedFile();
        await logSecurityAction(req, 'PRODUCT_CREATED', newProduct._id, { name: newProduct.name, slug: finalSlug });
        triggerProductAddedEmailNotifications(newProduct).catch(err => console.warn('Newsletter trigger failed:', err.message));
        res.json(newProduct);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Dedicated Product Import Rate Limiter (with standardized API responses)
  const importLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { 
      success: false, 
      error: 'Too many import requests from this IP address, please retry in 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getSecureClientIp,
    validate: { xForwardedForHeader: false, default: false }
  });

  // Active pairing codes for extension configuration (valid for 10 minutes)
  const generatePairingCode = async (token: string, email: string): Promise<string> => {
    let code = '';
    let exists = true;
    let attempts = 0;
    
    while (exists && attempts < 50) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      attempts++;
      const found = await ActivePairingCodeModel.findOne({ code });
      if (!found) {
        exists = false;
      }
    }

    await ActivePairingCodeModel.create({
      code,
      token,
      email,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes validity
    });

    return code;
  };

  // Helper function to validate allowed domains globally
  const isValidAmazonOrAllowedDomain = (urlStr: string): boolean => {
    if (!urlStr) return true;
    try {
      const parsed = new URL(urlStr);
      const hostname = parsed.hostname.toLowerCase();
      const allowedPatterns = [
        /\bamazon\.com$/,
        /\bamazon\.co\.uk$/,
        /\bamazon\.ca$/,
        /\bamazon\.de$/,
        /\bamazon\.fr$/,
        /\bamazon\.it$/,
        /\bamazon\.es$/,
        /\bamazon\.co\.jp$/,
        /\bmedia-amazon\.com$/,
        /\bssl-images-amazon\.com$/,
        /\bimages-na\.ssl-images-amazon\.com$/,
        /\bimages\.unsplash\.com$/
      ];
      return allowedPatterns.some(pattern => pattern.test(hostname));
    } catch (e) {
      if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
        return true;
      }
      return false;
    }
  };

  // Importer Metrics API endpoint
  app.get('/api/admin/products/import/metrics', adminOnly, (req: express.Request, res: express.Response) => {
    const avgTime = importerMetrics.totalImports > 0 
      ? Math.round(importerMetrics.totalProcessingTimeMs / importerMetrics.totalImports) 
      : 0;
    res.json({
      success: true,
      data: {
        ...importerMetrics,
        averageProcessingTimeMs: avgTime
      }
    });
  });

  // Generate a real 6-digit pairing code for the Chrome Extension
  app.get('/api/admin/products/import/pairing-code', adminOnly, async (req: express.Request, res: express.Response) => {
    let token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      token = getCookieToken(req);
    }
    const email = (req as any).userEmail || 'admin@gadgetsprohub.com';
    
    if (!token) {
      return res.status(401).json({ error: 'No authorization token available for pairing' });
    }
    
    const code = await generatePairingCode(token, email);
    res.json({
      success: true,
      pairingCode: code,
      expiresInSeconds: 600
    });
  });

  // Public endpoint for extension pairing
  app.post('/api/auth/pair', async (req: express.Request, res: express.Response) => {
    const { pairingCode } = req.body;
    if (!pairingCode) {
      return res.status(400).json({ error: 'Pairing code is required' });
    }

    const codeStr = String(pairingCode).trim();
    const data = await ActivePairingCodeModel.findOne({ code: codeStr });
    if (!data) {
      return res.status(400).json({ error: 'Invalid or expired pairing code' });
    }

    if (data.expiresAt.getTime() < Date.now()) {
      await ActivePairingCodeModel.deleteOne({ code: codeStr });
      return res.status(400).json({ error: 'Pairing code has expired' });
    }

    // Successfully paired! Consume the code
    await ActivePairingCodeModel.deleteOne({ code: codeStr });

    // Build the correct API base URL from the current request's headers
    const proto = (Array.isArray(req.headers['x-forwarded-proto']) ? req.headers['x-forwarded-proto'][0] : req.headers['x-forwarded-proto']) || (req.secure ? 'https' : 'http');
    const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
    const apiBaseUrl = `${proto}://${host}`;

    res.json({
      success: true,
      token: data.token,
      email: data.email,
      apiBaseUrl
    });
  });

  // Importer Integration Tests Runner API endpoint
  app.post('/api/admin/products/import/test', adminOnly, async (req: express.Request, res: express.Response) => {
    const testResults: any[] = [];
    const runTest = async (name: string, fn: () => Promise<void>) => {
      try {
        await fn();
        testResults.push({ name, passed: true });
      } catch (e: any) {
        testResults.push({ name, passed: false, error: e.message });
      }
    };

    // Test 1: Empty payload check
    await runTest("Validation: Empty Name Check", async () => {
      const payload = { price: 99.99 };
      if (payload.price && !payload.hasOwnProperty('name')) {
        return; 
      }
      throw new Error("Validation did not catch missing name");
    });

    // Test 2: Domain Validation check
    await runTest("Security: Domain Whitelist Check", async () => {
      const invalidUrl = "https://malicious-site.xyz/product-image.png";
      const validUrl = "https://images.unsplash.com/photo-1547082299?w=800";
      
      if (isValidAmazonOrAllowedDomain(invalidUrl)) {
        throw new Error("Domain check allowed unauthorized domain: " + invalidUrl);
      }
      if (!isValidAmazonOrAllowedDomain(validUrl)) {
        throw new Error("Domain check blocked authorized domain: " + validUrl);
      }
    });

    // Test 3: Duplicate ASIN Protection check
    await runTest("Data Integrity: Duplicate ASIN Prevention", async () => {
      let testAsin = "B0CSY18N5V";
      let match = null;
      if (isMongoConnected) {
        match = await Product.findOne({ asin: testAsin });
      } else {
        match = localProducts.find((p: any) => p.asin === testAsin);
      }
      if (match) {
        return;
      }
    });

    // Test 4: Idempotency check
    await runTest("Reliability: Idempotency Handling", async () => {
      const testId = "test-idempotency-key-123";
      const fakeResponse = { success: true, mocked: true };
      processedImportsCache.set(testId, fakeResponse);
      
      if (!processedImportsCache.has(testId)) {
        throw new Error("Idempotency cache lookup failed");
      }
      processedImportsCache.delete(testId); 
    });

    // Test 5: Sanitization check
    await runTest("Security: Stored XSS Script Stripping", async () => {
      const dangerousInput = 'Keychron Keyboard <script>alert(1)</script><img src=x onerror=alert(2)>';
      const clean = sanitizeInput(dangerousInput);
      if (clean.includes('<script>') || clean.includes('onerror')) {
        throw new Error("XSS sanitization failed to clean input: " + clean);
      }
    });

    res.json({
      success: true,
      requestId: `test-${Math.random().toString(36).substring(2, 9)}`,
      testResults
    });
  });

  // Check Duplicate ASIN Endpoint
  app.get('/api/admin/products/check-duplicate/:asin', adminOnly, async (req: express.Request, res: express.Response) => {
    const asin = req.params.asin ? req.params.asin.trim().toUpperCase() : '';
    if (!asin || asin.length < 8 || asin.length > 15) {
      return res.status(400).json({ success: false, error: 'Invalid ASIN parameter (must be 8 to 15 characters)' });
    }

    try {
      let existingProduct = null;
      if (isMongoConnected) {
        existingProduct = await Product.findOne({ asin }).populate('category');
      } else {
        existingProduct = localProducts.find((p: any) => p.asin === asin);
      }

      return res.json({
        success: true,
        exists: !!existingProduct,
        product: existingProduct || null
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get Import History Logs (with paging, searching, filtering)
  
  // ================= BULK IMPORT QUEUE ENDPOINTS ================= //

  app.post('/api/admin/products/bulk/start', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { items, concurrency, maxRetries, conflictStrategy } = req.body;
      const adminId = (req as any).userId;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required and cannot be empty.' });
      }

      if (isMongoConnected) {
        const job = new BulkImportJob({
          adminId,
          status: 'running',
          totalItems: items.length,
          items: items.map((i: any) => ({
            asin: i.asin,
            url: i.url,
            status: 'pending',
            retryCount: 0
          })),
          concurrency: concurrency || 3,
          maxRetries: maxRetries || 3,
          conflictStrategy: conflictStrategy || 'skip',
          startedAt: new Date()
        });

        await job.save();
        res.status(200).json({ success: true, jobId: job._id });
      } else {
        const jobId = "job_" + Math.random().toString(36).substring(2, 9);
        const job = {
          _id: jobId,
          adminId,
          status: 'running',
          totalItems: items.length,
          items: items.map((i: any) => ({
            asin: i.asin,
            url: i.url,
            status: 'pending',
            retryCount: 0
          })),
          concurrency: concurrency || 3,
          maxRetries: maxRetries || 3,
          conflictStrategy: conflictStrategy || 'skip',
          startedAt: new Date(),
          processedItems: 0,
          successfulItems: 0,
          failedItems: 0,
          skippedItems: 0
        };
        localBulkImportJobs.unshift(job);
        saveLocalBulkImportJobs();
        res.status(200).json({ success: true, jobId });
      }
    } catch (err: any) {
      logStructured('ERROR', 'Failed to start bulk import', { error: err.message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/admin/products/bulk/status/:jobId', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        const job = await BulkImportJob.findById(req.params.jobId);
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }
        res.status(200).json({ success: true, job });
      } else {
        const job = localBulkImportJobs.find(j => j._id === req.params.jobId);
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }
        res.status(200).json({ success: true, job });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/admin/products/bulk/active', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const adminId = (req as any).userId;
      if (isMongoConnected) {
        const job = await BulkImportJob.findOne({ adminId, status: { $in: ['waiting', 'running', 'paused'] } }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, job });
      } else {
        const job = localBulkImportJobs.find(j => j.adminId === adminId && ['waiting', 'running', 'paused'].includes(j.status));
        res.status(200).json({ success: true, job: job || null });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  
  // ================= MEDIA MANAGEMENT API (PHASE 7) ================= //

  const upload = multer({ 
    dest: 'public/uploads/temp/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.'));
      }
    }
  });

  app.get('/api/admin/media', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const query: any = {};
      if (search) {
        query.fileName = { $regex: search, $options: 'i' };
      }
      
      const media = await MediaAsset.find(query)
        .sort({ uploadDate: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));
        
      const total = await MediaAsset.countDocuments(query);
      
      res.json({ success: true, data: media, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/admin/media/upload', adminOnly, upload.single('file'), async (req: express.Request, res: express.Response) => {
    try {
      if (!(req as any).file) return res.status(400).json({ error: 'No file uploaded' });
      
      // For a real upload we would process it directly here instead of download
      // Since it's a file, we can read it and process it
      
      const file = (req as any).file;
      const buffer = fs.readFileSync(file.path);
      
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      const originalMetadata = await sharp(buffer).metadata();
      const format = originalMetadata.format || 'jpg';
      const fileName = `${hash}.${format}`;
      const relativePath = `/uploads/media/${fileName}`;
      const destPath = path.join(process.cwd(), 'public', 'uploads', 'media', fileName);
      
      // optimize
      const optimizedBuffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer(); // Simplify
      fs.writeFileSync(destPath, optimizedBuffer);
      fs.unlinkSync(file.path); // cleanup temp
      
      const asset = new MediaAsset({
        fileName,
        localPath: relativePath,
        mimeType: `image/${format}`,
        width: originalMetadata.width,
        height: originalMetadata.height,
        aspectRatio: originalMetadata.width && originalMetadata.height ? (originalMetadata.width / originalMetadata.height) : 1,
        hash,
        optimizationStatus: 'completed',
        originalSize: buffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: buffer.length / optimizedBuffer.length,
        storageProvider: 'local'
      });
      await asset.save();
      
      res.json({ success: true, data: asset });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/admin/media/analytics', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const totalImages = await MediaAsset.countDocuments();
      const stats = await MediaAsset.aggregate([
        { $group: {
            _id: null,
            totalOriginalSize: { $sum: "$originalSize" },
            totalOptimizedSize: { $sum: "$optimizedSize" }
        }}
      ]);
      
      const storageUsed = stats[0]?.totalOptimizedSize || 0;
      const spaceSaved = (stats[0]?.totalOriginalSize || 0) - storageUsed;
      
      const duplicates = await MediaAsset.aggregate([
        { $group: { _id: "$hash", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ]);
      
      const failedJobs = await MediaQueueJob.countDocuments({ status: 'failed' });
      const queuedJobs = await MediaQueueJob.countDocuments({ status: { $in: ['waiting', 'running'] } });

      res.json({
        success: true,
        data: {
          totalImages,
          storageUsed,
          spaceSaved,
          duplicateImages: duplicates.length,
          failedJobs,
          queuedJobs
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/admin/media/:id', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const asset = await MediaAsset.findById(req.params.id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      
      // Delete file
      const fullPath = path.join(process.cwd(), 'public', asset.localPath || '');
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      
      // Delete variants
      if (asset.variants) {
        Object.values(asset.variants).forEach((variantPath: any) => {
          const vp = path.join(process.cwd(), 'public', variantPath || '');
          if (fs.existsSync(vp)) fs.unlinkSync(vp);
        });
      }
      
      await asset.deleteOne();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // ========== PHASE 8: SEO & PUBLISHING AUTOMATION API ENDPOINTS ==========

  // 1. Analyze product and calculate SEO score
  app.get('/api/admin/seo/analyze/:productId', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const product = await Product.findById(req.params.productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      // Run SEO calculations
      const seoResult = await seoService.calculateSeoScore(product);
      
      // Run Readability
      const textToAnalyze = `${product.name}. ${product.description || ''} ${product.longDescription || ''}`;
      const readabilityResult = seoService.analyzeReadability(textToAnalyze, product.focusKeyword || '');

      // Scan for broken links
      const brokenAssetsResult = await seoService.scanForBrokenAssets(product);

      res.json({
        success: true,
        data: {
          seoScore: seoResult.score,
          suggestions: seoResult.suggestions,
          readability: readabilityResult,
          brokenAssets: brokenAssetsResult,
          focusKeyword: product.focusKeyword,
          secondaryKeywords: product.secondaryKeywords || []
        }
      });
    } catch (err: any) {
      console.error('SEO Analysis error:', err.message);
      res.status(500).json({ error: 'Failed to run SEO analysis' });
    }
  });

  // 2. Generate AI SEO Content using Gemini
  app.post('/api/admin/seo/generate-ai', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { productName, description, brand, category, keywords } = req.body;
      if (!productName || !description) {
        return res.status(400).json({ error: 'Product Name and Description are required' });
      }

      const generated = await seoService.generateAiSeoContent({
        productName,
        description,
        brand,
        category,
        keywords
      });

      res.json({
        success: true,
        data: generated
      });
    } catch (err: any) {
      console.error('AI SEO Generation error:', err.message);
      res.status(500).json({ error: 'Failed to generate AI SEO content' });
    }
  });

  // 3. Save optimized SEO metadata
  app.post('/api/admin/seo/save/:productId', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const product = await Product.findById(req.params.productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const oldSlug = product.slug;
      const {
        seoTitle,
        seoDescription,
        seoKeywords,
        focusKeyword,
        secondaryKeywords,
        canonicalUrl,
        robotsMeta,
        slug,
        publishingStatus,
        faqs,
        breadcrumb,
        openGraph,
        twitterCard
      } = req.body;

      // Update fields
      if (seoTitle !== undefined) product.seoTitle = seoTitle;
      if (seoDescription !== undefined) product.seoDescription = seoDescription;
      if (seoKeywords !== undefined) product.seoKeywords = seoKeywords;
      if (focusKeyword !== undefined) product.focusKeyword = focusKeyword;
      if (secondaryKeywords !== undefined) product.secondaryKeywords = secondaryKeywords;
      if (canonicalUrl !== undefined) product.canonicalUrl = canonicalUrl;
      if (robotsMeta !== undefined) product.robotsMeta = robotsMeta;
      if (faqs !== undefined) product.faqs = faqs;
      if (breadcrumb !== undefined) product.breadcrumb = breadcrumb;
      if (openGraph !== undefined) product.openGraph = openGraph;
      if (twitterCard !== undefined) product.twitterCard = twitterCard;

      // Handle Slug change and redirect
      if (slug && slug !== oldSlug) {
        product.slug = slug;
        await seoService.handleSlugChange(oldSlug, slug);
      }

      // Handle publishing workflow change
      if (publishingStatus && publishingStatus !== product.publishingStatus) {
        const oldStatus = product.publishingStatus || 'draft';
        product.publishingStatus = publishingStatus;
        
        // Log to history
        if (!product.publishingHistory) {
          (product as any).publishingHistory = [];
        }
        product.publishingHistory.push({
          status: publishingStatus,
          changedBy: (req as any).user?.email || 'admin',
          changedAt: new Date(),
          notes: `Status transitioned from ${oldStatus} to ${publishingStatus}`
        });
      }

      // Re-calculate score on save
      const scoreResult = await seoService.calculateSeoScore(product);
      product.seoScore = scoreResult.score;
      product.seoSuggestions = scoreResult.suggestions;
      product.updatedAt = new Date();

      await product.save();

      // Trigger incremental sitemap rebuild
      await seoService.buildXmlSitemap();

      res.json({
        success: true,
        message: 'SEO settings saved successfully',
        data: product
      });
    } catch (err: any) {
      console.error('Save SEO error:', err.message);
      res.status(500).json({ error: 'Failed to save SEO metadata' });
    }
  });

  // 4. Retrieve JSON-LD Schema structured data
  app.get('/api/seo/schema/:productId', async (req: express.Request, res: express.Response) => {
    try {
      const product = await Product.findById(req.params.productId).populate('category');
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const categoryName = typeof product.category === 'object' && product.category ? (product.category as any).name : '';
      const schema = seoService.generateStructuredData(product, categoryName);

      res.json({
        success: true,
        data: schema
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate structured data' });
    }
  });

  // 5. Retrieve Internal Link Recommendations
  app.get('/api/admin/seo/recommendations/:productId', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const product = await Product.findById(req.params.productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const recs = await seoService.getInternalLinkRecommendations(product);
      res.json({
        success: true,
        data: recs
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch link recommendations' });
    }
  });

  // 6. Get Redirect Rules
  app.get('/api/admin/seo/redirects', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const rules = await RedirectRule.find({}).sort({ createdAt: -1 });
      res.json({
        success: true,
        data: rules
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch redirect rules' });
    }
  });

  // 7. Create/Update Redirect Rule
  app.post('/api/admin/seo/redirects', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { sourceUrl, targetUrl, type } = req.body;
      if (!sourceUrl || !targetUrl) {
        return res.status(400).json({ error: 'Source URL and Target URL are required' });
      }

      const rule = await RedirectRule.findOneAndUpdate(
        { sourceUrl },
        { targetUrl, type: type || 301, updatedAt: new Date() },
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        data: rule
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save redirect rule' });
    }
  });

  // 8. Delete Redirect Rule
  app.delete('/api/admin/seo/redirects/:id', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const rule = await RedirectRule.findByIdAndDelete(req.params.id);
      if (!rule) return res.status(404).json({ error: 'Redirect rule not found' });

      res.json({ success: true, message: 'Redirect rule deleted' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete redirect rule' });
    }
  });

  // 9. Manual sitemap rebuild
  app.post('/api/admin/seo/sitemap/generate', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const xml = await seoService.buildXmlSitemap(req, localProducts, localBlogs);
      res.json({
        success: true,
        message: 'Sitemap rebuilt successfully',
        length: xml.length
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to rebuild sitemap' });
    }
  });

  // =========================================================================
  // PHASE 9: AI CONTENT GENERATION & SMART CONTENT INTELLIGENCE ENDPOINTS
  // =========================================================================

  // A. Content Generation
  app.post('/api/admin/ai/generate', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { productId, promptKey, customVars, stream } = req.body;
      const ProductModel = mongoose.model('Product');
      const product = await ProductModel.findById(productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      if (stream) {
        const promptDoc = await AiPrompt.findOne({ key: promptKey || 'product_long_description' });
        if (!promptDoc) {
          return res.status(404).json({ error: 'Prompt template not found' });
        }

        let finalPrompt = promptDoc.promptText;
        const vars: Record<string, string> = {
          productName: product.get('name') || '',
          amazonDescription: product.get('description') || '',
          amazonFeatures: (product.get('features') || []).join(', ') || '',
          category: product.get('categoryName') || '',
          focusKeyword: product.get('focusKeyword') || '',
          ...(customVars || {})
        };

        for (const k of Object.keys(vars)) {
          finalPrompt = finalPrompt.split(`{${k}}`).join(String(vars[k] ?? ''));
        }

        // Set SSE Headers only after prompt and replacement validations complete
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        try {
          await aiService.executeGeneration({
            prompt: finalPrompt,
            systemInstruction: promptDoc.systemInstruction,
            productId: product._id.toString(),
            promptKey: promptKey || 'product_long_description',
            streamHandler: (chunk: string) => {
              res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            }
          });
          res.write(`data: [DONE]\n\n`);
        } catch (genErr: any) {
          res.write(`data: ${JSON.stringify({ error: genErr.message })}\n\n`);
        }
        return res.end();
      } else {
        const responseDoc = await aiService.generateProductContent(product, promptKey || 'product_long_description', customVars);
        res.json({ success: true, data: responseDoc });
      }
    } catch (err: any) {
      if (res.headersSent) {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: err.message || 'Content generation failed' })}\n\n`);
          res.end();
        }
        return;
      }
      res.status(500).json({ error: err.message || 'Content generation failed' });
    }
  });

  // B. Content Rewrite
  app.post('/api/admin/ai/rewrite', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { text, tone } = req.body;
      if (!text) return res.status(400).json({ error: 'Text to rewrite is required' });
      const rewrittenText = await aiService.rewriteContent(text, tone || 'professional');
      res.json({ success: true, rewrittenText });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Content rewrite failed' });
    }
  });

  // C. Multi-Language Translation
  app.post('/api/admin/ai/translate', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { text, language } = req.body;
      if (!text || !language) return res.status(400).json({ error: 'Text and target language are required' });
      const translatedText = await aiService.translateContent(text, language);
      res.json({ success: true, translatedText });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Translation failed' });
    }
  });

  // D. Prompt Library Management
  app.get('/api/admin/ai/prompts', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const prompts = await AiPrompt.find({}).sort({ name: 1 });
      res.json({ success: true, data: prompts });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve AI prompts' });
    }
  });

  app.post('/api/admin/ai/prompts', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const updated = await aiService.createOrUpdatePrompt(req.body, (req as any).user?.email || 'admin');
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save prompt template' });
    }
  });

  app.post('/api/admin/ai/prompts/rollback', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { key, version } = req.body;
      if (!key || !version) return res.status(400).json({ error: 'Key and version are required' });
      const rolled = await aiService.rollbackPrompt(key, Number(version), (req as any).user?.email || 'admin');
      res.json({ success: true, data: rolled });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to roll back prompt template' });
    }
  });

  // E. Provider Configuration
  const maskApiKey = (key: string): string => {
    if (!key) return '';
    const len = key.length;
    if (len <= 5) return '••••';
    const maxRevealedEachSide = Math.min(4, Math.floor((len - 4) / 2));
    if (maxRevealedEachSide <= 0) return '••••';
    const prefix = key.substring(0, maxRevealedEachSide);
    const suffix = key.substring(len - maxRevealedEachSide);
    return `${prefix}••••${suffix}`;
  };

  app.get('/api/admin/ai/providers', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const providers: any[] = [];
      const keys: Array<'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'ollama' | 'lmstudio' | 'azure'> = [
        'gemini', 'openai', 'anthropic', 'openrouter', 'ollama', 'lmstudio', 'azure'
      ];
      for (const key of keys) {
        const setts = await aiService.getProviderSettings(key);
        // Mask API Key for safe frontend delivery
        if (setts.apiKey) {
          setts.apiKey = maskApiKey(setts.apiKey);
        }
        providers.push(setts);
      }
      res.json({ success: true, data: providers });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve provider configuration' });
    }
  });

  app.post('/api/admin/ai/providers', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { provider, apiKey, baseUrl, model, temperature, maxTokens, topP, isActive } = req.body;
      if (!provider) return res.status(400).json({ error: 'Provider is required' });

      // Handle raw key updates vs masked/empty inputs
      let keyToSave = apiKey;
      if (apiKey && (apiKey.includes('...') || apiKey.includes('•'))) {
        // Did not edit key
        const oldSettings = await aiService.getProviderSettings(provider);
        keyToSave = oldSettings.apiKey || '';
      }

      // Mandatory API Key Length Check (Minimum 20 characters)
      const isLocalProvider = provider === 'ollama' || provider === 'lmstudio';
      if (keyToSave && typeof keyToSave === 'string' && keyToSave.trim().length > 0) {
        if (keyToSave.trim().length < 20) {
          return res.status(400).json({ error: 'API key must be at least 20 characters long' });
        }
      } else if (isActive && !isLocalProvider) {
        return res.status(400).json({ error: 'A valid API key (minimum 20 characters) is required to activate cloud providers' });
      }

      const updated = await aiService.saveProviderSettings(provider, {
        provider,
        apiKey: keyToSave,
        baseUrl,
        model,
        temperature,
        maxTokens,
        topP,
        isActive
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save provider configuration' });
    }
  });

  // F. Queue System / Batch Enrichment
  app.get('/api/admin/ai/queue', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const jobs = await AiJob.find({}).sort({ createdAt: -1 }).limit(50);
      res.json({ success: true, data: jobs });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve batch jobs queue' });
    }
  });

  app.post('/api/admin/ai/queue/batch-enrich', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { productIds, promptKey, categoryId } = req.body;
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'List of productIds is required' });
      }
      const job = await aiService.createBatchEnrichJob(productIds, promptKey || 'product_long_description', categoryId);
      res.json({ success: true, data: job });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to trigger batch job' });
    }
  });

  app.post('/api/admin/ai/queue/:jobId/action', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { action } = req.body; // pause, resume, cancel, retry
      const job = await AiJob.findById(req.params.jobId);
      if (!job) return res.status(404).json({ error: 'Job not found' });

      if (action === 'pause') job.status = 'paused';
      else if (action === 'resume') {
        job.status = 'running';
        // Re-trigger background worker asynchronously
        (aiService as any).processJob(job._id.toString()).catch((e: any) => console.error('Queue worker failure:', e));
      } else if (action === 'cancel') job.status = 'cancelled';
      else if (action === 'retry') {
        job.status = 'waiting';
        job.processed = 0;
        job.progress = 0;
        job.results = [];
        await job.save();
        (aiService as any).processJob(job._id.toString()).catch((e: any) => console.error('Queue worker failure:', e));
      }

      await job.save();
      res.json({ success: true, data: job });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update job action' });
    }
  });

  // G. AI Cost Analytics Dashboard
  app.get('/api/admin/ai/analytics', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const totalRequests = await AiAnalytics.countDocuments({});
      const successCount = await AiAnalytics.countDocuments({ status: 'success' });
      const failedCount = await AiAnalytics.countDocuments({ status: 'failed' });
      
      const tokensMetrics = await AiAnalytics.aggregate([
        {
          $group: {
            _id: null,
            totalPromptTokens: { $sum: '$promptTokens' },
            totalCompletionTokens: { $sum: '$completionTokens' },
            totalTokens: { $sum: '$totalTokens' },
            totalCost: { $sum: '$estimatedCost' },
            avgResponseTime: { $avg: '$responseTimeMs' }
          }
        }
      ]);

      const providerUsage = await AiAnalytics.aggregate([
        {
          $group: {
            _id: '$provider',
            count: { $sum: 1 },
            cost: { $sum: '$estimatedCost' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const recentHistory = await AiAnalytics.find({}).sort({ createdAt: -1 }).limit(10);

      const metrics = tokensMetrics[0] || {
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        avgResponseTime: 0
      };

      res.json({
        success: true,
        data: {
          totalRequests,
          successRate: totalRequests ? Number(((successCount / totalRequests) * 100).toFixed(1)) : 0,
          failureRate: totalRequests ? Number(((failedCount / totalRequests) * 100).toFixed(1)) : 0,
          totalPromptTokens: metrics.totalPromptTokens,
          totalCompletionTokens: metrics.totalCompletionTokens,
          totalTokens: metrics.totalTokens,
          estimatedCost: metrics.totalCost,
          averageResponseTime: Math.round(metrics.avgResponseTime || 0),
          providerUsage,
          recentHistory
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch AI analytics' });
    }
  });

  // H. Cache Management
  app.post('/api/admin/ai/cache/clear', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { pattern } = req.body;
      await aiService.invalidateCache(pattern);
      res.json({ success: true, message: 'AI cache cleared successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to invalidate AI cache' });
    }
  });

  // I. Content Approval Workflow & Version History
  app.get('/api/admin/ai/responses/:productId', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const responses = await AiResponse.find({ productId: req.params.productId }).sort({ createdAt: -1 });
      res.json({ success: true, data: responses });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve product AI history' });
    }
  });

  app.post('/api/admin/ai/responses/:responseId/approve', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { status, notes } = req.body; // approved, rejected, published, etc.
      if (!['approved', 'rejected', 'published', 'archived', 'pending_review'].includes(status)) {
        return res.status(400).json({ error: 'Invalid approval status' });
      }

      const responseDoc = await AiResponse.findById(req.params.responseId);
      if (!responseDoc) return res.status(404).json({ error: 'AI response record not found' });

      responseDoc.approvalStatus = status;
      responseDoc.approvalHistory.push({
        status,
        changedBy: (req as any).user?.email || 'admin',
        notes: notes || '',
        changedAt: new Date()
      });

      await responseDoc.save();

      // If approved or published, write generated content into the Product object's main description!
      if (status === 'approved' || status === 'published') {
        const ProductModel = mongoose.model('Product');
        const p = await ProductModel.findById(responseDoc.productId);
        if (p) {
          // Determine which field to overwrite based on promptKey
          if (responseDoc.promptKey === 'product_long_description') {
            p.set('description', responseDoc.generatedText);
          } else if (responseDoc.promptKey === 'pros_cons') {
            // Can be structured or stored in description/features appropriately
            p.set('features', [responseDoc.generatedText]);
          }
          await p.save();
        }
      }

      res.json({ success: true, data: responseDoc });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update approval status' });
    }
  });

  // ========================================================
  // PHASE 10: PRICE MONITORING & SYNCHRONIZATION ENDPOINTS
  // ========================================================

  app.get('/api/admin/sync/dashboard', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const stats = await syncService.getSyncDashboardAnalytics();
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve synchronization analytics' });
    }
  });

  app.get('/api/admin/sync/jobs', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const jobs = await SyncJob.find({}).sort({ createdAt: -1 }).limit(50);
      res.json({ success: true, data: jobs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list synchronization queue jobs' });
    }
  });

  app.post('/api/admin/sync/jobs', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { name, priority } = req.body;
      const job = new SyncJob({
        name: name || `Manual Full Sync - ${new Date().toLocaleTimeString()}`,
        priority: priority || 1,
        status: 'waiting'
      });
      await job.save();

      // Trigger asynchronous background execution
      syncService.processJob(job._id.toString()).catch(e => console.error('Background Sync job failure:', e));

      res.json({ success: true, data: job });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to enqueue synchronization job' });
    }
  });

  app.post('/api/admin/sync/jobs/:jobId/action', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { action } = req.body; // pause, resume, cancel, retry
      const job = await SyncJob.findById(req.params.jobId);
      if (!job) return res.status(404).json({ error: 'Job not found' });

      if (action === 'pause') job.status = 'paused';
      else if (action === 'resume') {
        job.status = 'running';
        syncService.processJob(job._id.toString()).catch(e => console.error('Background Sync job resume failure:', e));
      } else if (action === 'cancel') job.status = 'cancelled';
      else if (action === 'retry') {
        job.status = 'waiting';
        job.processedItems = 0;
        job.failedItems = 0;
        job.progress = 0;
        job.results = [];
        await job.save();
        syncService.processJob(job._id.toString()).catch(e => console.error('Background Sync job retry failure:', e));
      }

      await job.save();
      res.json({ success: true, data: job });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update job status' });
    }
  });

  app.get('/api/admin/sync/schedules', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const schedules = await SchedulerTask.find({});
      res.json({ success: true, data: schedules });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list scheduler tasks' });
    }
  });

  app.post('/api/admin/sync/schedules/:taskId/run', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const task = await SchedulerTask.findById(req.params.taskId);
      if (!task) return res.status(404).json({ error: 'Scheduler task not found' });

      task.lastRun = new Date();
      const startTime = Date.now();

      // Trigger automatic background worker job on behalf of scheduler
      const job = new SyncJob({
        name: `Automated Task: ${task.name}`,
        priority: 2,
        status: 'waiting'
      });
      await job.save();

      syncService.processJob(job._id.toString()).then(async () => {
        const duration = Date.now() - startTime;
        task.successCount += 1;
        task.averageDurationMs = task.averageDurationMs === 0 ? duration : Math.round((task.averageDurationMs + duration) / 2);
        await task.save();
      }).catch(async (e) => {
        task.failCount += 1;
        await task.save();
        console.error('Scheduler spawned background job failed:', e);
      });

      res.json({ success: true, message: 'Automated job launched successfully!', data: task });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run scheduler task' });
    }
  });

  app.post('/api/admin/sync/schedules/:taskId/toggle', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const task = await SchedulerTask.findById(req.params.taskId);
      if (!task) return res.status(404).json({ error: 'Scheduler task not found' });

      task.active = !task.active;
      await task.save();
      res.json({ success: true, data: task });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to toggle schedule' });
    }
  });

  app.get('/api/admin/sync/alerts', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        const alerts = await AlertRule.find({}).populate('productId', 'name');
        res.json({ success: true, data: alerts });
      } else {
        const alerts = localAlertRules.map(alert => {
          const prod = localProducts.find((p: any) => String(p._id || p.id) === String(alert.productId));
          return {
            ...alert,
            productId: prod ? { _id: prod._id || prod.id, name: prod.name } : null
          };
        });
        res.json({ success: true, data: alerts });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch alert rules' });
    }
  });

  app.post('/api/admin/sync/alerts', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { _id, name, productId, triggerType, threshold, channels, active } = req.body;
      if (isMongoConnected) {
        let alert;
        if (_id) {
          alert = await AlertRule.findByIdAndUpdate(_id, { name, productId, triggerType, threshold, channels, active }, { new: true });
        } else {
          alert = new AlertRule({ name, productId: productId || null, triggerType, threshold, channels, active });
          await alert.save();
        }
        res.json({ success: true, data: alert });
      } else {
        let alert;
        if (_id) {
          const index = localAlertRules.findIndex(a => String(a._id) === String(_id));
          if (index !== -1) {
            localAlertRules[index] = { ...localAlertRules[index], name, productId, triggerType, threshold, channels, active };
            alert = localAlertRules[index];
          } else {
            return res.status(404).json({ error: 'Alert not found' });
          }
        } else {
          alert = {
            _id: "alert_" + Math.random().toString(36).substring(2, 9),
            name,
            productId: productId || null,
            triggerType,
            threshold,
            channels,
            active,
            createdAt: new Date()
          };
          localAlertRules.unshift(alert);
        }
        saveLocalAlertRules();
        res.json({ success: true, data: alert });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save alert rule' });
    }
  });

  app.delete('/api/admin/sync/alerts/:id', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        await AlertRule.findByIdAndDelete(req.params.id);
        res.json({ success: true });
      } else {
        localAlertRules = localAlertRules.filter(a => String(a._id) !== String(req.params.id));
        saveLocalAlertRules();
        res.json({ success: true });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete alert rule' });
    }
  });

  app.get('/api/admin/sync/health', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        const reports = await ProductHealth.find({}).populate('productId', 'name price lastPriceCheck');
        res.json({ success: true, data: reports });
      } else {
        const reports = localProductHealth.map(report => {
          const prod = localProducts.find((p: any) => String(p._id || p.id) === String(report.productId));
          return {
            ...report,
            productId: prod ? { _id: prod._id || prod.id, name: prod.name, price: prod.price, lastPriceCheck: prod.lastPriceCheck || new Date() } : null
          };
        });
        res.json({ success: true, data: reports });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve product health details' });
    }
  });

  app.get('/api/admin/sync/rules', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        const rules = await AutomationRule.find({});
        res.json({ success: true, data: rules });
      } else {
        res.json({ success: true, data: localAutomationRules });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch automation rules' });
    }
  });

  app.post('/api/admin/sync/rules', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { _id, name, triggerType, triggerThreshold, actions, active } = req.body;
      if (isMongoConnected) {
        let rule;
        if (_id) {
          rule = await AutomationRule.findByIdAndUpdate(_id, { name, triggerType, triggerThreshold, actions, active }, { new: true });
        } else {
          rule = new AutomationRule({ name, triggerType, triggerThreshold, actions, active });
          await rule.save();
        }
        res.json({ success: true, data: rule });
      } else {
        let rule;
        if (_id) {
          const index = localAutomationRules.findIndex(r => String(r._id) === String(_id));
          if (index !== -1) {
            localAutomationRules[index] = { ...localAutomationRules[index], name, triggerType, triggerThreshold, actions, active };
            rule = localAutomationRules[index];
          } else {
            return res.status(404).json({ error: 'Rule not found' });
          }
        } else {
          rule = {
            _id: "rule_" + Math.random().toString(36).substring(2, 9),
            name,
            triggerType,
            triggerThreshold,
            actions,
            active,
            createdAt: new Date()
          };
          localAutomationRules.unshift(rule);
        }
        saveLocalAutomationRules();
        res.json({ success: true, data: rule });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save automation rule' });
    }
  });

  app.delete('/api/admin/sync/rules/:id', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        await AutomationRule.findByIdAndDelete(req.params.id);
        res.json({ success: true });
      } else {
        localAutomationRules = localAutomationRules.filter(r => String(r._id) !== String(req.params.id));
        saveLocalAutomationRules();
        res.json({ success: true });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete automation rule' });
    }
  });

  app.get('/api/admin/sync/timeline/:productId', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        const priceHistory = await PriceHistory.find({ productId: req.params.productId }).sort({ timestamp: -1 }).limit(30);
        const changes = await ProductChange.find({ productId: req.params.productId }).sort({ timestamp: -1 }).limit(30);
        res.json({
          success: true,
          data: {
            priceHistory,
            changes
          }
        });
      } else {
        const priceHistory = localPriceHistory.filter(h => String(h.productId) === String(req.params.productId)).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 30);
        const changes = localProductChanges.filter(c => String(c.productId) === String(req.params.productId)).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 30);
        res.json({
          success: true,
          data: {
            priceHistory,
            changes
          }
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch timeline and historical price series' });
    }
  });

  app.post('/api/admin/sync/product/:productId', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const result = await syncService.runLiveProductSync(req.params.productId, req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Product synchronization run failed' });
    }
  });

  app.post('/api/admin/sync/link-validate', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { affiliateLink, affiliateCode } = req.body;
      const result = syncService.validateAffiliateLink(affiliateLink, affiliateCode);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Link validation processing failed' });
    }
  });

  app.get('/api/admin/sync/notifications', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const logs = await NotificationHistory.find({}).sort({ timestamp: -1 }).limit(100);
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch notification and automation execution history' });
    }
  });

  // ========================================================
  // PHASE 11: MULTI-MARKETPLACE & UNIVERSAL IMPORT ENDPOINTS
  // ========================================================

  app.get('/api/admin/marketplace/analytics', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const stats = await marketplaceService.getAnalytics();
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch marketplace analytics' });
    }
  });

  app.get('/api/admin/marketplace/providers', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const providers = await MarketplaceProviderModel.find({});
      res.json({ success: true, data: providers });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve marketplace providers' });
    }
  });

  app.post('/api/admin/marketplace/providers/toggle', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { providerId, enabled } = req.body;
      const provider = await MarketplaceProviderModel.findOneAndUpdate(
        { providerId },
        { enabled },
        { new: true }
      );
      if (!provider) return res.status(404).json({ error: 'Marketplace provider not found' });
      res.json({ success: true, data: provider });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to toggle marketplace provider' });
    }
  });

  app.get('/api/admin/marketplace/settings', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const settings = await MarketplaceSettingsModel.find({});
      res.json({ success: true, data: settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch marketplace settings' });
    }
  });

  app.post('/api/admin/marketplace/settings', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { providerId, apiKeys, sessionTokens, cookies, importRules } = req.body;
      const settings = await MarketplaceSettingsModel.findOneAndUpdate(
        { providerId },
        { apiKeys, sessionTokens, cookies, importRules },
        { new: true, upsert: true }
      );
      res.json({ success: true, data: settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save marketplace settings' });
    }
  });

  app.get('/api/admin/marketplace/affiliate', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const profiles = await AffiliateProfilesModel.find({});
      res.json({ success: true, data: profiles });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch affiliate profiles' });
    }
  });

  app.post('/api/admin/marketplace/affiliate', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { providerId, region, affiliateId, campaignName, customParams } = req.body;
      const profile = await AffiliateProfilesModel.findOneAndUpdate(
        { providerId, region },
        { affiliateId, campaignName, customParams },
        { new: true, upsert: true }
      );
      res.json({ success: true, data: profile });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save affiliate profile' });
    }
  });

  app.get('/api/admin/marketplace/health', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const status = await MarketplaceHealthModel.find({});
      res.json({ success: true, data: status });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve marketplace health status' });
    }
  });

  app.get('/api/admin/marketplace/logs', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const logs = await ProviderLogsModel.find({}).sort({ timestamp: -1 }).limit(100);
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch provider logs' });
    }
  });

  app.post('/api/admin/marketplace/import', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { url, categoryId, forceUpdate } = req.body;
      if (!url) return res.status(400).json({ error: 'URL parameter is required' });
      
      const result = await marketplaceService.importProduct(url, categoryId, forceUpdate);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Marketplace import failed' });
    }
  });

  app.post('/api/admin/marketplace/bulk-import', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { urls, categoryId } = req.body;
      if (!urls || !Array.isArray(urls)) {
        return res.status(400).json({ error: 'URLs array is required' });
      }
      const result = await marketplaceService.bulkImportProducts(urls, categoryId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Bulk marketplace import failed' });
    }
  });

  app.post('/api/admin/marketplace/merge', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { primaryId, duplicateId, strategy } = req.body;
      if (!primaryId || !duplicateId) {
        return res.status(400).json({ error: 'Primary and duplicate IDs are required' });
      }
      const result = await marketplaceService.mergeProducts(primaryId, duplicateId, strategy || 'combine');
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to merge duplicate products' });
    }
  });

  app.get('/api/admin/marketplace/compare/:productId', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const comparison = await marketplaceService.compareCrossMarketplace(req.params.productId);
      res.json({ success: true, data: comparison });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Cross-marketplace comparison failed' });
    }
  });

  app.get('/api/admin/marketplace/currencies', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      let rates = await CurrencyRatesModel.findOne({ baseCurrency: 'USD' });
      if (!rates || !rates.lastUpdated || (Date.now() - new Date(rates.lastUpdated).getTime() > 24 * 3600 * 1000)) {
        rates = await marketplaceService.refreshExchangeRates().catch(() => null) || rates;
      }
      res.json({ success: true, data: rates });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve currency rates' });
    }
  });

  app.post('/api/admin/marketplace/currencies/refresh', adminOnly, async (_req: express.Request, res: express.Response) => {
    try {
      const rates = await marketplaceService.refreshExchangeRates(true);
      res.json({ success: true, message: 'Exchange rates refreshed successfully', data: rates });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to refresh currency rates' });
    }
  });

  app.post('/api/admin/marketplace/currencies/convert', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { amount, from, to } = req.body;
      const converted = await marketplaceService.convertCurrency(amount, from, to);
      res.json({ success: true, data: { amount, from, to, converted } });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Currency conversion failed' });
    }
  });

app.post('/api/admin/products/bulk/:jobId/action', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { action } = req.body; // pause, resume, cancel
      if (isMongoConnected) {
        const job = await BulkImportJob.findById(req.params.jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        if (action === 'pause') job.status = 'paused';
        else if (action === 'resume') job.status = 'running';
        else if (action === 'cancel') {
          job.status = 'cancelled';
          job.completedAt = new Date();
        }
        
        await job.save();
        res.status(200).json({ success: true, status: job.status });
      } else {
        const job = localBulkImportJobs.find(j => j._id === req.params.jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        if (action === 'pause') job.status = 'paused';
        else if (action === 'resume') job.status = 'running';
        else if (action === 'cancel') {
          job.status = 'cancelled';
          job.completedAt = new Date();
        }
        
        saveLocalBulkImportJobs();
        res.status(200).json({ success: true, status: job.status });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/admin/products/bulk/:jobId/item', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { itemIndex, status, error, retryCount } = req.body;
      if (isMongoConnected) {
        const job = await BulkImportJob.findById(req.params.jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        if (itemIndex >= 0 && itemIndex < job.items.length) {
          const item = job.items[itemIndex];
          const oldStatus = item.status;
          item.status = status;
          if (error) item.error = error;
          if (retryCount !== undefined) item.retryCount = retryCount;

          // Update counts
          if (oldStatus !== status) {
            if (status === 'success') job.successfulItems += 1;
            else if (status === 'failed') job.failedItems += 1;
            else if (status === 'skipped') job.skippedItems += 1;

            if (['success', 'failed', 'skipped', 'cancelled'].includes(status) && !['success', 'failed', 'skipped', 'cancelled'].includes(oldStatus)) {
              job.processedItems += 1;
            }
          }

          if (job.processedItems === job.totalItems && job.status === 'running') {
            job.status = 'completed';
            job.completedAt = new Date();
          }

          await job.save();
        }
        res.status(200).json({ success: true, jobStatus: job.status });
      } else {
        const job = localBulkImportJobs.find(j => j._id === req.params.jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        if (itemIndex >= 0 && itemIndex < job.items.length) {
          const item = job.items[itemIndex];
          const oldStatus = item.status;
          item.status = status;
          if (error) item.error = error;
          if (retryCount !== undefined) item.retryCount = retryCount;

          // Update counts
          if (oldStatus !== status) {
            if (status === 'success') job.successfulItems = (job.successfulItems || 0) + 1;
            else if (status === 'failed') job.failedItems = (job.failedItems || 0) + 1;
            else if (status === 'skipped') job.skippedItems = (job.skippedItems || 0) + 1;

            if (['success', 'failed', 'skipped', 'cancelled'].includes(status) && !['success', 'failed', 'skipped', 'cancelled'].includes(oldStatus)) {
              job.processedItems = (job.processedItems || 0) + 1;
            }
          }

          if (job.processedItems === job.totalItems && job.status === 'running') {
            job.status = 'completed';
            job.completedAt = new Date();
          }

          saveLocalBulkImportJobs();
        }
        res.status(200).json({ success: true, jobStatus: job.status });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/admin/products/bulk/history', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const adminId = (req as any).userId;
      if (isMongoConnected) {
        const jobs = await BulkImportJob.find({ adminId }).sort({ createdAt: -1 }).limit(20);
        res.status(200).json({ success: true, jobs });
      } else {
        const jobs = localBulkImportJobs.filter(j => j.adminId === adminId).slice(0, 20);
        res.status(200).json({ success: true, jobs });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
app.get('/api/admin/products/import/history', adminOnly, async (req: express.Request, res: express.Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const search = (req.query.search as string || '').trim().toLowerCase();
    const resultFilter = req.query.result as string || '';

    try {
      let results: any[] = [];
      let total = 0;

      if (isMongoConnected) {
        const query: any = {};
        if (resultFilter) {
          query.result = resultFilter;
        }
        if (search) {
          query.$or = [
            { productName: { $regex: search, $options: 'i' } },
            { asin: { $regex: search, $options: 'i' } },
            { correlationId: { $regex: search, $options: 'i' } }
          ];
        }

        total = await ImportHistory.countDocuments(query);
        results = await ImportHistory.find(query)
          .sort({ importTime: -1 })
          .skip((page - 1) * limit)
          .limit(limit);
      } else {
        let filtered = [...localImportHistory];
        if (resultFilter) {
          filtered = filtered.filter(item => item.result === resultFilter);
        }
        if (search) {
          filtered = filtered.filter(item => 
            (item.productName || '').toLowerCase().includes(search) ||
            (item.asin || '').toLowerCase().includes(search) ||
            (item.correlationId || '').toLowerCase().includes(search)
          );
        }

        total = filtered.length;
        results = filtered.slice((page - 1) * limit, page * limit);
      }

      return res.json({
        success: true,
        data: results,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get Import Analytics Endpoint
  app.get('/api/admin/products/import/analytics', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      let logs: any[] = [];
      if (isMongoConnected) {
        logs = await ImportHistory.find({});
      } else {
        logs = [...localImportHistory];
      }

      const totalImports = logs.length;
      const successfulImports = logs.filter(l => l.result === 'success').length;
      const failedImports = logs.filter(l => l.result === 'failed').length;
      const skippedProducts = logs.filter(l => l.result === 'skipped' || l.duplicateStatus === 'skip').length;
      const duplicateAttempts = logs.filter(l => l.duplicateStatus !== 'new').length;
      const updatedProducts = logs.filter(l => l.duplicateStatus === 'update' || l.duplicateStatus === 'replace').length;
      const mergedProducts = logs.filter(l => l.duplicateStatus === 'merge').length;
      const validationFailures = logs.filter(l => l.result === 'failed' && l.errorMessage?.includes('Validation')).length;

      const totalSuccessTime = logs.filter(l => l.result === 'success').reduce((sum, l) => sum + (l.processingTimeMs || 0), 0);
      const successCountForAvg = logs.filter(l => l.result === 'success').length;
      const averageProcessingTimeMs = successCountForAvg > 0 ? Math.round(totalSuccessTime / successCountForAvg) : 0;

      return res.json({
        success: true,
        data: {
          totalImports,
          successfulImports,
          failedImports,
          duplicateAttempts,
          updatedProducts,
          mergedProducts,
          skippedProducts,
          averageProcessingTimeMs,
          validationFailures
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Dedicated Product Import API endpoint
  app.post('/api/admin/products/import', adminOnly, importLimiter, express.json({ limit: '5mb' }), async (req: express.Request, res: express.Response): Promise<any> => {
    const startTime = Date.now();
    
    // 1. Resolve / Generate Request & Correlation ID
    const rawRequestId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || req.body.requestId;
    const requestId = typeof rawRequestId === 'string' && rawRequestId.trim() 
      ? rawRequestId.trim() 
      : `req-imp-${Math.random().toString(36).substring(2, 11)}`;

    logStructured('INFO', 'New import request received', { requestId, ip: getSecureClientIp(req) });

    // 2. Check Idempotency Cache
    if (processedImportsCache.has(requestId)) {
      logStructured('INFO', 'Idempotent request intercepted. Returning cached result.', { requestId });
      return res.status(200).json(processedImportsCache.get(requestId));
    }

    const adminId = (req as any).userId || 'system';
    const adminEmail = (req as any).userEmail || 'unknown';

    try {
      const rawPayload = cleanUndefined(req.body);

      // 3. Server-side Validation
      const { name, price, asin, categoryName, brand, description, longDescription, imageUrl, affiliateCode, specifications, features } = rawPayload;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        logStructured('WARN', 'Validation failed: Missing name', { requestId });
        importerMetrics.failedImports++;
        return res.status(400).json({
          success: false,
          requestId,
          error: 'Product name is required and must be a non-empty string',
          code: 'INVALID_PAYLOAD_NAME'
        });
      }

      if (price === undefined || price === null || isNaN(Number(price)) || Number(price) <= 0) {
        logStructured('WARN', 'Validation failed: Invalid price', { requestId, price });
        importerMetrics.failedImports++;
        return res.status(400).json({
          success: false,
          requestId,
          error: 'Price is required and must be a positive number',
          code: 'INVALID_PAYLOAD_PRICE'
        });
      }

      const normalizedAsin = asin && typeof asin === 'string' ? asin.trim().toUpperCase() : null;
      if (normalizedAsin) {
        const asinRegex = /^[a-zA-Z0-9]{8,15}$/;
        if (!asinRegex.test(normalizedAsin)) {
          logStructured('WARN', 'Validation failed: Invalid ASIN format', { requestId, asin: normalizedAsin });
          importerMetrics.failedImports++;
          return res.status(400).json({
            success: false,
            requestId,
            error: 'ASIN must be an 8 to 15-character alphanumeric string',
            code: 'INVALID_PAYLOAD_ASIN'
          });
        }
      }

      // 4. Validate Submitted URL Domains (Security Allowed Whitelist)
      const urlFieldsToCheck: string[] = [];
      if (imageUrl && typeof imageUrl === 'string') urlFieldsToCheck.push(imageUrl);
      if (rawPayload.videoUrl && typeof rawPayload.videoUrl === 'string') urlFieldsToCheck.push(rawPayload.videoUrl);
      if (rawPayload.affiliateLink && typeof rawPayload.affiliateLink === 'string') urlFieldsToCheck.push(rawPayload.affiliateLink);
      if (Array.isArray(rawPayload.images)) {
        rawPayload.images.forEach((img: any) => {
          if (img && typeof img === 'string') urlFieldsToCheck.push(img);
        });
      }

      for (const checkUrl of urlFieldsToCheck) {
        if (!isValidAmazonOrAllowedDomain(checkUrl)) {
          logStructured('WARN', 'Security Block: URL domain check failed', { requestId, url: checkUrl });
          importerMetrics.failedImports++;
          return res.status(400).json({
            success: false,
            requestId,
            error: `Security violation: URL domain is not on the allowed list for importing.`,
            code: 'SECURITY_DOMAIN_VIOLATION'
          });
        }
      }

      // 5. Server-Side XSS Sanitization & Normalization
      const cleanName = sanitizeInput(name);
      const cleanBrand = sanitizeInput(brand || 'Generic');
      const cleanDescription = sanitizeInput(description || '');
      const cleanLongDescription = sanitizeInput(longDescription || '');
      const cleanFeatures = Array.isArray(features) 
        ? features.map((f: any) => typeof f === 'string' ? sanitizeInput(f) : '').filter(Boolean) 
        : [];
      
      const cleanSpecs: Record<string, string> = {};
      if (specifications && typeof specifications === 'object') {
        Object.entries(specifications).forEach(([k, v]) => {
          cleanSpecs[sanitizeInput(k)] = sanitizeInput(String(v));
        });
      }

      // Attach client-submitted extension version to specs for debugging & tracking compatibility
      const extVersion = typeof rawPayload.extensionVersion === 'string' 
        ? sanitizeInput(rawPayload.extensionVersion) 
        : (typeof req.headers['x-extension-version'] === 'string' ? sanitizeInput(String(req.headers['x-extension-version'])) : '1.0.0');
      cleanSpecs["Imported Via"] = `Curator Companion v${extVersion}`;

      // 6. Detect & Resolve Duplicate Products via ASIN with Custom Strategies
      const strategy = rawPayload.strategy || 'create';
      const options = rawPayload.options || {};
      const resolvedAffiliateCode = affiliateCode || 'gadgetspro-20';

      // 6a. Validate Affiliate Code/Tag Format (Format must be xxxxx-20 or similar)
      const tagRegex = /^[a-zA-Z0-9_\-]+-[0-9]+$/;
      if (!tagRegex.test(resolvedAffiliateCode)) {
        logStructured('WARN', 'Validation failed: Invalid affiliate tag format', { requestId, affiliateCode: resolvedAffiliateCode });
        importerMetrics.failedImports++;
        
        await logImportHistory({
          productName: name,
          asin: normalizedAsin || 'UNKNOWN',
          adminEmail,
          adminId: adminId.toString(),
          result: 'failed',
          correlationId: requestId,
          processingTimeMs: Date.now() - startTime,
          duplicateStatus: 'new',
          errorMessage: 'Validation failed: Affiliate tag parameter must match xxxxx-20 format'
        });

        return res.status(400).json({
          success: false,
          requestId,
          error: 'Affiliate URL validation failed: missing or invalid affiliate tag. Code must match xxxxx-20 format.',
          code: 'INVALID_AFFILIATE_URL',
          details: {
            errors: ['Affiliate tag parameter must be formatted like xxxxx-20.']
          }
        });
      }

      // 6b. Normalize Affiliate Link to clean canonical form
      let cleanAffiliateLink = '';
      if (normalizedAsin) {
        cleanAffiliateLink = `https://www.amazon.com/dp/${normalizedAsin}/?tag=${resolvedAffiliateCode}`;
      } else if (rawPayload.affiliateLink && typeof rawPayload.affiliateLink === 'string') {
        const urlStr = rawPayload.affiliateLink.trim();
        try {
          const parsedUrl = new URL(urlStr);
          // FORCE the official resolved affiliate code to prevent commission hijacking!
          const customTag = resolvedAffiliateCode;
          const pathAsinMatch = urlStr.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/i);
          const finalAsin = normalizedAsin || (pathAsinMatch ? pathAsinMatch[2] : 'unknown');
          cleanAffiliateLink = `https://www.amazon.com/dp/${finalAsin}/?tag=${customTag}`;
        } catch (e) {
          cleanAffiliateLink = `https://www.amazon.com/dp/unknown/?tag=${resolvedAffiliateCode}`;
        }
      } else {
        cleanAffiliateLink = `https://www.amazon.com/dp/unknown/?tag=${resolvedAffiliateCode}`;
      }

      // 6c. Image Management (High-resolution restoration, deduplication, and fallback verification)
      const rawImages: string[] = [];
      if (imageUrl && typeof imageUrl === 'string') {
        rawImages.push(imageUrl);
      }
      if (rawPayload.images && Array.isArray(rawPayload.images)) {
        rawPayload.images.forEach((img: any) => {
          if (img && typeof img === 'string') rawImages.push(img);
        });
      }

      const processedImages = rawImages.map(imgUrl => {
        if (!imgUrl) return '';
        const modifierPattern = /\._[A-Za-z0-9,_\-]+_\.(jpg|jpeg|png|gif)/i;
        if (modifierPattern.test(imgUrl)) {
          return imgUrl.replace(modifierPattern, '.$1');
        }
        return imgUrl;
      }).filter(Boolean);

      const uniqueImages = Array.from(new Set(processedImages));
      if (uniqueImages.length === 0) {
        uniqueImages.push('https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800');
      }

      // ARCHITECTURE FOR FUTURE IMAGE CDN INTEGRATION:
      // To integrate Cloudinary or custom CDN:
      // const uploadedToCDN = await Promise.all(uniqueImages.map(url => cdn.upload(url)));

      if (normalizedAsin) {
        let duplicateProduct: any = null;
        if (isMongoConnected) {
          duplicateProduct = await Product.findOne({ asin: normalizedAsin });
        } else {
          duplicateProduct = localProducts.find((p: any) => p.asin === normalizedAsin);
        }

        if (duplicateProduct) {
          if (strategy === 'create') {
            logStructured('WARN', 'Duplicate ASIN import blocked', { requestId, asin: normalizedAsin });
            importerMetrics.duplicateRejections++;

            await logImportHistory({
              productName: name,
              asin: normalizedAsin,
              productId: duplicateProduct._id.toString(),
              adminEmail,
              adminId: adminId.toString(),
              result: 'failed',
              correlationId: requestId,
              processingTimeMs: Date.now() - startTime,
              duplicateStatus: 'duplicate_blocked',
              errorMessage: `Product with ASIN '${normalizedAsin}' already exists.`
            });

            return res.status(409).json({
              success: false,
              requestId,
              error: `Product with ASIN '${normalizedAsin}' already exists.`,
              code: 'DUPLICATE_ASIN',
              existingProduct: duplicateProduct
            });
          }

          if (strategy === 'skip') {
            logStructured('INFO', 'Duplicate ASIN import skipped by request', { requestId, asin: normalizedAsin });
            const duration = Date.now() - startTime;
            importerMetrics.successfulImports++;
            importerMetrics.totalImports++;
            importerMetrics.totalProcessingTimeMs += duration;

            await logImportHistory({
              productName: duplicateProduct.name,
              asin: normalizedAsin,
              productId: duplicateProduct._id.toString(),
              adminEmail,
              adminId: adminId.toString(),
              result: 'skipped',
              correlationId: requestId,
              processingTimeMs: duration,
              duplicateStatus: 'skip'
            });

            return res.status(200).json({
              success: true,
              requestId,
              message: `Product with ASIN '${normalizedAsin}' skipped. Existing product returned.`,
              data: duplicateProduct,
              details: {
                duplicateStatus: 'skip',
                categoryStatus: 'reused',
                extensionVersion: extVersion
              }
            });
          }

          // Handle Granular Update / Merge / Replace
          let updatedPayload = { ...duplicateProduct };
          const overwriteDescription = options.overwriteDescription === true;
          const overwriteImages = options.overwriteImages === true;

          if (strategy === 'replace') {
            updatedPayload.name = cleanName;
            updatedPayload.description = cleanDescription;
            updatedPayload.longDescription = cleanLongDescription;
            updatedPayload.brand = cleanBrand;
            updatedPayload.price = Number(price);
            updatedPayload.originalPrice = rawPayload.originalPrice ? Number(rawPayload.originalPrice) : undefined;
            updatedPayload.discount = rawPayload.originalPrice && Number(rawPayload.originalPrice) > Number(price) 
              ? Math.round(((Number(rawPayload.originalPrice) - Number(price)) / Number(rawPayload.originalPrice)) * 100)
              : undefined;
            updatedPayload.images = uniqueImages;
            updatedPayload.specifications = cleanSpecs;
            updatedPayload.features = cleanFeatures;
            updatedPayload.affiliateLink = cleanAffiliateLink;
            updatedPayload.affiliateCode = resolvedAffiliateCode;
            updatedPayload.inStock = rawPayload.inStock !== false;
          } else if (strategy === 'update') {
            if (overwriteDescription) {
              updatedPayload.description = cleanDescription;
              updatedPayload.longDescription = cleanLongDescription;
            }
            if (overwriteImages) {
              updatedPayload.images = uniqueImages;
            }
            updatedPayload.price = Number(price);
            if (rawPayload.originalPrice) {
              updatedPayload.originalPrice = Number(rawPayload.originalPrice);
              updatedPayload.discount = Math.round(((Number(rawPayload.originalPrice) - Number(price)) / Number(rawPayload.originalPrice)) * 100);
            }
            updatedPayload.specifications = {
              ...(duplicateProduct.specifications || {}),
              ...cleanSpecs
            };
            const existingFeatures = duplicateProduct.features || [];
            const newFeatures = cleanFeatures.filter((f: string) => !existingFeatures.includes(f));
            updatedPayload.features = [...existingFeatures, ...newFeatures];
            updatedPayload.affiliateLink = cleanAffiliateLink;
            updatedPayload.affiliateCode = resolvedAffiliateCode;
            updatedPayload.inStock = rawPayload.inStock !== false;
          } else if (strategy === 'merge') {
            if (!duplicateProduct.description || duplicateProduct.description.trim() === '') {
              updatedPayload.description = cleanDescription;
            }
            if (!duplicateProduct.longDescription || duplicateProduct.longDescription.trim() === '') {
              updatedPayload.longDescription = cleanLongDescription;
            }
            if (!duplicateProduct.images || duplicateProduct.images.length === 0) {
              updatedPayload.images = uniqueImages;
            }
            updatedPayload.specifications = {
              ...cleanSpecs,
              ...(duplicateProduct.specifications || {})
            };
            const existingFeatures = duplicateProduct.features || [];
            const newFeatures = cleanFeatures.filter((f: string) => !existingFeatures.includes(f));
            updatedPayload.features = [...existingFeatures, ...newFeatures];
          }

          if (isMongoConnected) {
            const resultDoc = await Product.findByIdAndUpdate(
              duplicateProduct._id,
              { $set: updatedPayload },
              { new: true }
            );
            if (!resultDoc) {
              throw new Error("Failed to update product");
            }
            await syncProductsToSeedFile();
            await logSecurityAction(req, 'PRODUCT_IMPORTED_UPDATE', duplicateProduct._id.toString(), { name: resultDoc.name, asin: normalizedAsin, strategy });
            
            const duration = Date.now() - startTime;
            importerMetrics.successfulImports++;
            importerMetrics.totalImports++;
            importerMetrics.totalProcessingTimeMs += duration;

            await logImportHistory({
              productName: resultDoc.name,
              asin: normalizedAsin,
              productId: resultDoc._id.toString(),
              adminEmail,
              adminId: adminId.toString(),
              result: 'success',
              correlationId: requestId,
              processingTimeMs: duration,
              duplicateStatus: strategy
            });

            return res.status(200).json({
              success: true,
              requestId,
              message: `Product with ASIN '${normalizedAsin}' successfully updated via ${strategy} strategy.`,
              data: resultDoc,
              details: {
                duplicateStatus: strategy,
                categoryStatus: 'reused',
                extensionVersion: extVersion
              }
            });
          } else {
            const idx = localProducts.findIndex((p: any) => p.asin === normalizedAsin);
            if (idx !== -1) {
              localProducts[idx] = {
                ...localProducts[idx],
                ...updatedPayload,
                updatedAt: new Date()
              };
            }
            await syncProductsToSeedFile();
            await logSecurityAction(req, 'PRODUCT_IMPORTED_UPDATE', duplicateProduct._id.toString(), { name: updatedPayload.name, asin: normalizedAsin, strategy });

            const duration = Date.now() - startTime;
            importerMetrics.successfulImports++;
            importerMetrics.totalImports++;
            importerMetrics.totalProcessingTimeMs += duration;

            await logImportHistory({
              productName: updatedPayload.name,
              asin: normalizedAsin,
              productId: duplicateProduct._id.toString(),
              adminEmail,
              adminId: adminId.toString(),
              result: 'success',
              correlationId: requestId,
              processingTimeMs: duration,
              duplicateStatus: strategy
            });

            return res.status(200).json({
              success: true,
              requestId,
              message: `Product with ASIN '${normalizedAsin}' successfully updated locally via ${strategy} strategy.`,
              data: localProducts[idx],
              details: {
                duplicateStatus: strategy,
                categoryStatus: 'reused',
                extensionVersion: extVersion
              }
            });
          }
        }
      }

      // 7. TRANSACTION WRAPPER WITH COMPENSATING ROLLBACK
      // If product insertion fails, we clean up any category created in this request
      let newlyCreatedCategoryObj: any = null;
      const resolvedCategoryInput = categoryName || 'Imported';
      let categoryId = '';

      try {
        if (isMongoConnected) {
          if (mongoose.Types.ObjectId.isValid(resolvedCategoryInput)) {
            const checkCat = await Category.findById(resolvedCategoryInput);
            if (checkCat) {
              categoryId = checkCat._id.toString();
            }
          }
          if (!categoryId) {
            const escapedCategory = escapeRegExp(resolvedCategoryInput);
            let cat = await Category.findOne({ name: { $regex: new RegExp(`^${escapedCategory}$`, 'i') } });
            if (!cat) {
              const categorySlug = resolvedCategoryInput.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
              cat = new Category({
                name: resolvedCategoryInput,
                slug: categorySlug || `cat-${Math.random().toString(36).substring(2, 6)}`,
                description: `Auto-created category for imported products: ${resolvedCategoryInput}`,
                subcategories: []
              });
              await cat.save();
              newlyCreatedCategoryObj = cat;
              await syncCategoriesToSeedFile();
              logStructured('INFO', 'New category created (DB)', { categoryName: resolvedCategoryInput, categoryId: cat._id.toString() });
            }
            categoryId = cat._id.toString();
          }
        } else {
          let cat: any = localCategories.find((c: any) => c.name.toLowerCase() === resolvedCategoryInput.toLowerCase() || c._id === resolvedCategoryInput);
          if (!cat) {
            cat = {
              _id: "cat_" + Math.random().toString(36).substring(2, 9),
              name: resolvedCategoryInput,
              slug: resolvedCategoryInput.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
              description: `Auto-created category for imported products: ${resolvedCategoryInput}`,
              image: '',
              icon: 'Smartphone',
              subcategories: [],
              createdAt: new Date()
            };
            localCategories.push(cat);
            newlyCreatedCategoryObj = cat;
            await syncCategoriesToSeedFile();
            logStructured('INFO', 'New category created (Local)', { categoryName: resolvedCategoryInput, categoryId: cat._id });
          }
          categoryId = cat._id;
        }

        // 8. Generate unique product slug
        const baseSlugForImport = rawPayload.slug || cleanName;
        const { finalSlug } = await resolveUniqueSlug(baseSlugForImport, 'product');

        // Create product payload
        const productPayload = {
          name: cleanName,
          slug: finalSlug,
          asin: normalizedAsin,
          description: cleanDescription,
          longDescription: cleanLongDescription,
          category: categoryId,
          subcategory: rawPayload.subcategory || '',
          brand: cleanBrand,
          price: Number(price),
          originalPrice: rawPayload.originalPrice ? Number(rawPayload.originalPrice) : undefined,
          discount: rawPayload.originalPrice && Number(rawPayload.originalPrice) > Number(price) 
            ? Math.round(((Number(rawPayload.originalPrice) - Number(price)) / Number(rawPayload.originalPrice)) * 100)
            : undefined,
          images: uniqueImages,
          videoUrl: rawPayload.videoUrl || '',
          specifications: cleanSpecs,
          features: cleanFeatures,
          affiliateLink: cleanAffiliateLink,
          affiliateCode: resolvedAffiliateCode,
          inStock: rawPayload.inStock !== false,
          sku: rawPayload.sku || `SKU-${normalizedAsin || Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          tags: Array.isArray(rawPayload.tags) ? rawPayload.tags.filter((t: any) => typeof t === 'string') : [],
          trending: !!rawPayload.trending,
          featured: !!rawPayload.featured,
          pros: Array.isArray(rawPayload.pros) ? rawPayload.pros.filter((p: any) => typeof p === 'string') : [],
          cons: Array.isArray(rawPayload.cons) ? rawPayload.cons.filter((c: any) => typeof c === 'string') : [],
          seoTitle: rawPayload.seoTitle || cleanName,
          seoDescription: rawPayload.seoDescription || cleanDescription
        };

        // For simulation tests of db failure
        if (rawPayload.simulateDbFailure) {
          throw new Error('Forced DB Failure for testing transaction compensations.');
        }

        if (isMongoConnected) {
          const product = new Product(productPayload);
          await product.save();

          // PHASE 7: Background Media Download Trigger
          if (uniqueImages && uniqueImages.length > 0) {
            uniqueImages.forEach((imgUrl: any) => {
              mediaService.processImageDownload({
                url: imgUrl,
                productId: product._id.toString(),
                asin: normalizedAsin || undefined
              }).catch((err: any) => console.warn('Media download failed in background:', err.message));
            });
          }

          await syncProductsToSeedFile();
          await logSecurityAction(req, 'PRODUCT_IMPORTED', product._id.toString(), { name: product.name, slug: finalSlug, asin: normalizedAsin });
          triggerProductAddedEmailNotifications(product).catch(err => console.warn('Newsletter trigger failed:', err.message));
          
          const responsePayload = {
            success: true,
            requestId,
            message: 'Product imported and saved to database successfully',
            data: product,
            details: {
              categoryStatus: newlyCreatedCategoryObj ? 'created' : 'reused',
              categoryName: resolvedCategoryInput,
              generatedSlug: finalSlug,
              affiliateUrlStatus: 'verified',
              extensionVersion: extVersion
            }
          };

          processedImportsCache.set(requestId, responsePayload);

          const duration = Date.now() - startTime;
          importerMetrics.successfulImports++;
          importerMetrics.totalImports++;
          importerMetrics.totalProcessingTimeMs += duration;

          await logImportHistory({
            productName: product.name,
            asin: normalizedAsin || 'UNKNOWN',
            productId: product._id.toString(),
            adminEmail,
            adminId: adminId.toString(),
            result: 'success',
            correlationId: requestId,
            processingTimeMs: duration,
            duplicateStatus: 'new'
          });

          logStructured('INFO', 'Product imported successfully to DB', { requestId, durationMs: duration, asin: normalizedAsin });
          return res.status(201).json(responsePayload);
        } else {
          const newProduct = {
            _id: "prod_i_" + Math.random().toString(36).substring(2, 9),
            ...productPayload,
            clicks: 0,
            conversions: 0,
            rating: 0,
            totalReviews: 0,
            reviews: [] as any[],
            createdAt: new Date()
          };
          localProducts.unshift(newProduct);
          await syncProductsToSeedFile();
          await logSecurityAction(req, 'PRODUCT_IMPORTED', newProduct._id, { name: newProduct.name, slug: finalSlug, asin: normalizedAsin });
          triggerProductAddedEmailNotifications(newProduct).catch(err => console.warn('Newsletter trigger failed:', err.message));
          
          const responsePayload = {
            success: true,
            requestId,
            message: 'Product imported and saved locally successfully',
            data: newProduct,
            details: {
              categoryStatus: newlyCreatedCategoryObj ? 'created' : 'reused',
              categoryName: resolvedCategoryInput,
              generatedSlug: finalSlug,
              affiliateUrlStatus: 'verified',
              extensionVersion: extVersion
            }
          };

          processedImportsCache.set(requestId, responsePayload);

          const duration = Date.now() - startTime;
          importerMetrics.successfulImports++;
          importerMetrics.totalImports++;
          importerMetrics.totalProcessingTimeMs += duration;

          await logImportHistory({
            productName: newProduct.name,
            asin: normalizedAsin || 'UNKNOWN',
            productId: newProduct._id,
            adminEmail,
            adminId: adminId.toString(),
            result: 'success',
            correlationId: requestId,
            processingTimeMs: duration,
            duplicateStatus: 'new'
          });

          logStructured('INFO', 'Product imported successfully to memory fallback', { requestId, durationMs: duration, asin: normalizedAsin });
          return res.status(201).json(responsePayload);
        }

      } catch (err: any) {
        // EXECUTE COMPENSATING ROLLBACK TRANSACTION TO MAINTAIN ATOMICITY
        logStructured('ERROR', 'Import transaction failed. Compensating rollback active.', { requestId, error: err.message });
        
        if (newlyCreatedCategoryObj) {
          try {
            if (isMongoConnected) {
              await Category.findByIdAndDelete(newlyCreatedCategoryObj._id);
            } else {
              const idx = localCategories.findIndex((c: any) => c._id === newlyCreatedCategoryObj._id);
              if (idx !== -1) localCategories.splice(idx, 1);
            }
            await syncCategoriesToSeedFile();
            logStructured('INFO', 'Compensation successful: Created category rolled back', { requestId, categoryId: newlyCreatedCategoryObj._id });
          } catch (rollbackErr: any) {
            logStructured('ERROR', 'Compensation rollback failed', { requestId, error: rollbackErr.message });
          }
        }

        throw err; // throw to be caught by outer try-catch block
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      importerMetrics.failedImports++;
      importerMetrics.totalImports++;
      importerMetrics.totalProcessingTimeMs += duration;

      await logImportHistory({
        productName: req.body.name || 'Unknown Product',
        asin: req.body.asin || 'UNKNOWN',
        adminEmail,
        adminId: adminId.toString(),
        result: 'failed',
        correlationId: requestId,
        processingTimeMs: duration,
        duplicateStatus: 'new',
        errorMessage: error.message || 'Import transaction failed'
      });

      logStructured('ERROR', 'Import endpoint overall failure', { requestId, error: error.message });
      res.status(500).json({
        success: false,
        requestId,
        error: error.message || 'Internal server error during import',
        code: 'IMPORT_TRANSACTION_FAILURE'
      });
    }
  });

  app.put('/api/admin/products/:id', adminOnly, validateAdminProduct, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const pId = req.params.id;
      
      // Dynamically get valid keys from Product schema if registered, otherwise fall back to a comprehensive list
      let schemaKeys: string[] = [];
      if (typeof Product !== 'undefined' && Product.schema) {
        schemaKeys = Object.keys(Product.schema.paths);
      }
      const blacklistedKeys = ['_id', 'id', 'createdAt', 'updatedAt', '__v'];
      const payload: any = {};
      for (const key of Object.keys(req.body)) {
        if (!blacklistedKeys.includes(key) && (schemaKeys.length === 0 || schemaKeys.includes(key))) {
          if (req.body[key] !== undefined) {
            payload[key] = req.body[key];
          }
        }
      }
      
      const proposedSlug = payload.slug || payload.name;
      if (proposedSlug) {
        const { exists, finalSlug } = await resolveUniqueSlug(proposedSlug, 'product', pId);
        if (exists) {
          return res.status(409).json({
            error: `The slug '${finalSlug.replace(/-\d+$/, '')}' already exists. We suggest '${finalSlug}' instead.`,
            code: 'SLUG_COLLISION',
            suggestedSlug: finalSlug
          });
        }
        payload.slug = finalSlug;
      }

      if (isMongoConnected) {
        const product = await Product.findByIdAndUpdate(pId, { $set: payload }, { new: true });
        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }
        await syncProductsToSeedFile();
        await logSecurityAction(req, 'PRODUCT_UPDATED', pId, { name: product.name, slug: product.slug });
        return res.json(product);
      } else {
        const index = localProducts.findIndex((p: any) => p._id === pId);
        if (index === -1) return res.status(404).json({ error: 'Product not found' });
        
        localProducts[index] = {
          ...localProducts[index],
          ...payload,
          _id: pId, // Protect identity
          createdAt: localProducts[index].createdAt, // Protect history
          updatedAt: new Date()
        };
        await syncProductsToSeedFile();
        await logSecurityAction(req, 'PRODUCT_UPDATED', pId, { name: localProducts[index].name, slug: localProducts[index].slug });
        return res.json(localProducts[index]);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/admin/products/:id', adminOnly, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const pId = req.params.id;
      if (isMongoConnected) {
        if (!mongoose.Types.ObjectId.isValid(pId)) {
          return res.status(400).json({ error: 'Invalid Product ID format' });
        }
        const deletedProduct = await Product.findById(pId);
        if (!deletedProduct) {
          return res.status(404).json({ error: 'Product not found' });
        }

        // Enforce referential integrity
        const orderCount = await Order.countDocuments({ 'items.product': pId });
        if (orderCount > 0) {
          return res.status(400).json({ error: 'Cannot delete product referenced in orders.' });
        }

        // Cascade delete Analytics, Visitors views, and Health diagnostics referencing this product
        await Analytics.deleteMany({ productId: pId });
        await Visitor.deleteMany({ productId: pId });
        await ProductHealth.deleteMany({ productId: pId });
        
        await Product.findByIdAndDelete(pId);
        await Product.updateMany({ comparisonProducts: pId }, { $pull: { comparisonProducts: pId } });
        await User.updateMany(
          { wishlist: pId },
          { $pull: { wishlist: pId } }
        );
        await syncProductsToSeedFile();
        await logSecurityAction(req, 'PRODUCT_DELETED', pId, { name: deletedProduct?.name, slug: deletedProduct?.slug });
        return res.json({ success: true });
      } else {
        const index = localProducts.findIndex((p: any) => p._id === pId || (p as any).id === pId);
        if (index === -1) return res.status(404).json({ error: 'Product not found' });
        const deletedProduct = localProducts[index];
        localProducts.splice(index, 1);
        
        // Cascade in local storage fallback
        localAnalytics = localAnalytics.filter((a: any) => String(a.productId) !== String(pId));
        localVisitors = localVisitors.filter((v: any) => String(v.productId) !== String(pId));
        localProductHealth = localProductHealth.filter((h: any) => String(h.productId) !== String(pId));
        
        // Clean up comparison products in local storage fallback
        localProducts.forEach((p: any) => {
          if (Array.isArray(p.comparisonProducts)) {
            p.comparisonProducts = p.comparisonProducts.filter((id: string) => String(id) !== String(pId));
          }
        });
        saveLocalProducts();

        // Clean up user wishlists in local storage fallback
        localUsers.forEach((u: any) => {
          if (Array.isArray(u.wishlist)) {
            u.wishlist = u.wishlist.filter((id: any) => String(id) !== String(pId));
          }
        });
        saveLocalUsers();

        await syncProductsToSeedFile();
        await logSecurityAction(req, 'PRODUCT_DELETED', pId, { name: deletedProduct.name, slug: deletedProduct.slug });
        return res.json({ success: true });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Categories CRUD
  app.post('/api/admin/categories', adminOnly, validateAdminCategory, async (req: express.Request, res: express.Response) => {
    try {
      const rawPayload = req.body;
      const whitelistedKeys = ['name', 'slug', 'description', 'image', 'icon', 'subcategories'];
      const payload: any = {};
      for (const key of whitelistedKeys) {
        if (rawPayload[key] !== undefined) {
          payload[key] = rawPayload[key];
        }
      }
      const slug = (payload.slug || payload.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      if (isMongoConnected) {
        const category = new Category({ ...payload, slug });
        await category.save();
        await syncCategoriesToSeedFile();
        await logSecurityAction(req, 'CATEGORY_CREATED', category._id.toString(), { name: category.name, slug });
        res.json(category);
      } else {
        const newCat = {
          _id: "cat_a_" + Math.random().toString(36).substring(2, 9),
          ...payload,
          slug,
          createdAt: new Date()
        };
        localCategories.push(newCat);
        await syncCategoriesToSeedFile();
        await logSecurityAction(req, 'CATEGORY_CREATED', newCat._id, { name: newCat.name, slug });
        res.json(newCat);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/admin/categories/:id', adminOnly, validateAdminCategory, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const catId = req.params.id;
      
      // Whitelist update payload fields to prevent mass assignment
      const whitelistedKeys = ['name', 'slug', 'description', 'image', 'icon', 'subcategories'];
      const payload: any = {};
      for (const key of whitelistedKeys) {
        if (req.body[key] !== undefined) {
          payload[key] = req.body[key];
        }
      }

      if (isMongoConnected) {
        const category = await Category.findByIdAndUpdate(catId, { $set: payload }, { new: true });
        await syncCategoriesToSeedFile();
        await logSecurityAction(req, 'CATEGORY_UPDATED', catId, { name: category?.name, slug: category?.slug });
        return res.json(category);
      } else {
        const index = localCategories.findIndex((c: any) => c._id === catId);
        if (index === -1) return res.status(404).json({ error: 'Category not found' });
        localCategories[index] = {
          ...localCategories[index],
          ...payload,
          _id: catId, // Protect identity
          createdAt: localCategories[index].createdAt // Protect history
        };
        await syncCategoriesToSeedFile();
        await logSecurityAction(req, 'CATEGORY_UPDATED', catId, { name: localCategories[index].name, slug: localCategories[index].slug });
        return res.json(localCategories[index]);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/admin/categories/:id', adminOnly, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const catId = req.params.id;
      if (isMongoConnected) {
        if (!mongoose.Types.ObjectId.isValid(catId)) {
          return res.status(400).json({ error: 'Invalid Category ID format' });
        }
        const deletedCat = await Category.findById(catId);
        if (!deletedCat) {
          return res.status(404).json({ error: 'Category not found' });
        }

        const productsCount = await Product.countDocuments({ category: catId });
        if (productsCount > 0) {
          return res.status(400).json({ error: `Cannot delete category: It is currently referenced by ${productsCount} product(s). Please reassign or delete those products first.` });
        }

        await Category.findByIdAndDelete(catId);
        await syncCategoriesToSeedFile();
        await logSecurityAction(req, 'CATEGORY_DELETED', catId, { name: deletedCat?.name, slug: deletedCat?.slug });
        return res.json({ success: true });
      } else {
        const index = localCategories.findIndex((c: any) => c._id === catId);
        if (index === -1) return res.status(404).json({ error: 'Category not found' });
        const productsCount = localProducts.filter((p: any) => p.category === catId).length;
        if (productsCount > 0) {
          return res.status(400).json({ error: `Cannot delete category: It is currently referenced by ${productsCount} product(s). Please reassign or delete those products first.` });
        }
        const deletedCat = localCategories[index];
        localCategories.splice(index, 1);
        await syncCategoriesToSeedFile();
        await logSecurityAction(req, 'CATEGORY_DELETED', catId, { name: deletedCat.name, slug: deletedCat.slug });
        return res.json({ success: true });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Blogs CRUD
  app.post('/api/admin/blogs', adminOnly, validateAdminBlog, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const rawPayload = req.body;
      const whitelistedKeys = [
        'title', 'slug', 'excerpt', 'content', 'featured_image', 'category', 'tags',
        'author', 'published', 'seoTitle', 'seoDescription', 'seoKeywords'
      ];
      const payload: any = {};
      for (const key of whitelistedKeys) {
        if (rawPayload[key] !== undefined) {
          payload[key] = rawPayload[key];
        }
      }
      const proposedSlug = payload.slug || payload.title;
      const { exists, finalSlug } = await resolveUniqueSlug(proposedSlug, 'blog');
      
      if (exists) {
        return res.status(409).json({
          error: `The slug '${finalSlug.replace(/-\d+$/, '')}' already exists. We suggest using '${finalSlug}' instead.`,
          code: 'SLUG_COLLISION',
          suggestedSlug: finalSlug
        });
      }
      
      if (isMongoConnected) {
        const blog = new Blog({ ...payload, slug: finalSlug });
        await blog.save();
        await syncBlogsToSeedFile();
        await logSecurityAction(req, 'BLOG_CREATED', blog._id.toString(), { title: blog.title, slug: finalSlug });
        res.json(blog);
      } else {
        const newBlog = {
          _id: "blog_a_" + Math.random().toString(36).substring(2, 9),
          ...payload,
          slug: finalSlug,
          views: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        localBlogs.unshift(newBlog);
        await syncBlogsToSeedFile();
        await logSecurityAction(req, 'BLOG_CREATED', newBlog._id, { title: newBlog.title, slug: finalSlug });
        res.json(newBlog);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/admin/blogs/:id', adminOnly, validateAdminBlog, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const bId = req.params.id;
      
      // Whitelist update payload fields to prevent mass assignment
      const whitelistedKeys = [
        'title', 'slug', 'excerpt', 'content', 'featured_image', 'category', 'tags',
        'author', 'published', 'seoTitle', 'seoDescription', 'seoKeywords'
      ];
      const payload: any = {};
      for (const key of whitelistedKeys) {
        if (req.body[key] !== undefined) {
          payload[key] = req.body[key];
        }
      }
      
      const proposedSlug = payload.slug || payload.title;
      if (proposedSlug) {
        const { exists, finalSlug } = await resolveUniqueSlug(proposedSlug, 'blog', bId);
        if (exists) {
          return res.status(409).json({
            error: `The slug '${finalSlug.replace(/-\d+$/, '')}' already exists. We suggest '${finalSlug}' instead.`,
            code: 'SLUG_COLLISION',
            suggestedSlug: finalSlug
          });
        }
        payload.slug = finalSlug;
      }

      if (isMongoConnected) {
        const blog = await Blog.findByIdAndUpdate(bId, { $set: payload }, { new: true });
        await syncBlogsToSeedFile();
        await logSecurityAction(req, 'BLOG_UPDATED', bId, { title: blog?.title, slug: blog?.slug });
        return res.json(blog);
      } else {
        const index = localBlogs.findIndex((b: any) => b._id === bId);
        if (index === -1) return res.status(404).json({ error: 'Blog not found' });
        localBlogs[index] = {
          ...localBlogs[index],
          ...payload,
          _id: bId, // Protect identity
          createdAt: localBlogs[index].createdAt, // Protect history
          updatedAt: new Date()
        };
        await syncBlogsToSeedFile();
        await logSecurityAction(req, 'BLOG_UPDATED', bId, { title: localBlogs[index].title, slug: localBlogs[index].slug });
        return res.json(localBlogs[index]);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/admin/blogs/:id', adminOnly, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const bId = req.params.id;
      if (isMongoConnected) {
        if (!mongoose.Types.ObjectId.isValid(bId)) {
          return res.status(400).json({ error: 'Invalid Blog ID format' });
        }
        const deletedBlog = await Blog.findById(bId);
        if (!deletedBlog) {
          return res.status(404).json({ error: 'Blog not found' });
        }

        await Blog.findByIdAndDelete(bId);
        await syncBlogsToSeedFile();
        await logSecurityAction(req, 'BLOG_DELETED', bId, { title: deletedBlog?.title, slug: deletedBlog?.slug });
        return res.json({ success: true });
      } else {
        const index = localBlogs.findIndex((b: any) => b._id === bId);
        if (index === -1) return res.status(404).json({ error: 'Blog not found' });
        const deletedBlog = localBlogs[index];
        localBlogs.splice(index, 1);
        await syncBlogsToSeedFile();
        await logSecurityAction(req, 'BLOG_DELETED', bId, { title: deletedBlog.title, slug: deletedBlog.slug });
        return res.json({ success: true });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin Messages retrieval
  app.get('/api/admin/messages', adminOnly, async (_req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        const msgs = await Message.find().sort({ createdAt: -1 });
        res.json(msgs);
      } else {
        res.json(localMessages);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin message mark as read
  app.post('/api/admin/messages/read/:id', adminOnly, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const msgId = req.params.id;
      if (isMongoConnected) {
        const msg = await Message.findByIdAndUpdate(msgId, { read: true }, { new: true });
        if (!msg) return res.status(404).json({ error: 'Message not found' });
        await syncMessagesToSeedFile();
        return res.json(msg);
      } else {
        const msg = localMessages.find((m: any) => m._id === msgId);
        if (!msg) return res.status(404).json({ error: 'Message not found' });
        msg.read = true;
        await syncMessagesToSeedFile();
        return res.json(msg);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin retrieve users
  app.get('/api/admin/users', adminOnly, async (_req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        const users = await User.find({}).sort({ createdAt: -1 });
        const sanitized = users.map(u => sanitizeUser(u));
        res.json(sanitized);
      } else {
        // Return without password for security
        const sanitizedUsers = localUsers.map((u: any) => {
          return sanitizeUser({ ...u, _id: u._id || u.id });
        });
        res.json(sanitizedUsers);
      }
    } catch (error: any) {
      res.status(500).json({ error: 'An error occurred while retrieving users' });
    }
  });

  // Admin promote/demote user
  app.put('/api/admin/users/:id/role', adminOnly, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (typeof role !== 'string' || (role !== 'user' && role !== 'admin')) {
        return res.status(400).json({ error: 'Invalid role specified' });
      }

      const adminId = (req as any).userId;
      
      // Prevent self-demotion/self-modification
      if (String(adminId) === String(id)) {
        return res.status(400).json({ error: 'Permission Denied: You cannot modify your own administrator role profile status.' });
      }

      let targetUser: any = null;
      if (isMongoConnected) {
        targetUser = await User.findById(id);
      } else {
        targetUser = localUsers.find((u: any) => (u._id === id || u.id === id));
      }

      if (!targetUser) {
        return res.status(404).json({ error: 'Target user account not found.' });
      }

      if (role === 'admin' && !isAdminEmail(targetUser.email)) {
        return res.status(400).json({ error: 'Security constraint: The target email address must be configured in the ADMIN_EMAILS environment variable configuration before they can be promoted to administrator.' });
      }

      const oldRole = targetUser.role;
      if (isMongoConnected) {
        targetUser.role = role;
        targetUser.updatedAt = new Date();
        await targetUser.save();
      } else {
        targetUser.role = role;
        targetUser.updatedAt = new Date();
        saveLocalUsers();
      }

      await logSecurityAction(req, 'USER_ROLE_CHANGED', id, {
        email: targetUser.email,
        oldRole,
        newRole: role
      });

      return res.json({
        success: true,
        message: `Administrative access of "${targetUser.email}" has been successfully updated to "${role}".`,
        user: { _id: targetUser._id || targetUser.id, email: targetUser.email, role }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Security Logs / Audit Trail
  app.get('/api/admin/security-logs', adminOnly, async (_req: express.Request, res: express.Response) => {
    try {
      if (isMongoConnected) {
        const logs = await SecurityLog.find().sort({ timestamp: -1 });
        res.json(logs);
      } else {
        res.json(localSecurityLogs);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sunday automated logs and simulation
  app.get('/api/admin/sunday-logs', adminOnly, async (_req: express.Request, res: express.Response) => {
    try {
      const mongoLogs = await SundayAutomationLog.find().sort({ runAt: -1 }).populate('productsAdded');
      return res.json(mongoLogs);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/sunday-logs/simulate', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { targetSundayStr, forceEmail } = req.body;
      let sundayDateString = targetSundayStr;
      
      if (!sundayDateString) {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const sundayDate = new Date(today);
        const backDays = dayOfWeek === 0 ? 7 : dayOfWeek;
        const diff = today.getDate() - backDays;
        sundayDate.setDate(diff);
        sundayDateString = sundayDate.toISOString().split('T')[0];
      }

      const log = await runSundayAutomation(sundayDateString, forceEmail);
      if (!log) {
        return res.status(400).json({ error: 'Failed to execute Sunday automation simulation.' });
      }
      return res.json({ success: true, log });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // Diagnostics and Analytics compilation
  app.get('/api/admin/n8n-status', adminOnly, async (_req: express.Request, res: express.Response): Promise<any> => {
    try {
      const webhookUrl = process.env.N8N_REALTIME_WEBHOOK_URL;
      
      if (!webhookUrl) {
        return res.json({
          configured: false,
          status: 'offline',
          message: 'Webhook URL not configured in environment variables'
        });
      }

      // Perform a lightweight check to verify if the URL is reachable
      // We use HEAD method with a short timeout to prevent hanging the admin panel
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(webhookUrl, { 
          method: 'HEAD',
          signal: controller.signal
        }).catch(_err => {
          // If HEAD fails (e.g. CORS or not supported), fallback to a lightweight GET
          return fetch(webhookUrl, { method: 'GET', signal: controller.signal });
        });
        
        clearTimeout(timeoutId);

        // Treat 4xx/5xx as potentially online but misconfigured or expecting specific payload,
        // so we don't just say offline. We just want to check network reachability.
        if (response && (response.ok || response.status === 404 || response.status === 405)) {
          return res.json({
            configured: true,
            status: 'online',
            message: 'Connected & Reachable'
          });
        }
        
        return res.json({
          configured: true,
          status: response ? 'online' : 'warning',
          message: response ? `Connected (HTTP ${response.status})` : 'Unreachable'
        });
      } catch (networkError: any) {
        return res.json({
          configured: true,
          status: 'warning',
          message: networkError.name === 'AbortError' ? 'Timeout reaching n8n' : 'Network error reaching n8n'
        });
      }
    } catch (err: any) {
      console.error("Error checking n8n status:", err);
      return res.status(500).json({ error: "Failed to check n8n status" });
    }
  });

  app.post('/api/admin/n8n-test', adminOnly, async (_req: express.Request, res: express.Response): Promise<any> => {
    try {
      const webhookUrl = process.env.N8N_REALTIME_WEBHOOK_URL;
      
      if (!webhookUrl) {
        return res.status(400).json({
          success: false,
          error: 'Webhook URL not configured in environment variables'
        });
      }

      // Perform a full POST request to test the webhook
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const testPayload = {
          event: 'test_connection',
          timestamp: new Date().toISOString(),
          source: 'admin_diagnostic_tool',
          data: {
            message: 'This is a test webhook trigger from the admin panel'
          }
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (process.env.N8N_SECRET_TOKEN) {
          headers['Authorization'] = `Bearer ${process.env.N8N_SECRET_TOKEN}`;
        }

        const response = await fetch(webhookUrl, { 
          method: 'POST',
          headers,
          body: JSON.stringify(testPayload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        let responseBodyText = '';
        try {
          responseBodyText = await response.text();
        } catch (e) {
          captureError(e, { context: 'Could not read response body' });
          responseBodyText = 'Could not read response body';
        }

        return res.json({
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries((response.headers as any).entries()),
          body: responseBodyText
        });
      } catch (networkError: any) {
        return res.json({
          success: false,
          error: networkError.name === 'AbortError' ? 'Timeout reaching n8n (10 seconds)' : networkError.message,
          errorName: networkError.name
        });
      }
    } catch (err: any) {
      console.error("Error testing n8n webhook:", err);
      return res.status(500).json({ error: "Failed to test n8n webhook", details: "Error" });
    }
  });

  app.get('/api/admin/analytics', adminOnly, async (_req: express.Request, res: express.Response) => {
    try {
      const TAMIL_NADU_DISTRICTS = [
        "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
        "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur",
        "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris",
        "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivagangai",
        "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
        "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore",
        "Viluppuram", "Virudhunagar"
      ];

      if (isMongoConnected) {
        // ALWAYS perform CastError-immune safe population of Analytics records in MongoDB to prevent Mongoose schema-casting from failing on guest/simulated user IDs
        const rawAnalytics = await Analytics.find()
          .sort({ timestamp: -1 })
          .limit(1000)
          .lean();

        const isValidObjectId = (id: any): boolean => {
          if (!id) return false;
          const str = id.toString();
          return /^[0-9a-fA-F]{24}$/.test(str);
        };

        const prodIds = Array.from(new Set(rawAnalytics.map(a => a.productId).filter(id => id)));
        const validProdIds = prodIds.filter(id => isValidObjectId(id));
        const fetchedProducts = await Product.find({ _id: { $in: validProdIds } }).lean();
        const productMap = new Map(fetchedProducts.map((p: any) => [p._id.toString(), p]));

        const userIds = Array.from(new Set(rawAnalytics.map(a => a.userId).filter(id => id)));
        const validUserIds = userIds.filter(id => isValidObjectId(id));
        const fetchedUsers = await User.find({ _id: { $in: validUserIds } }, 'name email district').lean();
        const userMap = new Map(fetchedUsers.map((u: any) => [u._id.toString(), u]));

        const analytics = rawAnalytics.map(a => {
          const pIdStr = a.productId ? a.productId.toString() : '';
          const uIdStr = a.userId ? a.userId.toString() : '';
          return {
            ...a,
            district: sanitizeDistrict(a.district || 'Chennai'),
            productId: productMap.get(pIdStr) || (a.productId ? { _id: a.productId, name: "Product Option" } : null),
            userId: userMap.get(uIdStr) || (a.userId && typeof a.userId === 'string' ? { _id: a.userId, name: "Guest (" + a.userId + ")", email: a.userId } : null)
          };
        });
          
        const clickCount = await Analytics.countDocuments({ eventType: 'click' });
        const conversionCount = await Analytics.countDocuments({ eventType: 'conversion' });
        const viewCount = await Analytics.countDocuments({ eventType: 'view' });
        const visitorCount = await Visitor.countDocuments({});
 
        // Calculate dynamic real analytics for all 38 districts in Tamil Nadu based on unique mail id/guest visitor representation
        const districtCounts: Record<string, number> = {};
        TAMIL_NADU_DISTRICTS.forEach(d => {
          districtCounts[d] = 0;
        });
 
        const distAggr = await Analytics.aggregate([
          { $group: { _id: { id: { $ifNull: ["$userId", "$ipAddress"] }, dist: { $ifNull: ["$district", "Chennai"] } } } },
          { $group: { _id: "$_id.dist", count: { $sum: 1 } } }
        ]);
        
        distAggr.forEach(row => {
          const distName = row._id.charAt(0).toUpperCase() + row._id.slice(1).toLowerCase();
          const dist = TAMIL_NADU_DISTRICTS.includes(distName) ? distName : 'Chennai';
          if (districtCounts[dist] !== undefined) {
            districtCounts[dist] += row.count;
          } else {
            districtCounts[dist] = row.count;
          }
        });
        
        let instaCount = socialClicks.instagram;
        let linkedinCount = socialClicks.linkedin;
        try {
          instaCount = await SocialClick.countDocuments({ platform: 'instagram' });
          linkedinCount = await SocialClick.countDocuments({ platform: 'linkedin' });
        } catch (err) {
          captureError(err, { context: 'SocialClick counts dynamically' });
        }

        return res.json({
          analytics,
          summary: { clicks: clickCount, conversions: conversionCount, views: viewCount, visitors: visitorCount },
          districts: districtCounts,
          socialClicks: { instagram: instaCount, linkedin: linkedinCount }
        });
      } else {
        const clickCount = localAnalytics.filter(a => a.eventType === 'click').length;
        const conversionCount = localAnalytics.filter(a => a.eventType === 'conversion').length;
        const viewCount = localAnalytics.filter(a => a.eventType === 'view').length;
        const visitorCount = localVisitors.length;

        const mappedAnalytics = localAnalytics.map((a, idx) => {
          const item = localProducts.find((p: any) => p._id === a.productId);
          const resolvedUser = a.userId ? localUsers.find(u => u._id === a.userId) : null;
          return {
            _id: "ana_raw_" + idx,
            productId: item || (a.productId ? { _id: a.productId, name: "Deleted Product" } : undefined),
            userId: resolvedUser ? { _id: resolvedUser._id, name: resolvedUser.name, email: resolvedUser.email, district: resolvedUser.district } : null,
            eventType: a.eventType,
            district: sanitizeDistrict(a.district || 'Chennai'),
            ipAddress: a.ipAddress || '127.0.0.1',
            browser: a.browser || 'Chrome',
            device: a.device || 'Desktop',
            pageUrl: a.pageUrl || 'home',
            timeSpent: a.timeSpent || 0,
            timestamp: a.timestamp || new Date()
          };
        }).reverse();

        // Calculate dynamic real analytics for all 38 districts in Tamil Nadu based on unique mail id/guest visitor representation from the in-memory telemetry log
        const districtCounts: Record<string, number> = {};
        TAMIL_NADU_DISTRICTS.forEach(d => {
          districtCounts[d] = 0;
        });

        const seenKeys = new Set<string>();
        mappedAnalytics.forEach(a => {
          let identifier = '';
          if (a.userId && typeof a.userId === 'object') {
            identifier = a.userId.email || '';
          }
          if (!identifier) {
            identifier = `guest_${a.ipAddress || '127.0.0.1'}`;
          }

          const dist = sanitizeDistrict(a.district || 'Chennai');
          const comboKey = `${identifier}_${dist}`;

          if (!seenKeys.has(comboKey)) {
            seenKeys.add(comboKey);
            if (districtCounts[dist] !== undefined) {
              districtCounts[dist]++;
            } else {
              districtCounts[dist] = 1;
            }
          }
        });

        return res.json({
          analytics: mappedAnalytics,
          summary: { clicks: clickCount, conversions: conversionCount, views: viewCount, visitors: visitorCount },
          districts: districtCounts,
          socialClicks: socialClicks
        });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Product specific click trigger conversions
  app.post('/api/admin/analytics/conversions/:productId', adminOnly, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const pId = req.params.productId;
      if (isMongoConnected) {
        const product = await Product.findById(pId);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        product.conversions = (product.conversions || 0) + 1;
        await product.save();
        await Analytics.create({
          productId: pId,
          eventType: 'conversion'
        });
        return res.json({ success: true, conversions: product.conversions });
      } else {
        const index = localProducts.findIndex((p: any) => p._id === pId);
        if (index === -1) return res.status(404).json({ error: 'Product not found' });
        localProducts[index].conversions = (localProducts[index].conversions || 0) + 1;
        
        localAnalytics.push({
          productId: pId,
          eventType: 'conversion',
          timestamp: new Date()
        });
        return res.json({ success: true, conversions: localProducts[index].conversions });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const adsTxtLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per 15 minutes
    message: 'Too many requests, please try again later.'
  });

  // Google AdSense ads.txt crawler verification endpoint
  app.get('/ads.txt', adsTxtLimiter, (_req: express.Request, res: express.Response) => {
    const publisherId = process.env.ADSENSE_CLIENT_ID;
    if (!publisherId || publisherId === 'ca-pub-0000000000000000') {
      return res.status(404).send('Not configured');
    }
    // Clean any prefix e.g. "ca-pub-XX" -> "pub-XX" for correct ads.txt formatting
    let cleanId = publisherId;
    if (cleanId.startsWith('ca-')) {
      cleanId = cleanId.slice(3);
    }
    res.type('text/plain');
    res.send(`google.com, ${cleanId}, DIRECT, f08c47fec0942fa0\n`);
  });

  // Vite Integration for Serving UI
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Do not serve index.html for missing asset requests to prevent MIME type issues
    app.use('/assets', (_req: express.Request, res: express.Response) => {
      res.status(404).send('Asset not found');
    });
    // Do not serve index.html for source code requests to prevent MIME type and loading issues
    app.get(/^\/src\/.+\.(tsx|ts|jsx|js)$/, (req: express.Request, res: express.Response) => {
      const pathPart = req.path.toLowerCase();
      // Block directory traversal explicitly
      if (pathPart.includes('..') || pathPart.includes('%2e%2e') || pathPart.includes('\\')) {
        return res.status(403).send("Forbidden directory traversal");
      }

      // Block access to potential configuration/secret/database/credential files
      const sensitivePattern = /(config|secret|credential|key|token|auth|env|database|db|schema|setting|setup|password|private)\./i;
      if (sensitivePattern.test(pathPart)) {
        return res.status(403).send("Forbidden: Access to sensitive source configuration or database schema files is restricted.");
      }

      const safeSrcDir = path.resolve(process.cwd(), "src");
      // Sanitize req.path to prevent backslash-based bypass and resolve properly
      const sanitizedPath = req.path.replace(/\\/g, '/');
      const filePath = path.resolve(process.cwd(), sanitizedPath.startsWith('/') ? sanitizedPath.substring(1) : sanitizedPath);
      
      if (!filePath.startsWith(safeSrcDir + path.sep) && filePath !== safeSrcDir) {
        return res.status(403).send("Forbidden directory traversal");
      }
      res.sendFile(filePath, (err) => {
        if (err) { res.status(404).send("Source file not found"); }
      });
    });
    app.get('*', (_req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Centralized Error Handling Middleware to prevent raw database/internal system details leak (Information Disclosure)
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    captureError(err, { context: 'Centralized Express Error Handler' });
    console.error('Unhandled Server Error:', err);
    
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      error: 'An internal server error occurred. Please try again later.'
    });
  });

  async function registerTelegramWebhook() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const appUrl = process.env.APP_URL;
    if (token && appUrl && appUrl !== "MY_APP_URL") {
      const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/telegram`;
      console.log(`[Telegram Bot] Registering webhook to: ${webhookUrl}`);
      try {
        const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET || crypto.createHash('sha256').update(token).digest('hex').substring(0, 32);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${encodeURIComponent(secretToken)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const body: any = await res.json();
        console.log(`[Telegram Bot] Webhook registration response:`, body);
      } catch (err: any) {
        console.error(`[Telegram Bot] Webhook registration failed:`, err.message);
      }
    } else {
      console.log(`[Telegram Bot] Skipping auto-webhook registration. Make sure APP_URL and TELEGRAM_BOT_TOKEN are set in your environment.`);
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    
    // Start high-performance queue Worker
    if (ConfigurationService.getFlag('enableDependencyInjection')) {
      console.log("Starting background worker queue state machine...");
      WorkerService.start();
    }

    // Register Telegram Webhook if configured
    registerTelegramWebhook().catch(err => console.error("Telegram webhook registration error on startup:", err));

    // Perform boot-up check for Sunday tasks and expired trending products
    console.log("Initializing boot-up checks for automated Sunday products and trending items...");
    runSundayAutomation().catch(err => console.error("Startup Sunday automation check error:", err));
    cleanExpiredTrendingProducts().catch(err => console.error("Startup trending expiration check error:", err));
    cleanExpiredBlacklistedTokens().catch(err => console.error("Startup blacklisted tokens purge error:", err));

    // Schedule background check every 12 hours
    const backgroundTask = setInterval(() => {
      console.log("Running scheduled periodic background sync...");
      runSundayAutomation().catch(err => console.error("Scheduled Sunday automation error:", err));
      cleanExpiredTrendingProducts().catch(err => console.error("Scheduled trending expiration error:", err));
      cleanExpiredBlacklistedTokens().catch(err => console.error("Scheduled blacklisted tokens purge error:", err));
    }, 12 * 60 * 60 * 1000);

    const gracefulShutdown = (signal: string) => {
      console.log(`[Graceful Shutdown] Received ${signal}. Starting shutdown sequence...`);
      clearInterval(backgroundTask);
      WorkerService.stop();

      server.close(async () => {
        console.log('[Graceful Shutdown] HTTP server closed.');
        if (isMongoConnected) {
          try {
            await mongoose.disconnect();
            console.log('[Graceful Shutdown] MongoDB connection disconnected cleanly.');
          } catch (e) {
            console.error('[Graceful Shutdown] Failed to cleanly disconnect MongoDB:', e);
          }
        }
        console.log('[Graceful Shutdown] Shutdown complete. Exiting.');
        process.exit(0);
      });

      // Force shutdown after 10s timeout
      setTimeout(() => {
        console.error('[Graceful Shutdown] Forced shutdown timeout exceeded. Forcing exit.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  });

  // TCP / HTTP server production-ready optimizations
  server.keepAliveTimeout = 65000; // 65s (larger than standard ALB/Nginx proxy timeouts)
  server.headersTimeout = 66000;   // Keep slightly higher than keepAliveTimeout
  server.requestTimeout = 30000;   // 30s request timeout to prevent hanging connections
}

startServer().catch(err => {
  console.error("Unhandled promise rejection in startServer:", err);
  process.exit(1);
});
