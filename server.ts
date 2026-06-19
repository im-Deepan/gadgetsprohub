import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { seedOrders, seedCategories, seedProducts, seedBlogs, seedUsers, seedMessages, LocalUserType } from './seeddata';

dotenv.config();
console.log("MONGODB_URI =", process.env.MONGODB_URI);

const getJwtSecret = (): string => {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '' && process.env.JWT_SECRET !== 'your-secret-key') {
    return process.env.JWT_SECRET;
  }
  console.warn("⚠️ WARNING: JWT_SECRET env variable not provided or is set to a default insecure value. Generating a persistent cryptographically random fallback key for this container session to ensure absolute token integrity.");
  return crypto.randomBytes(64).toString('hex');
};
const JWT_SECRET_KEY = getJwtSecret();

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
import { comparePasswords, hashHelper, isAdminEmail, getStorageEmail } from './src/server/utils';

// Category Schema
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
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
  
  let hash = 0;
  for (let i = 0; i < formatted.length; i++) {
    hash = (hash << 5) - hash + formatted.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % TAMIL_NADU_DISTRICTS.length;
  return TAMIL_NADU_DISTRICTS[index];
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

let localOrders: any[] = JSON.parse(JSON.stringify(seedOrders));
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

let localCategories = JSON.parse(JSON.stringify(seedCategories));

let localProducts = JSON.parse(JSON.stringify(seedProducts));
if (fs.existsSync(LOCAL_PRODUCTS_FILE)) {
  try {
    localProducts = JSON.parse(fs.readFileSync(LOCAL_PRODUCTS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_products.json fallback:", err.message);
  }
}

let localBlogs = JSON.parse(JSON.stringify(seedBlogs));

let localUsers: LocalUserType[] = JSON.parse(JSON.stringify(seedUsers));
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

const originalLocalProducts = JSON.parse(JSON.stringify(seedProducts));

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

// ========== MIDDLEWARE ==========

const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction): any => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No authorization token supplied' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token, please authorize again' });
  }
};

const adminOnly = (req: express.Request, res: express.Response, next: express.NextFunction): any => {
  authenticate(req, res, () => {
    const userId = (req as any).userId;
    
    if (isMongoConnected) {
      User.findById(userId).then(user => {
        if (!user) return res.status(403).json({ error: 'Administrative privileges required' });
        
        if (isAdminEmail(user.email)) {
          if (user.role !== 'admin') {
            user.role = 'admin';
            user.save().catch(e => console.warn("Failed automatic database role promotion:", e));
          }
          return next();
        }
        
        if (user.role === 'admin') {
          return next();
        }
        
        return res.status(403).json({ error: 'Administrative privileges required' });
      }).catch(err => {
        res.status(500).json({ error: err.message });
      });
    } else {
      const u = localUsers.find(user => user._id === userId);
      if (!u) return res.status(403).json({ error: 'Administrative privileges required' });
      
      if (isAdminEmail(u.email)) {
        u.role = 'admin';
        return next();
      }
      
      if (u.role === 'admin') {
        return next();
      }
      
      return res.status(403).json({ error: 'Administrative privileges required' });
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

// Helper function to dynamically sync the current products list to seeddata.ts
async function syncProductsToSeedFile() {
  try {
    let productsToSave: any[] = [];
    if (isMongoConnected) {
      productsToSave = await Product.find().lean();
    } else {
      productsToSave = localProducts;
    }

    const filePath = path.join(process.cwd(), 'seeddata.ts');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const startKeyword = 'export const seedProducts = ';
      const endKeyword = 'export const seedBlogs = ';

      const startIndex = content.indexOf(startKeyword);
      const endIndex = content.indexOf(endKeyword);

      if (startIndex !== -1 && endIndex !== -1) {
        const before = content.substring(0, startIndex);
        const after = content.substring(endIndex);
        // Standardize JSON representation of products
        const productsJson = JSON.stringify(productsToSave, null, 2);

        const newContent = before + startKeyword + productsJson + ';\n\n' + after;
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Successfully synchronized ${productsToSave.length} products to seeddata.ts`);
      } else {
        console.warn('Could not find seedProducts or seedBlogs keywords in seeddata.ts');
      }
    } else {
      console.warn('seeddata.ts file does not exist at expected path:', filePath);
    }
  } catch (err: any) {
    console.error('Error in syncProductsToSeedFile:', err.message);
  }
}

async function syncCategoriesToSeedFile() {
  try {
    let categoriesToSave: any[] = [];
    if (isMongoConnected) {
      categoriesToSave = await Category.find().lean();
    } else {
      categoriesToSave = localCategories;
    }

    const filePath = path.join(process.cwd(), 'seeddata.ts');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const startKeyword = 'export const seedCategories = ';
      const endKeyword = 'export const seedProducts = ';

      const startIndex = content.indexOf(startKeyword);
      const endIndex = content.indexOf(endKeyword);

      if (startIndex !== -1 && endIndex !== -1) {
        const before = content.substring(0, startIndex);
        const after = content.substring(endIndex);
        const categoriesJson = JSON.stringify(categoriesToSave, null, 2);

        const newContent = before + startKeyword + categoriesJson + ';\n\n' + after;
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Successfully synchronized ${categoriesToSave.length} categories to seeddata.ts`);
      }
    }
  } catch (err: any) {
    console.error('Error in syncCategoriesToSeedFile:', err.message);
  }
}

async function syncBlogsToSeedFile() {
  try {
    let blogsToSave: any[] = [];
    if (isMongoConnected) {
      blogsToSave = await Blog.find().lean();
    } else {
      blogsToSave = localBlogs;
    }

    const filePath = path.join(process.cwd(), 'seeddata.ts');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const startKeyword = 'export const seedBlogs = ';
      const endKeyword = 'export const seedUsers';

      const startIndex = content.indexOf(startKeyword);
      const endIndex = content.indexOf(endKeyword);

      if (startIndex !== -1 && endIndex !== -1) {
        const before = content.substring(0, startIndex);
        const after = content.substring(endIndex);
        const blogsJson = JSON.stringify(blogsToSave, null, 2);

        const newContent = before + startKeyword + blogsJson + ';\n\n' + after;
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Successfully synchronized ${blogsToSave.length} blogs to seeddata.ts`);
      }
    }
  } catch (err: any) {
    console.error('Error in syncBlogsToSeedFile:', err.message);
  }
}

async function syncMessagesToSeedFile() {
  try {
    let messagesToSave: any[] = [];
    if (isMongoConnected) {
      messagesToSave = await Message.find().lean();
    } else {
      messagesToSave = localMessages;
    }

    const filePath = path.join(process.cwd(), 'seeddata.ts');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const startKeyword = 'export const seedMessages = ';

      const startIndex = content.indexOf(startKeyword);

      if (startIndex !== -1) {
        const before = content.substring(0, startIndex);
        const messagesJson = JSON.stringify(messagesToSave, null, 2);

        const newContent = before + startKeyword + messagesJson + ';\n';
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Successfully synchronized ${messagesToSave.length} messages to seeddata.ts`);
      }
    }
  } catch (err: any) {
    console.error('Error in syncMessagesToSeedFile:', err.message);
  }
}

