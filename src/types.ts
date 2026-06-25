export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  subcategories?: string[];
  createdAt?: string;
}

export interface Review {
  _id?: string;
  userId: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  rating: number;
  title: string;
  content: string;
  helpful?: number;
  createdAt?: string;
}

export interface Product {
  _id: string;
  id?: string; // Optional alias for view compatibility
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  category: string | Category; // Category ID or fully populated Category
  subcategory?: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  videoUrl?: string;
  specifications?: Record<string, string>;
  features?: string[];
  rating: number;
  totalReviews: number;
  affiliateLink: string;
  affiliateCode?: string;
  inStock: boolean;
  sku?: string;
  tags?: string[];
  trending?: boolean;
  featured?: boolean;
  clicks: number;
  conversions: number;
  pros?: string[];
  cons?: string[];
  reviews?: Review[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  createdAt?: string;
}

export interface Blog {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  imageUrl?: string; // Optional alias for view compatibility
  author?: string;
  category?: string;
  tags?: string[];
  views: number;
  published: boolean;
  createdAt?: string;
  date?: string; // Optional alias for view compatibility
}

export interface User {
  id: string;
  _id?: string; // MongoDB or database compatibility key alias
  email: string;
  name: string;
  role: 'user' | 'admin';
  profileImage?: string;
  wishlist?: string[];
  district?: string; // Users pre-preferred or auto-detected geographical district/city
  isVerified?: boolean;
  pendingEmail?: string;
}

export interface Message {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  /**
   * Indicates whether the contact message has been read by an administrator.
   * Defaults to false on initial message ingestion.
   */
  read: boolean;
  createdAt: string;
}

export interface AnalyticsSummary {
  clicks: number;
  conversions: number;
  views: number;
}
