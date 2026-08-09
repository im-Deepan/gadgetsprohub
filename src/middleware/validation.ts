import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { TAMIL_NADU_DISTRICTS } from '../utils/districts';
import { sanitizeDistrict } from '../server/utils';

/**
 * Middleware to handle express-validator validation results.
 * Formats errors to match the frontend expected format { error: string }
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    const fieldMsg = firstError.type === 'field' ? ` for field '${firstError.path}'` : '';
    res.status(400).json({ error: `${firstError.msg}${fieldMsg}` });
    return;
  }
  next();
};

/**
 * Validation rules for user registration.
 */
export const validateRegister = [
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({ error: 'Invalid request body format' });
      return;
    }
    if ('__proto__' in req.body || 'constructor' in req.body || 'prototype' in req.body) {
      res.status(400).json({ error: 'Potential prototype pollution attempt detected' });
      return;
    }
    next();
  },
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim()
    .isLength({ max: 128 })
    .withMessage('Email address must be under 128 characters'),
  body('password')
    .isString()
    .withMessage('Password must be a string')
    .trim()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string')
    .trim()
    .escape()
    .isLength({ max: 128 })
    .withMessage('Name must be under 128 characters'),
  handleValidationErrors
];

/**
 * Validation rules for user login.
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim()
    .isLength({ max: 128 })
    .withMessage('Email address must be under 128 characters'),
  body('password')
    .isString()
    .withMessage('Password must be a string')
    .trim()
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Validation rules for Google Authentication.
 */
export const validateGoogleAuth = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim()
    .isLength({ max: 128 })
    .withMessage('Email address must be under 128 characters'),
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string')
    .trim()
    .escape()
    .isLength({ max: 128 })
    .withMessage('Name must be under 128 characters'),
  body('googleId')
    .optional()
    .isString()
    .withMessage('Google ID must be a string')
    .trim(),
  body('idToken')
    .optional()
    .isString()
    .withMessage('ID Token must be a string')
    .trim(),
  body('profileImage')
    .optional()
    .isString()
    .withMessage('Profile image must be a string url')
    .trim(),
  handleValidationErrors
];

/**
 * Validation rules for recording a product click.
 */
export const validateProductClick = [
  param('slug')
    .isString()
    .withMessage('Product slug must be a valid string')
    .trim(),
  body('district')
    .optional()
    .isString()
    .withMessage('District must be a string')
    .trim()
    .escape(),
  body('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string')
    .trim(),
  handleValidationErrors
];

/**
 * Validation rules for creating a product review.
 */
export const validateProductReview = [
  param('id')
    .isString()
    .withMessage('Product identifier must be a valid string')
    .trim(),
  body('rating')
    .exists()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5')
    .toInt(),
  body('title')
    .isString()
    .withMessage('Title must be a string')
    .trim()
    .escape()
    .isLength({ min: 1, max: 128 })
    .withMessage('Title must be between 1 and 128 characters'),
  body('content')
    .isString()
    .withMessage('Content must be a string')
    .trim()
    .escape()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Content must be between 1 and 2000 characters'),
  handleValidationErrors
];

/**
 * Validation rules for wishlist operations.
 */
export const validateWishlist = [
  param('productId')
    .isString()
    .withMessage('Product identifier must be a valid string')
    .trim(),
  handleValidationErrors
];

/**
 * Validation rules for orders.
 */
export const validateOrderCreation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.product')
    .isString()
    .withMessage('Product ID in items must be a string')
    .trim(),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity in items must be an integer greater than 0')
    .toInt(),
  body('totalAmount')
    .isNumeric()
    .withMessage('Total amount must be a number'),
  handleValidationErrors
];

/**
 * Validation rules for advancing orders.
 */
export const validateOrderAdvance = [
  param('orderId')
    .isString()
    .withMessage('Order identifier must be a valid string')
    .trim(),
  handleValidationErrors
];

/**
 * Validation rules for visitor registration.
 */
