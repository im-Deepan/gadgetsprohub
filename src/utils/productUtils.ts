/**
 * Utility functions for formatting prices, product titles, ratings, and discounts cleanly.
 */

/**
 * Truncates title cleanly at a word boundary up to maxLen, without breaking mid-word.
 */
export const truncateAtWord = (text: string, maxLen = 60): string => {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;

  const sub = trimmed.substring(0, maxLen);
  const lastSpace = sub.lastIndexOf(' ');
  if (lastSpace > 10) {
    return sub.substring(0, lastSpace).replace(/[,;:\-\s]+$/, '') + '...';
  }
  return sub.replace(/[,;:\-\s]+$/, '') + '...';
};

/**
 * Normalizes scraped/long product titles into short, clean card headings (Max 60 chars).
 * Example: "Apple iPhone 15 Pro Max (256 GB) - Natural Titanium, Dynamic Island, A17 Pro" -> "Apple iPhone 15 Pro Max (256 GB)"
 */
export const getShortProductTitle = (fullName: string, brand?: string, maxLen = 60): string => {
  if (!fullName) return 'Product Item';
  let clean = fullName.trim();

  // If title looks like a kebab-case slug (contains hyphens and no spaces), convert to title case
  if (clean.includes('-') && !clean.includes(' ')) {
    clean = clean
      .split('-')
      .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '')
      .filter(Boolean)
      .join(' ');
  }

  // Strip extraneous promotional filler suffixes after common separators
  clean = clean.split(' - ')[0];
  if (clean.length > maxLen) {
    clean = clean.split(' | ')[0];
  }
  if (clean.length > maxLen) {
    clean = clean.split(' (')[0] + (clean.includes('(') ? '' : '');
  }

  // Ensure title includes brand if brand is missing in title
  if (brand && brand.trim() && brand.toLowerCase() !== 'unknown brand' && brand.toLowerCase() !== 'premium') {
    const brandLower = brand.toLowerCase().trim();
    if (!clean.toLowerCase().includes(brandLower)) {
      clean = `${brand.trim()} ${clean}`;
    }
  }

  return truncateAtWord(clean, maxLen);
};

/**
 * Formats price cleanly in Indian Rupees (INR) using standard Intl.NumberFormat.
 * Example: 14999 -> "₹14,999"
 */
export const formatINR = (price: number | undefined | null): string => {
  if (price === undefined || price === null || isNaN(price) || price < 0) {
    return '₹0';
  }
  // Convert legacy USD values (<1000) to INR if needed
  const numericINR = price < 1000 ? Math.round(price * 83) : Math.round(price);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(numericINR);

  return `₹${formatted}`;
};

export const formatINRPrice = formatINR;

/**
 * Normalizes product titles or raw text/slugs:
 * - Strips everything after the first comma or pipe
 * - Converts kebab-case/slugs (e.g. "bata-slip-on-forma-shoes") into Title Case ("Bata Slip On Forma Shoes")
 * - Caps length at 60 characters
 */
