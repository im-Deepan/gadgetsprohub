const fs = require('fs');
let code = fs.readFileSync('src/utils/productUtils.ts', 'utf-8');

code += `
/**
 * Resolves the correct currency symbol and time zone based on the affiliate link, marketplace, or seller.
 */
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
  let currency = "$";
  let tz = "UTC";
  
  if (isAmazonIn) {
    label = "Amazon.in Price";
    currency = "₹";
    tz = "IST";
  } else if (isAmazonUk) {
    label = "Amazon.co.uk Price";
    currency = "£";
    tz = "GMT";
  } else if (isAmazonUae) {
    label = "Amazon.ae Price";
    currency = "AED ";
    tz = "GST";
  } else if (isAmazonUs) {
    label = "Amazon.com Price";
    currency = "$";
    tz = "EST";
  } else {
    label = "Amazon Price";
    currency = "$";
    tz = "UTC";
  }
  
  return { label, currency, tz, isAmazonIn, isAmazonUk, isAmazonUae, isAmazonUs };
};

/**
 * Returns the currency symbol for the product based on marketplace, or defaults to ₹.
 */
export const getCurrencySymbol = (product: { affiliateLink?: string, marketplace?: string, seller?: string }): string => {
  const details = getAmazonDetails(product);
  if (details) return details.currency;
  
  const marketplace = (product.marketplace || '').toLowerCase();
  if (marketplace.includes('uk')) return '£';
  if (marketplace.includes('uae') || marketplace.includes('ae')) return 'AED ';
  if (marketplace.includes('us') || marketplace.includes('com')) return '$';
  
  return '₹';
};

/**
 * Formats a price with the correct currency symbol based on the product.
 */
export const formatProductPrice = (price: number | undefined | null, product: { affiliateLink?: string, marketplace?: string, seller?: string }): string => {
  if (price === undefined || price === null || isNaN(price) || price < 0) {
    const symbol = getCurrencySymbol(product);
    return symbol + '0';
  }
  const symbol = getCurrencySymbol(product);
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(price);
  return symbol + formattedNumber;
};
`;

fs.writeFileSync('src/utils/productUtils.ts', code);
console.log('Updated productUtils.ts with currency helpers');