export const validateVisitorRegister = [
  body('visitorId')
    .isString()
    .withMessage('visitorId must be a valid string')
    .trim()
    .isLength({ min: 1 }),
  handleValidationErrors
];

/**
 * Validation rules for the contact message route.
 */
export const validateContactMessage = [
  body('name')
    .isString()
    .withMessage('Name must be a string')
    .trim()
    .escape()
    .isLength({ min: 1, max: 128 })
    .withMessage('Name must be between 1 and 128 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim()
    .isLength({ max: 128 })
    .withMessage('Email address must be under 128 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Phone number must be a string')
    .trim()
    .escape()
    .isLength({ max: 32 })
    .withMessage('Phone number must be under 32 characters'),
  body('subject')
    .isString()
    .withMessage('Subject must be a string')
    .trim()
    .escape()
    .isLength({ min: 1, max: 256 })
    .withMessage('Subject must be between 1 and 256 characters'),
  body('message')
    .isString()
    .withMessage('Message must be a string')
    .trim()
    .escape()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters'),
  handleValidationErrors
];

/**
 * Validation rules for newsletter subscription.
 */
export const validateNewsletterSubscribe = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .trim()
    .isLength({ max: 128 })
    .withMessage('Email address must be under 128 characters'),
  handleValidationErrors
];

/**
 * Validation rules for social click tracking.
 */
export const validateSocialClick = [
  body('platform')
    .isString()
    .withMessage('Platform must be a string')
    .trim()
    .escape()
    .isLength({ min: 1, max: 128 })
    .withMessage('Platform name must be under 128 characters'),
  handleValidationErrors
];

/**
 * Validation rules for recording filter analytics.
 */
export const validateFilterAnalytics = [
  body('searchQuery')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Search query must be a string')
    .trim()
    .escape()
    .isLength({ max: 256 })
    .withMessage('Search query must be under 256 characters'),
  body('categoryId')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Category ID must be a string')
    .trim(),
  body('categorySlug')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Category slug must be a string')
    .trim(),
  handleValidationErrors
];

/**
 * Validation rules for recording page views.
 */
export const validatePageViewAnalytics = [
  body('pageUrl')
    .isString()
    .withMessage('Page URL must be a string')
    .trim(),
  body('timeSpent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Time spent must be a non-negative integer')
    .toInt(),
  handleValidationErrors
];

/**
 * Validation rules for updating user profile.
 */