export const displayTitle = (rawTitle: string, brand?: string, maxLen = 60): string => {
  if (!rawTitle) return 'Product Item';
  let clean = rawTitle.trim();

  // If it's a slug style string (has hyphens and no spaces), title-case it
  if (clean.includes('-') && !clean.includes(' ')) {
    clean = clean
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // Strip everything after first comma or pipe
  clean = clean.split(',')[0].split('|')[0].split(' - ')[0].trim();

  // Ensure brand if appropriate
  if (brand && brand.trim() && !['unknown brand', 'premium', 'generic'].includes(brand.toLowerCase().trim())) {
    const bLower = brand.toLowerCase().trim();
    if (!clean.toLowerCase().includes(bLower)) {
      clean = `${brand.trim()} ${clean}`;
    }
  }

  return truncateAtWord(clean, maxLen);
};

/**
 * Formats rating gracefully:
 * - If rating exists (>0), returns { hasRating: true, text: '★ 4.5' }
 * - If rating <= 0 or empty, returns { hasRating: false, text: 'No reviews yet' }
 */
export const formatRating = (rating: number | undefined | null, reviewCount?: number) => {
  const countVal = reviewCount ?? 0;
  if (rating && rating > 0) {
    return {
      hasRating: true,
      text: `★ ${rating.toFixed(1)}`,
      numericRating: rating,
      count: countVal
    };
  }
  return {
    hasRating: false,
    text: 'No reviews yet',
    numericRating: 0,
    count: countVal
  };
};

/**
 * Checks whether a discount is real and positive (price < originalPrice).
 */
export const hasValidDiscount = (price?: number, originalPrice?: number, _legacyDiscount?: number): boolean => {
  if (price === undefined || price === null || originalPrice === undefined || originalPrice === null) return false;
  if (price <= 0 || originalPrice <= 0) return false;
  return price < originalPrice;
};

/**
 * Dynamically computes discount percentage from (price, originalPrice).
 * If price > originalPrice, logs a data warning and returns 0.
 * If price >= originalPrice, returns 0.
 */
export const calculateDiscountPercent = (price?: number, originalPrice?: number, productTitle?: string): number => {
  if (price === undefined || price === null || originalPrice === undefined || originalPrice === null) return 0;
  if (price <= 0 || originalPrice <= 0) return 0;

  if (price > originalPrice) {
    console.warn(`[Data Warning] Product "${productTitle || 'Unknown'}" has sale price (₹${price}) > MRP (₹${originalPrice})`);
    return 0;
  }

  if (price >= originalPrice) {
    return 0;
  }

  return Math.round(((originalPrice - price) / originalPrice) * 100);
};

/**
 * Validates and sanitizes a product's pricing and discount data.
 * If sale price >= MRP, suppresses strikethrough and discount badge completely,
 * and logs a data warning if price > originalPrice.
 */
export const getValidatedPricing = (product: { price?: number; originalPrice?: number; discount?: number; name?: string }) => {
  const price = product?.price ?? 0;
  let originalPrice = product?.originalPrice;
  
  if (!originalPrice || originalPrice <= price) {
    if (originalPrice && price > originalPrice) {
      console.warn(`[Data Warning] Product "${product?.name || 'Unknown'}" has sale price (₹${price}) > MRP (₹${originalPrice}). Suppressing discount badge.`);
    }
    return {
      price,
      originalPrice: undefined,
      isDiscounted: false,
      discount: 0
    };
  }

  const computedDiscount = calculateDiscountPercent(price, originalPrice, product?.name);

  return {
    price,
    originalPrice,
    isDiscounted: computedDiscount > 0,
    discount: computedDiscount
  };
};

/**
 * Normalizes a product object by validating pricing, discount, title, and rating.
 */
export const sanitizeProductData = <T extends Record<string, any>>(product: T): T => {
  if (!product) return product;

  const pricing = getValidatedPricing(product);

  return {
    ...product,
    price: pricing.price,
    originalPrice: pricing.originalPrice,
    discount: pricing.discount,
    isDiscounted: pricing.isDiscounted
  };
};

export const getAmazonDetails = (product: { affiliateLink?: string, marketplace?: string, seller?: string }) => {
  const link = (product.affiliateLink || '').toLowerCase();
  const marketplace = (product.marketplace || '').toLowerCase();
  const seller = (product.seller || '').toLowerCase();
  
  const isAmazonIn = link.includes('amazon.in') || marketplace.includes('amazon india') || marketplace.includes('amazon_in') || seller.includes('amazon india') || seller.includes('amazon_in');
  const isAmazonUk = link.includes('amazon.co.uk') || marketplace.includes('amazon uk') || marketplace.includes('amazon_uk') || seller.includes('amazon uk') || seller.includes('amazon_uk');
  const isAmazonUae = link.includes('amazon.ae') || marketplace.includes('amazon uae') || marketplace.includes('amazon_uae') || seller.includes('amazon uae') || seller.includes('amazon_uae');
  const isAmazonUs = link.includes('amazon.com') || link.includes('amzn.to') || marketplace.includes('amazon us') || marketplace.includes('amazon_us') || seller.includes('amazon us') || seller.includes('amazon_us') || marketplace.includes('amazon.com') || seller.includes('amazon.com');
  
  const isAmazon = isAmazonIn || isAmazonUk || isAmazonUae || isAmazonUs || link.includes('amazon') || link.includes('amzn') || marketplace.includes('amazon') || seller.includes('amazon');
  
  if (!isAmazon) return null;
  
  let label = "Amazon Price";
  let currency = "₹";
  let tz = "UTC";
  
  if (isAmazonIn) {
    label = "Amazon.in Price";
    currency = "₹";
    tz = "IST";
  } else if (isAmazonUk) {
    label = "Amazon.co.uk Price";
    currency = "₹";
    tz = "GMT";
  } else if (isAmazonUae) {
    label = "Amazon.ae Price";
    currency = "₹";
    tz = "GST";
  } else {
    label = "Amazon Price";
    currency = "₹";
    tz = "UTC";
  }
  
  return { label, currency, tz, isAmazonIn, isAmazonUk, isAmazonUae, isAmazonUs };
};

/**
 * Returns the currency symbol for the product based on explicit currency/currencyCode, or marketplace/affiliate link, or defaults to ₹.
 */
export const getCurrencySymbol = (_product?: { affiliateLink?: string, marketplace?: string, seller?: string, currency?: string, currencyCode?: string }): string => {
  return '₹';
};

/**
 * Formats a price consistently in Indian Rupee (INR) format across the entire site.
 */
export const formatProductPrice = (price: number | undefined | null, _product?: { affiliateLink?: string, marketplace?: string, seller?: string, currency?: string, currencyCode?: string }): string => {
  return formatINR(price);
};
