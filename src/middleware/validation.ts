import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

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
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .trim(),
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
    .trim(),
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
    .escape()
    .isLength({ max: 128 })
    .withMessage('District must be under 128 characters'),
  handleValidationErrors
];

/**
 * Helper schema to validate product inputs (used for post and put).
 * This checks core types to avoid NoSQL injection on product creation/modification.
 */
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
    .escape(),
  body('price')
    .isNumeric()
    .withMessage('Price is required and must be a number')
    .toFloat(),
  body('originalPrice')
    .optional()
    .isNumeric()
    .withMessage('Original price must be a number')
    .toFloat(),
  body('affiliateLink')
    .isString()
    .withMessage('Affiliate link is required and must be a string')
    .trim(),
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