export const validateUserProfileUpdate = [
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string')
    .trim()
    .escape()
    .isLength({ max: 128 })
    .withMessage('Name must be under 128 characters'),
  body('district')
    .optional()
    .isString()
    .withMessage('District must be a string')
    .trim()
    .isLength({ max: 128 })
    .withMessage('District must be under 128 characters')
    .customSanitizer((value) => sanitizeDistrict(value))
    .custom((value) => {
      if (!value) return true;
      if (value === 'Unknown') return true;
      const isValid = TAMIL_NADU_DISTRICTS.some(d => d.toLowerCase() === value.toLowerCase());
      if (!isValid) {
        throw new Error('District must be a valid Tamil Nadu district');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Helper schema to validate product inputs (used for post and put).
 * This checks core types to avoid NoSQL injection on product creation/modification.
 */

// Helper function to validate allowed domains globally
const isValidAmazonOrAllowedDomain = (urlStr: string): boolean => {
  if (!urlStr) return true;
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();
    const allowedPatterns = [
      /amazon\.[a-z\.]+$/, // Matches amazon.com, amazon.in, etc.
      /amzn\.to$/,          // Amazon shortlinks
      /flipkart\.com$/,     // Flipkart
      /myntra\.com$/,       // Myntra
      /croma\.com$/,        // Croma
      /reliance\.?digital\.in$/, // Reliance Digital
      /nykaa\.com$/,        // Nykaa
      /tatacliq\.com$/,     // Tata Cliq
      /ajio\.com$/,         // Ajio
      /apple\.com$/,        // Apple
      /samsung\.com$/,      // Samsung
      /sony\.com$/,         // Sony
      /nike\.com$/,         // Nike
      /adidas\.com$/,       // Adidas
      /puma\.com$/,         // Puma
      /myntra\.in$/,
      /boat-lifestyle\.com$/,
      /oneplus\.in$/,
      /lenovo\.com$/,
      /dell\.com$/,
      /hp\.com$/,
      /asus\.com$/,
      /mi\.com$/,
      /realme\.com$/,
      /vivo\.com$/,
      /oppo\.com$/,
      /noise\.com$/,
      /fireboltt\.com$/,
      /pebblecart\.com$/,
      /nothing\.tech$/,
      /unsplash\.com$/,
      /images\.unsplash\.com$/,
      /youtube\.com$/,
      /youtu\.be$/,
      /vimeo\.com$/,
      /gadgetsprohub\.com$/, // Self
      /^localhost$/
    ];
    return allowedPatterns.some(pattern => pattern.test(hostname));
  } catch (e) {
    return false; // Invalid URL structure is rejected
  }
};

export const validateAdminProduct = [
  body('name')
    .isString()
    .withMessage('Product name is required and must be a string')
    .trim()
    .escape()
    .isLength({ min: 1, max: 256 }),
  body('brand')
    .optional()
    .isString()
    .withMessage('Brand must be a string')
    .trim()
    .escape()
    .isLength({ max: 128 })
    .withMessage('Brand must be under 128 characters'),
  body('price')
    .isNumeric()
    .withMessage('Price is required and must be a number')
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Price must be a non-negative number under 1,000,000')
    .toFloat(),
  body('originalPrice')
    .optional()
    .isNumeric()
    .withMessage('Original price must be a number')
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Original price must be a non-negative number under 1,000,000')
    .toFloat(),
  body('discount')
    .optional()
    .isNumeric()
    .withMessage('Discount must be a number')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be a percentage between 0 and 100')
    .toFloat(),
  body('rating')
    .optional()
    .isNumeric()
    .withMessage('Rating must be a number')
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5')
    .toFloat(),
  body('affiliateLink')
    .isString()
    .withMessage('Affiliate link is required and must be a string')
    .trim()
    .isLength({ max: 2048 })
    .withMessage('Affiliate link must be under 2048 characters')
    .custom((val: string) => {
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        throw new Error('Affiliate link must be a valid URL starting with http:// or https://');
      }
      if (val.includes('B501...') || val.includes('example.com') || val.toLowerCase().includes('placeholder')) {
        throw new Error('Placeholder sample affiliate URLs are not allowed. Please enter a real product link.');
      }
      if (!isValidAmazonOrAllowedDomain(val)) {
        throw new Error('Affiliate link must be from an allowed domain (e.g. Amazon, Flipkart, etc.).');
      }
      return true;
    }),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be under 5000 characters'),
  body('longDescription')
    .optional()
    .isString()
    .withMessage('Long description must be a string')
    .trim()
    .isLength({ max: 20000 })
    .withMessage('Long description must be under 20000 characters'),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string')
    .trim()
    .isLength({ max: 128 })
    .withMessage('Category must be under 128 characters'),
  body('subcategory')
    .optional()
    .isString()
    .withMessage('Subcategory must be a string')
    .trim()
    .isLength({ max: 128 })
    .withMessage('Subcategory must be under 128 characters'),
  body('videoUrl')
    .optional()
    .isString()
    .withMessage('Video URL must be a string')
    .trim()
    .isLength({ max: 1024 })
    .withMessage('Video URL must be under 1024 characters')
    .custom((val: string) => {
      if (val && !isValidAmazonOrAllowedDomain(val)) {
        throw new Error('Video URL must be from an allowed domain.');
      }
      return true;
    }),
  body('affiliateCode')
    .optional()
    .isString()
    .withMessage('Affiliate code must be a string')
    .trim()
    .isLength({ max: 128 })
    .withMessage('Affiliate code must be under 128 characters')
    .custom((val: string) => {
      if (val === 'AFFIL_HUB_26') {
        throw new Error('Placeholder affiliate code AFFIL_HUB_26 is not allowed. Please enter a custom affiliate code.');
      }
      return true;
    }),
  body('sku')
    .optional()
    .isString()
    .withMessage('SKU must be a string')
    .trim()
    .isLength({ max: 128 })
    .withMessage('SKU must be under 128 characters'),
  body('seoTitle')
    .optional()
    .isString()
    .withMessage('SEO Title must be a string')
    .trim()
    .isLength({ max: 256 })
    .withMessage('SEO Title must be under 256 characters'),
  body('seoDescription')
    .optional()
    .isString()
    .withMessage('SEO Description must be a string')
    .trim()
    .isLength({ max: 512 })
    .withMessage('SEO Description must be under 512 characters'),
  body('seoKeywords')
    .optional()
    .isString()
    .withMessage('SEO Keywords must be a string')
    .trim()
    .isLength({ max: 512 })
    .withMessage('SEO Keywords must be under 512 characters'),
  body('badge')
    .optional()
    .isString()
    .withMessage('Badge must be a string')
    .trim()
    .isLength({ max: 128 })
    .withMessage('Badge must be under 128 characters'),
  body('buyNowText')
    .optional()
    .isString()
    .withMessage('Buy Now Text must be a string')
    .trim()
    .isLength({ max: 128 })
    .withMessage('Buy Now Text must be under 128 characters'),
  body('affiliatePlatform')
    .optional()
    .isString()
    .withMessage('Affiliate Platform must be a string')
    .trim()
    .isLength({ max: 128 })
    .withMessage('Affiliate Platform must be under 128 characters'),
  body('buttonText')
    .optional()
    .isString()
    .withMessage('Button Text must be a string')
    .trim()
    .isLength({ max: 128 })
    .withMessage('Button Text must be under 128 characters'),
  body('buttonColor')
    .optional()
    .isString()
    .withMessage('Button Color must be a string')
    .trim()
    .isLength({ max: 32 })
    .withMessage('Button Color must be under 32 characters'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*')
    .isString()
    .withMessage('Each image must be a valid string URL')
    .trim()
    .isLength({ min: 1, max: 2048 })
    .withMessage('Each image URL must be between 1 and 2048 characters')
    .custom((val: string) => {
      if (val && !isValidAmazonOrAllowedDomain(val)) {
        throw new Error('Image URL must be from an allowed domain.');
      }
      return true;
    }),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .isString()
    .withMessage('Each tag must be a string')
    .trim()
    .isLength({ min: 1, max: 128 })
    .withMessage('Each tag must be between 1 and 128 characters'),
  body('comparisonProducts')
    .optional()
    .isArray()
    .withMessage('Comparison products must be an array'),
  body('comparisonProducts.*')
    .isString()
    .withMessage('Each comparison product must be a string ID')
    .trim()
    .isLength({ min: 1, max: 128 })
    .withMessage('Each comparison product ID must be between 1 and 128 characters'),
  body(['inStock', 'trending', 'featured'])
    .optional()
    .isBoolean(),
  handleValidationErrors
];

/**
 * Validation schema for admin category.
 */
export const validateAdminCategory = [
  body('name')
    .isString()
    .withMessage('Category name is required and must be a string')
    .trim()
    .escape()
    .isLength({ min: 1, max: 128 }),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .escape(),
  handleValidationErrors
];

/**
 * Validation schema for admin blogs.
 */
export const validateAdminBlog = [
  body('title')
    .isString()
    .withMessage('Blog title is required and must be a string')
    .trim()
    .escape()
    .isLength({ min: 1, max: 256 }),
  body('content')
    .isString()
    .withMessage('Blog content is required and must be a string')
    .trim(),
  body('excerpt')
    .optional()
    .isString()
    .withMessage('Blog excerpt must be a string')
    .trim()
    .escape()
    .isLength({ max: 500 }),
  handleValidationErrors
];