async function resolveUniqueSlug(
  baseSlug: string,
  type: 'product' | 'blog',
  excludeId?: string
): Promise<{ exists: boolean; finalSlug: string }> {
  let slug = baseSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
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
        return localProducts.some(p => p.slug === testSlug && p._id !== excludeId);
      } else {
        return localBlogs.some(b => b.slug === testSlug && b._id !== excludeId);
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
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      mailTransport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      console.log("Nodemailer SMTP transport configured successfully.");
    } else {
      console.log("SMTP user/pass missing, SMTP emails will be logged and simulated.");
    }
  }
  return mailTransport;
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
      console.error("Error cleaning expired trending products in Mongo:", err);
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

// Task execution function to automatically populate and notify the admin's mailbox
async function runSundayAutomation(targetSundayStr?: string, forceEmail?: string) {
  let sundayStr = targetSundayStr;
  
  if (!sundayStr) {
    const today = new Date();
    if (today.getDay() !== 0) {
      return null; // Only run on Sundays unless targetSundayStr is provided
    }
    sundayStr = today.toISOString().split('T')[0];
  }

  // Check unique log constraints
  if (isMongoConnected) {
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
  if (isMongoConnected) {
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

  if (isMongoConnected) {
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
      }
      await syncProductsToSeedFile();
    } catch (err) {
      console.error("Error saving automatic Sunday products to Mongo:", err);
    }
  } else {
    for (const raw of newProdsRaw) {
      localProducts.unshift(raw);
      addedIds.push(raw._id);
      addedProductsList.push(raw);
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
  if (transporter) {
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
  }

  const logObj = {
    sundayDate: sundayStr,
    runAt: new Date(),
    localProductsAddedIds: addedIds,
    emailSentTo: authorEmail,
    emailSubject,
    emailBody: htmlBody,
    sentStatus,
    errorDetails
  };

  let finalLog: any = null;
  if (isMongoConnected) {
    try {
      const mongoLog = new SundayAutomationLog({
        ...logObj,
        productsAdded: addedIds.map(id => new mongoose.Types.ObjectId(id))
      });
      await mongoLog.save();
      finalLog = mongoLog;
    } catch (err) {
      console.error(err);
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

  // Security Headers and Reverse Proxy configuration
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://pagead2.googlesyndication.com", "https://*.doubleclick.net", "https://*.googlesyndication.com", "https://*.google.com", "https://*.adtrafficquality.google", "https://ep2.adtrafficquality.google"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "*"],
        connectSrc: ["'self'", "wss:", "https:"],
        frameSrc: ["'self'", "https:", "*"],
        frameAncestors: ["*"],
      }
    },
    frameguard: false,           // allow container embedding
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  app.disable('x-powered-by');

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // General API call rate limiter (Dos protection)
  const generalLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 1000,
    message: { error: 'Too many requests from this IP address, please retry in 5 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', generalLimiter);

  // Auth specific rate limiter (Anti-Bruteforce / credential padding mitigation)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: { error: 'Excessive authorization activities detected, please attempt again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
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
        const laptopId = sampleProducts[2]?._id;
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
    { serverSelectionTimeoutMS: 1500 }
  )
  .then(() => {
    console.log('Successfully connected to MongoDB Cluster');
    isMongoConnected = true;

    // Safely drop index sub_1 if it exists in the database
    mongoose.connection.db.collection('users').dropIndex('sub_1')
      .then(() => console.log('Successfully dropped stale sub_1 index.'))
      .catch((err: any) => console.log('Stale index sub_1 dropped or not exists. Msg:', err.message));

    seedDatabase();
  })
  .catch((err: any) => {
    console.log('Database notice: Safe offline in-memory fallback enabled. MongoDB connection resolved as offline. Info:', err.message);
    isMongoConnected = false;
  });

  // ========== API ROUTES ==========

  // Lightweight health-check endpoint verifying DB connectivity gracefully without hanging
  app.get('/api/health-check', async (req, res) => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database ping timeout (2000ms achieved)')), 2000)
    );

    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        await Promise.race([
          mongoose.connection.db.admin().ping(),
          timeoutPromise
        ]);
        return res.json({
          status: 'healthy',
          database: 'connected',
          atlas: true,
          timestamp: new Date()
        });
      } else {
        const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        const state = mongoose.connection.readyState;
        const stateName = (state >= 0 && state < stateNames.length) ? stateNames[state] : 'unknown';
        return res.status(503).json({
          status: 'unhealthy',
          database: stateName,
          atlas: false,
          fallbackMode: true,
          timestamp: new Date()
        });
      }
    } catch (err: any) {
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

  // SEO Routes (Robots & Sitemap)
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nAllow: /\nSitemap: /sitemap.xml');
  });

  app.get('/.well-known/security.txt', (req, res) => {
    res.type('text/plain');
    res.send('Contact: mailto:security@gadgetsprohub.com\nExpires: 2027-01-01T00:00:00.000Z\nPreferred-Languages: en');
  });

  app.get('/security.txt', (req, res) => {
    res.type('text/plain');
    res.send('Contact: mailto:security@gadgetsprohub.com\nExpires: 2027-01-01T00:00:00.000Z\nPreferred-Languages: en');
  });

  app.get('/sitemap.xml', async (req, res) => {
    // Dynamically resolve base URL to support both Render fallback domain and custom domains
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'gadgetsprohub.com';
    const baseUrl = `${protocol}://${host}`;

    let productsList: { slug: string; updatedAt?: any; createdAt?: any }[] = [];
    let blogsList: { slug: string; updatedAt?: any; createdAt?: any }[] = [];

    try {
      if (isMongoConnected) {
        productsList = await Product.find({}, 'slug updatedAt createdAt').lean() as any[];
        blogsList = await Blog.find({ published: true }, 'slug updatedAt createdAt').lean() as any[];
      } else {
        productsList = (localProducts || []).map((p: any) => ({
          slug: p.slug,
          updatedAt: p.updatedAt || p.createdAt,
        }));
        blogsList = (localBlogs || []).map((b: any) => ({
          slug: b.slug,
          updatedAt: b.updatedAt || b.createdAt,
        }));
      }
    } catch (e) {
      console.warn("Sitemap production/blog query error:", e);
    }

    const staticUrls = [
      { path: '', changefreq: 'daily', priority: '1.0' },
      { path: 'products', changefreq: 'daily', priority: '0.9' },
      { path: 'blogs', changefreq: 'weekly', priority: '0.8' },
      { path: 'contact', changefreq: 'monthly', priority: '0.6' },
      { path: 'about-us', changefreq: 'monthly', priority: '0.5' },
      { path: 'privacy-policy', changefreq: 'monthly', priority: '0.4' },
      { path: 'terms-conditions', changefreq: 'monthly', priority: '0.4' },
      { path: 'disclaimer', changefreq: 'monthly', priority: '0.4' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    const todayStr = new Date().toISOString().split('T')[0];
    for (const item of staticUrls) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/${item.path}</loc>\n`;
      xml += `    <lastmod>${todayStr}</lastmod>\n`;
      xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
      xml += `    <priority>${item.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic products
    for (const prod of productsList) {
      if (!prod.slug) continue;
      const dateVal = prod.updatedAt || prod.createdAt || new Date();
      let dateStr = todayStr;
      try {
        dateStr = new Date(dateVal).toISOString().split('T')[0];
      } catch {
        dateStr = todayStr;
      }
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/product-detail/${prod.slug}</loc>\n`;
      xml += `    <lastmod>${dateStr}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic blogs
    for (const blog of blogsList) {
      if (!blog.slug) continue;
      const dateVal = blog.updatedAt || blog.createdAt || new Date();
      let dateStr = todayStr;
      try {
        dateStr = new Date(dateVal).toISOString().split('T')[0];
      } catch {
        dateStr = todayStr;
      }
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/blog-detail/${blog.slug}</loc>\n`;
      xml += `    <lastmod>${dateStr}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.type('application/xml');
    res.send(xml);
  });

  // Auth Routes
  app.post('/api/auth/register', async (req, res): Promise<any> => {
    try {
      const { email, password, name } = req.body;
      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input data format supplied' });
      }
      if (!email.trim() || !password.trim()) {
        return res.status(400).json({ error: 'Email and password metrics required' });
      }
      
      const storageEmail = getStorageEmail(email);
      if (!storageEmail) {
        return res.status(400).json({ error: 'Invalid email address structure' });
      }
      const initialRole = isAdminEmail(storageEmail) ? 'admin' : 'user';
      if (isMongoConnected) {
        // Pre-check for duplicate account registration in MongoDB
        const existingUser = await User.findOne({ email: storageEmail });
        if (existingUser) {
          return res.status(400).json({ error: 'You already have an account registered with this email address. Please login instead.' });
        }
        
        const user = new User({ email: storageEmail, password, name, role: initialRole });
        try {
          await user.save();
        } catch (saveError: any) {
          return res.status(400).json({ error: 'Failed to create user account: ' + saveError.message });
        }
        const token = jwt.sign({ userId: user._id }, JWT_SECRET_KEY, { expiresIn: '30d' });
        return res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, district: user.district } });
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
          createdAt: new Date()
        };
        localUsers.push(newUser);
        saveLocalUsers();
        const token = jwt.sign({ userId: newUser._id }, JWT_SECRET_KEY, { expiresIn: '30d' });
        return res.json({ token, user: { id: newUser._id, email: newUser.email, name: newUser.name, role: newUser.role, district: newUser.district } });
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
      res.status(400).json({ error: friendlyError });
    }
  });

  app.post('/api/auth/login', async (req, res): Promise<any> => {
    try {
      const { email, password } = req.body;
      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid credentials format' });
      }
      const storageEmail = getStorageEmail(email);
      if (!storageEmail) {
        return res.status(401).json({ error: 'Invalid credentials, please retry' });
      }
      if (isMongoConnected) {
        const user = await User.findOne({ email: storageEmail });
        if (!user) {
          return res.status(401).json({ error: 'This email is not registered. Please sign up first.' });
        }
        if (!user.password) {
          return res.status(401).json({ error: 'This account was created via Google Sign-In. Please sign in with Google.' });
        }
        const isMatch = await comparePasswords(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Incorrect password. Please try again.' });
        }
        if (isAdminEmail(user.email) && user.role !== 'admin') {
          user.role = 'admin';
          await user.save().catch(e => console.warn(e));
        }
        const token = jwt.sign({ userId: user._id }, JWT_SECRET_KEY, { expiresIn: '30d' });
        return res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, district: user.district } });
      } else {
        const user = localUsers.find(u => u.email === storageEmail);
        if (!user) {
          return res.status(401).json({ error: 'This email is not registered. Please sign up first.' });
        }
        if (!user.password) {
          return res.status(401).json({ error: 'This account was created via Google Sign-In. Please sign in with Google.' });
        }
        const isMatch = await comparePasswords(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Incorrect password. Please try again.' });
        }
        if (isAdminEmail(user.email)) {
          user.role = 'admin';
          saveLocalUsers();
        }
        const token = jwt.sign({ userId: user._id }, JWT_SECRET_KEY, { expiresIn: '30d' });
        return res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, district: user.district || 'Chennai' } });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/auth/google', async (req, res): Promise<any> => {
    try {
      const { email, name, googleId, profileImage } = req.body;
      if (typeof email !== 'string') {
        return res.status(400).json({ error: 'Invalid email parameter' });
      }
      const storageEmail = getStorageEmail(email);
      if (!storageEmail) {
        return res.status(400).json({ error: 'Invalid email configuration' });
      }
      const initialRole = isAdminEmail(storageEmail) ? 'admin' : 'user';
      if (isMongoConnected) {
        let user = await User.findOne({ email: storageEmail });
        if (!user) {
          user = new User({ email: storageEmail, name, googleId, profileImage, role: initialRole });
          try {
            await user.save();
          } catch (err: any) {
            return res.status(500).json({ error: 'Failed to create user account: ' + err.message });
          }
        } else if (isAdminEmail(user.email) && user.role !== 'admin') {
          user.role = 'admin';
          await user.save().catch(e => console.warn(e));
        }
        const token = jwt.sign({ userId: user._id }, JWT_SECRET_KEY, { expiresIn: '30d' });
        return res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, district: user.district } });
      } else {
        let user = localUsers.find(u => u.email === storageEmail);
        if (!user) {
          user = {
            _id: "user_g_" + Math.random().toString(36).substring(2, 9),
            email: storageEmail,
            password: 'google_oauth_fallback_passwd',
            name: name || 'Google Explorer',
            role: initialRole,
            wishlist: [] as any[],
            recentlyViewed: [] as any[],
            district: 'Chennai',
            createdAt: new Date()
          };
          localUsers.push(user);
          saveLocalUsers();
        } else if (isAdminEmail(user.email)) {
          user.role = 'admin';
          saveLocalUsers();
        }
        const token = jwt.sign({ userId: user._id }, JWT_SECRET_KEY, { expiresIn: '30d' });
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
      res.status(400).json({ error: friendlyError });
    }
  });

  // Product Routes
  app.get('/api/products', async (req, res) => {
    try {
      await cleanExpiredTrendingProducts();
      const { category, subcategory, brand, minPrice, maxPrice, search, rating, sort, page = 1, limit = 12, inStock, exclude, trending } = req.query;
      
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
            categoryIds = matchedCats.map(c => c._id);
          } catch (err) {
            console.warn("Category search mapping error:", err);
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
        // Safe robust in-memory search parameters translation
        let list = [...localProducts] as any[];
        
        if (trending === 'true' || category === 'trending') {
          list = list.filter(p => p.trending === true);
        } else if (category) {
          list = list.filter(p => {
            const pCatId = typeof p.category === 'object' && p.category ? (p.category as any)._id : p.category;
            return String(pCatId) === String(category);
          });
        }
        if (subcategory) {
          list = list.filter(p => p.subcategory?.toLowerCase() === (subcategory as string).toLowerCase());
        }
        if (brand) {
          list = list.filter(p => p.brand?.toLowerCase() === (brand as string).toLowerCase());
        }
        if (exclude) {
          const excludeArr = String(exclude).split(',').filter(Boolean);
          list = list.filter(p => !excludeArr.includes(String(p._id)));
        }
        if (search) {
          const s = (search as string).toLowerCase().trim();
          list = list.filter(p => {
            const catName = typeof p.category === 'object' && p.category ? (p.category as any).name : '';
            return p.name?.toLowerCase().includes(s) || 
                   p.brand?.toLowerCase().includes(s) ||
                   p.sku?.toLowerCase().includes(s) ||
                   p.tags?.some((t: string) => t.toLowerCase().includes(s)) ||
                   catName?.toLowerCase().includes(s);
          });
        }
        if (minPrice) {
          list = list.filter(p => p.price >= Number(minPrice));
        }
        if (maxPrice) {
          list = list.filter(p => p.price <= Number(maxPrice));
        }
        if (rating) {
          list = list.filter(p => p.rating >= Number(rating));
        }
        if (inStock === 'true') {
          list = list.filter(p => p.inStock === true);
        }

        if (sort === 'price-asc') {
          list.sort((a, b) => a.price - b.price);
        } else if (sort === 'price-desc') {
          list.sort((a, b) => b.price - a.price);
        } else if (sort === 'newest') {
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else if (sort === 'rating') {
          list.sort((a, b) => b.rating - a.rating);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const paginated = list.slice(skip, skip + Number(limit));
        
        // Re-inject fully populated Category object
        const finalProducts = paginated.map(p => {
          const catId = typeof p.category === 'object' && p.category ? (p.category as any)._id : p.category;
          const matchedCat = localCategories.find(c => c._id === catId);
          return {
            ...p,
            category: matchedCat || { _id: catId, name: "General", slug: "general" }
          };
        });

        res.json({
          products: finalProducts,
          total: list.length,
          pages: Math.ceil(list.length / Number(limit)),
          currentPage: Number(page)
        });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/products/:slug', async (req, res): Promise<any> => {
    try {
      const districtsList = ['Chennai', 'Madurai', 'Tirunelveli', 'Virudhunagar'];
      const randDistrict = districtsList[Math.floor(Math.random() * districtsList.length)];

      if (isMongoConnected) {
        const product = await Product.findOne({ slug: req.params.slug })
          .populate('category')
          .populate('reviews.userId', 'name profileImage');
        
        if (!product) return res.status(404).json({ error: 'Product catalog item not found' });
        
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
      } else {
        const item = localProducts.find(p => p.slug === req.params.slug);
        if (!item) return res.status(404).json({ error: 'Product catalog item not found' });
        
        const catId = typeof item.category === 'object' && item.category ? (item.category as any)._id : item.category;
        const matchedCat = localCategories.find(c => c._id === catId);
        
        // Record Analytics View
        localAnalytics.push({
          productId: item._id,
          eventType: 'view',
          district: randDistrict,
          timestamp: new Date(),
          userAgent: req.headers['user-agent']
        });

        const detailedProduct = {
          ...item,
          category: matchedCat || { _id: catId, name: "General" }
        };
        return res.json(detailedProduct);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/products/click/:slug', async (req, res): Promise<any> => {
    try {
      const districtsList = ['Chennai', 'Madurai', 'Tirunelveli', 'Virudhunagar'];
      const randDistrict = districtsList[Math.floor(Math.random() * districtsList.length)];
      const finalDistrict = sanitizeDistrict(req.body.district || randDistrict);

      if (isMongoConnected) {
        const product = await Product.findOne({ slug: req.params.slug });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        
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
      } else {
        const product = localProducts.find(p => p.slug === req.params.slug);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        
        product.clicks = (product.clicks || 0) + 1;
        
        localAnalytics.push({
          productId: product._id,
          affiliateCode: product.affiliateCode,
          eventType: 'click',
          district: finalDistrict,
          userId: req.body.userId,
          timestamp: new Date()
        });
        return res.json({ success: true, affiliateLink: product.affiliateLink });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/products/:id/reviews', authenticate, async (req, res): Promise<any> => {
    try {
      const uId = (req as any).userId;
      const { id } = req.params;
      const { rating, title, content } = req.body;

      if (rating === undefined || title === undefined || content === undefined) {
        return res.status(400).json({ error: 'All review parameters (rating, title, content) are required.' });
      }

      if (typeof title !== 'string' || typeof content !== 'string') {
        return res.status(400).json({ error: 'All text parameters must be standard strings.' });
      }

      const trimmedTitle = title.trim();
      const trimmedContent = content.trim();

      if (!trimmedTitle || trimmedTitle.length > 128) {
        return res.status(400).json({ error: 'Title must be between 1 and 128 characters.' });
      }

      if (!trimmedContent || trimmedContent.length > 2000) {
        return res.status(400).json({ error: 'Content must be between 1 and 2000 characters.' });
      }

      const parsedRating = Number(rating);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ error: 'Rating must be a valid number between 1 and 5.' });
      }

      if (isMongoConnected) {
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ error: 'Product not found.' });

        const user = await User.findById(uId);
        if (!user) return res.status(404).json({ error: 'User validation failed.' });

        const newReview = {
          userId: uId,
          rating: parsedRating,
          title: trimmedTitle,
          content: trimmedContent,
          helpful: 0,
          createdAt: new Date()
        };

        product.reviews.push(newReview as any);
        
        const sum = product.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        product.totalReviews = product.reviews.length;
        product.rating = Number((sum / product.reviews.length).toFixed(1));

        await product.save();

        const populatedProduct = await Product.findById(product._id)
          .populate('category')
          .populate('reviews.userId', 'name profileImage');

        return res.json(populatedProduct);
      } else {
        const product = localProducts.find(p => p._id === id);
        if (!product) return res.status(404).json({ error: 'Product not found.' });

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
          rating: parsedRating,
          title: trimmedTitle,
          content: trimmedContent,
          helpful: 0,
          createdAt: new Date().toISOString()
        };

        if (!product.reviews) product.reviews = [];
        product.reviews.push(newReview as any);

        const sum = (product.reviews as any).reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
        product.totalReviews = product.reviews.length;
        product.rating = Number((sum / product.reviews.length).toFixed(1));

        return res.json(product);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Category Retrieval
  app.get('/api/categories', async (req, res) => {
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
  app.get('/api/featured', async (req, res) => {
    try {
      if (isMongoConnected) {
        const products = await Product.find({ featured: true }).limit(6).populate('category');
        res.json(products);
      } else {
        const list = localProducts.filter(p => p.featured).slice(0, 6).map(p => {
          const catId = typeof p.category === 'object' && p.category ? (p.category as any)._id : p.category;
          const catObj = localCategories.find(c => c._id === catId);
          return { ...p, category: catObj || { name: 'General' } };
        });
        res.json(list);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/trending', async (req, res) => {
    try {
      await cleanExpiredTrendingProducts();
      if (isMongoConnected) {
        const products = await Product.find({ trending: true }).limit(8).populate('category');
        res.json(products);
      } else {
        const list = localProducts.filter(p => p.trending).slice(0, 8).map(p => {
          const catId = typeof p.category === 'object' && p.category ? (p.category as any)._id : p.category;
          const catObj = localCategories.find(c => c._id === catId);
          return { ...p, category: catObj || { name: 'General' } };
        });
        res.json(list);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Profile management
  app.get('/api/user/profile', authenticate, async (req, res): Promise<any> => {
    try {
      const uId = (req as any).userId;
      if (isMongoConnected) {
        const user = await User.findById(uId).populate('wishlist');
        if (user && isAdminEmail(user.email)) {
          if (user.role !== 'admin') {
            user.role = 'admin';
            await user.save().catch(e => console.warn(e));
          }
        }
        return res.json(user);
      } else {
        const user = localUsers.find(u => u._id === uId);
        if (!user) return res.status(404).json({ error: 'User profiles matching identifier not found' });
        
        if (isAdminEmail(user.email)) {
          user.role = 'admin';
          saveLocalUsers();
        }

        // Map Wishlist Items
        const wishlistPopulated = (user.wishlist || []).map(idStr => {
          return localProducts.find(p => p._id === idStr) || null;
        }).filter(Boolean);

        return res.json({
          ...user,
          wishlist: wishlistPopulated,
          recentlyViewed: []
        });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/user/wishlist/:productId', authenticate, async (req, res): Promise<any> => {
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

  // Order Management APIs
  app.get('/api/user/orders', authenticate, async (req, res): Promise<any> => {
    try {
      const uId = (req as any).userId;
      if (isMongoConnected) {
        const orders = await Order.find({ userId: uId }).populate('items.product').sort({ createdAt: -1 });
        return res.json(orders);
      } else {
        // In-Memory Fallback
        let orders = localOrders.filter(o => o.userId === uId);
        // Populate products inside localOrders items
        orders = orders.map(ord => {
          const populatedItems = ord.items.map((it: any) => {
            const matchedProduct = typeof it.product === 'object' ? it.product : localProducts.find(lp => lp._id === it.product);
            return { ...it, product: matchedProduct };
          });
          return { ...ord, items: populatedItems };
        });
        return res.json(orders);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/user/orders', authenticate, async (req, res): Promise<any> => {
    try {
      const uId = (req as any).userId;
      const { items, totalAmount } = req.body;
      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No order items specified' });
      }

      const trackingNumber = 'TRK' + Math.floor(100000000 + Math.random() * 900000000);
      const carrier = ['FedEx Ground', 'UPS Next Day Air', 'DHL Express', 'USPS Priority Mail'][Math.floor(Math.random() * 4)];
      const estDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      if (isMongoConnected) {
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
        const newOrder = {
          _id: "order_" + Math.random().toString(36).substring(2, 9),
          userId: uId,
          items: items.map((it: any) => {
            const matchedProduct = localProducts.find(lp => lp._id === it.product);
            return { ...it, product: matchedProduct || it.product };
          }),
          totalAmount,
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

  app.post('/api/user/orders/:orderId/advance', authenticate, async (req, res): Promise<any> => {
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
        const nextIndex = (currentIndex + 1) % statuses.length;
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
        const nextIndex = (currentIndex + 1) % statuses.length;
        order.status = statuses[nextIndex];
        saveLocalOrders();
        
        const populatedItems = order.items.map((it: any) => {
          const matchedProduct = typeof it.product === 'object' ? it.product : localProducts.find(lp => lp._id === it.product);
          return { ...it, product: matchedProduct };
        });
        
        return res.json({ ...order, items: populatedItems });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Blog Routes
  app.get('/api/blogs', async (req, res) => {
    try {
      const { page = 1, limit = 10, search, category } = req.query;
      
      if (isMongoConnected) {
        const filter: any = { published: true };
        if (search) filter.$text = { $search: String(search) };
        if (category) filter.category = String(category);

        const skip = (Number(page) - 1) * Number(limit);
        const blogs = await Blog.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });
        const total = await Blog.countDocuments(filter);
        res.json({ blogs, total, pages: Math.ceil(total / Number(limit)) });
      } else {
        let list = [...localBlogs];
        if (search) {
          const s = (search as string).toLowerCase();
          list = list.filter(b => b.title.toLowerCase().includes(s) || b.content.toLowerCase().includes(s));
        }
        if (category) {
          list = list.filter(b => b.category?.toLowerCase() === (category as string).toLowerCase());
        }
        
        const skip = (Number(page) - 1) * Number(limit);
        const paginated = list.slice(skip, skip + Number(limit));
        res.json({
          blogs: paginated,
          total: list.length,
          pages: Math.ceil(list.length / Number(limit))
        });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/blogs/:slug', async (req, res): Promise<any> => {
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
        const blog = localBlogs.find(b => b.slug === req.params.slug);
        if (!blog) return res.status(404).json({ error: 'Blog post not found' });
        blog.views += 1;
        return res.json(blog);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Visitor tracking registration route
  app.post('/api/visit', async (req, res): Promise<any> => {
    try {
      const { visitorId } = req.body;
      if (!visitorId || typeof visitorId !== 'string') {
        return res.status(400).json({ error: 'visitorId is required and must be a valid string' });
      }

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
  app.post('/api/contact', async (req, res): Promise<any> => {
    try {
      const { name, email, phone, subject, message } = req.body;

      // Type checks
      if (typeof name !== 'string' || typeof email !== 'string' || typeof subject !== 'string' || typeof message !== 'string') {
        return res.status(400).json({ error: 'All fields must be standard text strings' });
      }

      // Optional phone validation
      if (phone !== undefined && typeof phone !== 'string') {
        return res.status(400).json({ error: 'Phone number format is invalid' });
      }

      // Length validations
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      const trimmedSubject = subject.trim();
      const trimmedMessage = message.trim();
      const trimmedPhone = phone ? phone.trim() : '';

      if (!trimmedName || trimmedName.length > 128) {
        return res.status(400).json({ error: 'Name must be a non-empty string under 128 characters' });
      }
      if (!trimmedEmail || trimmedEmail.length > 128 || !trimmedEmail.includes('@')) {
        return res.status(400).json({ error: 'A valid email under 128 characters is required' });
      }
      if (!trimmedSubject || trimmedSubject.length > 256) {
        return res.status(400).json({ error: 'Subject must be a non-empty string under 256 characters' });
      }
      if (!trimmedMessage || trimmedMessage.length > 5000) {
        return res.status(400).json({ error: 'Message must be a non-empty string under 5000 characters' });
      }
      if (trimmedPhone && trimmedPhone.length > 32) {
        return res.status(400).json({ error: 'Phone number must be under 32 characters' });
      }

      if (isMongoConnected) {
        const m = new Message({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone || undefined,
          subject: trimmedSubject,
          message: trimmedMessage
        });
        await m.save();
        await syncMessagesToSeedFile();
        res.json({ success: true, message: 'Message sent successfully' });
      } else {
        localMessages.unshift({
          _id: "m_f_" + Math.random().toString(36).substring(2, 9),
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone || undefined,
          subject: trimmedSubject,
          message: trimmedMessage,
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
  app.post('/api/newsletter/subscribe', async (req, res): Promise<any> => {
    try {
      const { email } = req.body;
      if (typeof email !== 'string') {
        return res.status(400).json({ error: 'Email must be a standard text string' });
      }

      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || trimmedEmail.length > 128 || !trimmedEmail.includes('@')) {
        return res.status(400).json({ error: 'A valid email under 128 characters is required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }

      if (isMongoConnected) {
        const existing = await Subscriber.findOne({ email: trimmedEmail });
        if (existing) {
          return res.status(400).json({ error: 'This email is already subscribed to our newsletter' });
        }
        const s = new Subscriber({ email: trimmedEmail });
        await s.save();
      } else {
        const existing = localSubscribers.some(s => s.email === trimmedEmail);
        if (existing) {
          return res.status(400).json({ error: 'This email is already subscribed to our newsletter' });
        }
        localSubscribers.unshift({
          _id: "s_f_" + Math.random().toString(36).substring(2, 9),
          email: trimmedEmail,
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
  app.get('/api/search', async (req, res): Promise<any> => {
    try {
      const { q } = req.query;
      if (!q) return res.json({ products: [], blogs: [] });
      const queryStr = String(q).toLowerCase().trim();

      if (isMongoConnected) {
        const searchRegex = new RegExp(queryStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        
        let categoryIds: any[] = [];
        try {
          const matchedCats = await Category.find({ name: { $regex: searchRegex } });
          categoryIds = matchedCats.map(c => c._id);
        } catch (err) {
          console.warn("Category search mapping error:", err);
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
        const matchedProducts = localProducts.filter(p => {
          const catName = typeof p.category === 'object' && p.category ? (p.category as any).name : '';
          return p.name?.toLowerCase().includes(queryStr) || 
                 p.brand?.toLowerCase().includes(queryStr) ||
                 p.sku?.toLowerCase().includes(queryStr) ||
                 p.tags?.some(t => t.toLowerCase().includes(queryStr)) ||
                 catName?.toLowerCase().includes(queryStr);
        }).slice(0, 10);

        const matchedBlogs = localBlogs.filter(b => 
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
  app.get('/api/proxy/location', async (req, res) => {
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

    try {
      // Try ipapi.co
      const response = await fetch('https://ipapi.co/json/');
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
      const response = await fetch('https://freeipapi.com/api/json');
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
  app.post('/api/analytics/social-click', async (req, res) => {
    try {
      const { platform } = req.body;
      if (platform === 'instagram' || platform === 'linkedin') {
        socialClicks[platform]++;
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
  app.post('/api/analytics/filters', async (req, res) => {
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
  app.post('/api/analytics/page-view', async (req, res) => {
    try {
      const { pageUrl, timeSpent, browser, device, district } = req.body;
      
      // Determine if a token is passed and resolve user
      let userId: any = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET_KEY) as any;
          userId = decoded.userId;
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
  app.put('/api/user/profile', authenticate, async (req, res): Promise<any> => {
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
        return res.json(populated);
      } else {
        const user = localUsers.find(u => u._id === uId);
        if (!user) return res.status(404).json({ error: 'User profile not found' });
        
        if (name) user.name = name;
        if (district) user.district = district;
        saveLocalUsers();
        
        // Map Wishlist Items
        const wishlistPopulated = (user.wishlist || []).map(idStr => {
          return localProducts.find(p => p._id === idStr) || null;
        }).filter(Boolean);
        
        return res.json({
          ...user,
          wishlist: wishlistPopulated,
          recentlyViewed: []
        });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== ADMIN CAPABILITIES ==========

  // Seed Products Database
  app.post('/api/admin/seed', adminOnly, async (req, res): Promise<any> => {
    try {
      const { clearOnly, seedTrending, seedImageOverride } = req.body || {};
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
        return res.json({ success: true, message: "Database successfully re-seeded with pristine entries!", products: refetched });
      } else {
        localProducts.length = 0;
        localProducts.push(...JSON.parse(JSON.stringify(originalLocalProducts)).map((p: any) => {
          if (seedImageOverride) {
            p.images = [seedImageOverride];
          }
          return p;
        }));
        return res.json({ success: true, message: "In-memory database successfully re-seeded!", products: localProducts });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Products CRUD
  app.get('/api/admin/check-slug', adminOnly, async (req, res): Promise<any> => {
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

  app.post('/api/admin/products', adminOnly, async (req, res): Promise<any> => {
    try {
      const payload = cleanUndefined(req.body);
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
        res.json(product);
      } else {
        const newProduct = {
          _id: "prod_a_" + Math.random().toString(36).substring(2, 9),
          ...payload,
          slug: finalSlug,
          clicks: 0,
          conversions: 0,
          rating: 4.0,
          totalReviews: 0,
          reviews: [] as any[],
          createdAt: new Date()
        };
        localProducts.unshift(newProduct);
        await syncProductsToSeedFile();
        res.json(newProduct);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/admin/products/:id', adminOnly, async (req, res): Promise<any> => {
    try {
      const pId = req.params.id;
      const payload = cleanUndefined(req.body);
      
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
        const product = await Product.findByIdAndUpdate(pId, payload, { new: true });
        await syncProductsToSeedFile();
        return res.json(product);
      } else {
        const index = localProducts.findIndex(p => p._id === pId);
        if (index === -1) return res.status(404).json({ error: 'Product not found' });
        
        localProducts[index] = {
          ...localProducts[index],
          ...payload,
          updatedAt: new Date()
        };
        await syncProductsToSeedFile();
        return res.json(localProducts[index]);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/admin/products/:id', adminOnly, async (req, res): Promise<any> => {
    try {
      const pId = req.params.id;
      if (isMongoConnected) {
        if (mongoose.Types.ObjectId.isValid(pId)) {
          await Product.findByIdAndDelete(pId);
        } else {
          await Product.deleteOne({ _id: pId });
        }
        await syncProductsToSeedFile();
        return res.json({ success: true });
      } else {
        const index = localProducts.findIndex(p => p._id === pId || (p as any).id === pId);
        if (index === -1) return res.status(404).json({ error: 'Product not found' });
        localProducts.splice(index, 1);
        await syncProductsToSeedFile();
        return res.json({ success: true });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Categories CRUD
  app.post('/api/admin/categories', adminOnly, async (req, res) => {
    try {
      const payload = req.body;
      const slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      if (isMongoConnected) {
        const category = new Category({ ...payload, slug });
        await category.save();
        await syncCategoriesToSeedFile();
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
        res.json(newCat);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/admin/categories/:id', adminOnly, async (req, res): Promise<any> => {
    try {
      const catId = req.params.id;
      if (isMongoConnected) {
        const category = await Category.findByIdAndUpdate(catId, req.body, { new: true });
        await syncCategoriesToSeedFile();
        return res.json(category);
      } else {
        const index = localCategories.findIndex(c => c._id === catId);
        if (index === -1) return res.status(404).json({ error: 'Category not found' });
        localCategories[index] = {
          ...localCategories[index],
          ...req.body
        };
        await syncCategoriesToSeedFile();
        return res.json(localCategories[index]);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/admin/categories/:id', adminOnly, async (req, res): Promise<any> => {
    try {
      const catId = req.params.id;
      if (isMongoConnected) {
        await Category.findByIdAndDelete(catId);
        await syncCategoriesToSeedFile();
        return res.json({ success: true });
      } else {
        const index = localCategories.findIndex(c => c._id === catId);
        if (index === -1) return res.status(404).json({ error: 'Category not found' });
        localCategories.splice(index, 1);
        await syncCategoriesToSeedFile();
        return res.json({ success: true });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Blogs CRUD
  app.post('/api/admin/blogs', adminOnly, async (req, res): Promise<any> => {
    try {
      const payload = req.body;
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
        res.json(newBlog);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/admin/blogs/:id', adminOnly, async (req, res): Promise<any> => {
    try {
      const bId = req.params.id;
      const payload = req.body;
      
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
        const blog = await Blog.findByIdAndUpdate(bId, payload, { new: true });
        await syncBlogsToSeedFile();
        return res.json(blog);
      } else {
        const index = localBlogs.findIndex(b => b._id === bId);
        if (index === -1) return res.status(404).json({ error: 'Blog not found' });
        localBlogs[index] = {
          ...localBlogs[index],
          ...payload,
          updatedAt: new Date()
        };
        await syncBlogsToSeedFile();
        return res.json(localBlogs[index]);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/admin/blogs/:id', adminOnly, async (req, res): Promise<any> => {
    try {
      const bId = req.params.id;
      if (isMongoConnected) {
        await Blog.findByIdAndDelete(bId);
        await syncBlogsToSeedFile();
        return res.json({ success: true });
      } else {
        const index = localBlogs.findIndex(b => b._id === bId);
        if (index === -1) return res.status(404).json({ error: 'Blog not found' });
        localBlogs.splice(index, 1);
        await syncBlogsToSeedFile();
        return res.json({ success: true });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin Messages retrieval
  app.get('/api/admin/messages', adminOnly, async (req, res) => {
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
  app.post('/api/admin/messages/read/:id', adminOnly, async (req, res): Promise<any> => {
    try {
      const msgId = req.params.id;
      if (isMongoConnected) {
        const msg = await Message.findByIdAndUpdate(msgId, { read: true }, { new: true });
        if (!msg) return res.status(404).json({ error: 'Message not found' });
        await syncMessagesToSeedFile();
        return res.json(msg);
      } else {
        const msg = localMessages.find(m => m._id === msgId);
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
  app.get('/api/admin/users', adminOnly, async (req, res) => {
    try {
      if (isMongoConnected) {
        const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
        res.json(users);
      } else {
        // Return without password for security
        const sanitizedUsers = localUsers.map((u: any) => {
          const { password, ...sanitized } = u;
          return { ...sanitized, _id: u._id || u.id };
        });
        res.json(sanitizedUsers);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin promote/demote user
  app.put('/api/admin/users/:id/role', adminOnly, async (req, res): Promise<any> => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (role !== 'user' && role !== 'admin') {
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

      if (isMongoConnected) {
        targetUser.role = role;
        targetUser.updatedAt = new Date();
        await targetUser.save();
      } else {
        targetUser.role = role;
        targetUser.updatedAt = new Date();
        saveLocalUsers();
      }

      return res.json({
        success: true,
        message: `Administrative access of "${targetUser.email}" has been successfully updated to "${role}".`,
        user: { _id: targetUser._id || targetUser.id, email: targetUser.email, role }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sunday automated logs and simulation
  app.get('/api/admin/sunday-logs', adminOnly, async (req, res) => {
    try {
      if (isMongoConnected) {
        const mongoLogs = await SundayAutomationLog.find().sort({ runAt: -1 }).populate('productsAdded');
        const combined = [...localSundayAutomationLogs, ...mongoLogs].sort(
          (a, b) => new Date(b.runAt || b.createdAt).getTime() - new Date(a.runAt || a.createdAt).getTime()
        );
        res.json(combined);
      } else {
        res.json(localSundayAutomationLogs);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/sunday-logs/simulate', adminOnly, async (req, res) => {
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
      res.json({ success: true, log });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Diagnostics and Analytics compilation
  app.get('/api/admin/analytics', adminOnly, async (req, res) => {
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
 
        const seenKeys = new Set<string>();
        analytics.forEach(a => {
          let identifier = '';
          if (a.userId && typeof a.userId === 'object') {
            identifier = a.userId.email || a.userId._id || '';
          } else if (a.userId && typeof a.userId === 'string') {
            identifier = a.userId;
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
        
        let instaCount = socialClicks.instagram;
        let linkedinCount = socialClicks.linkedin;
        try {
          instaCount = await SocialClick.countDocuments({ platform: 'instagram' });
          linkedinCount = await SocialClick.countDocuments({ platform: 'linkedin' });
        } catch (err) {
          console.warn("Could not query SocialClick counts dynamically:", err);
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
          const item = localProducts.find(p => p._id === a.productId);
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
  app.post('/api/admin/analytics/conversions/:productId', adminOnly, async (req, res): Promise<any> => {
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
        const index = localProducts.findIndex(p => p._id === pId);
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

  // Google AdSense ads.txt crawler verification endpoint
  app.get('/ads.txt', (req, res) => {
    const publisherId = process.env.ADSENSE_CLIENT_ID || 'ca-pub-0000000000000000';
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
    app.use('/assets', (req, res) => {
      res.status(404).send('Asset not found');
    });
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    
    // Perform boot-up check for Sunday tasks and expired trending products
    console.log("Initializing boot-up checks for automated Sunday products and trending items...");
    runSundayAutomation().catch(err => console.error("Startup Sunday automation check error:", err));
    cleanExpiredTrendingProducts().catch(err => console.error("Startup trending expiration check error:", err));

    // Schedule background check every 12 hours
    setInterval(() => {
      console.log("Running scheduled periodic background sync...");
      runSundayAutomation().catch(err => console.error("Scheduled Sunday automation error:", err));
      cleanExpiredTrendingProducts().catch(err => console.error("Scheduled trending expiration error:", err));
    }, 12 * 60 * 60 * 1000);
  });
}

startServer();
