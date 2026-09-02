import mongoose from 'mongoose';
import { Category, Product, Blog, User, Analytics, Visitor } from '../models';
import {
  setIsMongoConnected,
  localCategories,
  localProducts,
  localBlogs,
  localUsers
} from '../storage';
import { hashHelper } from '../utils';
import { aiService } from '../../services/AiService';

export async function seedDatabase() {
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

export const connectWithRetry = async (maxRetries = 5, initialDelay = 2000): Promise<void> => {
  let currentDelay = initialDelay;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(
        process.env.MONGODB_URI || 'mongodb://localhost:27017/affiliate-store',
        { serverSelectionTimeoutMS: 15000 }
      );
      console.log('Successfully connected to MongoDB Cluster');
      setIsMongoConnected(true);

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

      return;
    } catch (err: any) {
      console.warn(`[DB Connection Attempt ${attempt}/${maxRetries}] Failed to connect to MongoDB: ${err.message || err}`);
      if (attempt < maxRetries) {
        console.log(`Retrying MongoDB connection in ${currentDelay / 1000}s...`);
        await new Promise(res => setTimeout(res, currentDelay));
        currentDelay *= 1.5;
      } else {
        console.warn('[Database] MongoDB Atlas connection not established after retries. Operating with resilient local fallback data store (in-memory & atomic JSON). Notice:', err.message);
        setIsMongoConnected(false);
      }
    }
  }
};
