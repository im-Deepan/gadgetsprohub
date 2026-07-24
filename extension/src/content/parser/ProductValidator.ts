import { ProductPayload } from '../../types';
import { DataNormalizer } from './DataNormalizer';

export class ProductValidator {
  public static validate(data: Partial<ProductPayload>): { errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Title / Name validation
    const rawName = data.name || (data as any).title;
    if (!rawName) {
      errors.push('Product title is missing');
    } else {
      const cleanName = DataNormalizer.cleanText(rawName).slice(0, 500);
      data.name = cleanName;
      (data as any).title = cleanName;
    }

    // 2. ASIN validation
    if (!data.asin) {
      errors.push('ASIN is missing');
    } else {
      const cleanAsin = data.asin.trim().toUpperCase();
      if (!/^[A-Z0-9]{8,15}$/.test(cleanAsin)) {
        errors.push(`Invalid ASIN format: "${data.asin}"`);
      } else {
        data.asin = cleanAsin;
      }
    }

    // 3. Product URL validation
    if (!data.productUrl) {
      errors.push('Product URL is missing');
    } else if (!data.productUrl.startsWith('http://') && !data.productUrl.startsWith('https://')) {
      errors.push('Product URL must be a valid http or https link');
    }

    // 4. Current Price validation & normalization against schema
    if (typeof data.currentPrice !== 'number' || isNaN(data.currentPrice) || data.currentPrice < 0) {
      data.currentPrice = 0;
      warnings.push('Current price is missing or invalid (set to 0)');
    } else {
      data.currentPrice = Math.round(data.currentPrice * 100) / 100;
    }

    // 5. Original Price validation
    if (typeof data.originalPrice !== 'number' || isNaN(data.originalPrice) || data.originalPrice < 0) {
      data.originalPrice = data.currentPrice;
    } else {
      data.originalPrice = Math.round(data.originalPrice * 100) / 100;
    }

    // Ensure original price is at least equal to current price
    if (data.originalPrice < data.currentPrice) {
      data.originalPrice = data.currentPrice;
    }

    // Recalculate discount
    if (data.originalPrice > data.currentPrice && data.currentPrice > 0) {
      data.discount = Math.min(100, Math.max(0, Math.round(((data.originalPrice - data.currentPrice) / data.originalPrice) * 100)));
    } else {
      data.discount = 0;
    }

    data.price = data.currentPrice;

    // 6. Brand validation
    if (!data.brand || data.brand === 'Unknown Brand') {
      warnings.push('Brand could not be extracted accurately');
      data.brand = 'Unknown Brand';
    } else {
      data.brand = DataNormalizer.cleanText(data.brand);
    }

    // 7. Images validation
    if (!Array.isArray(data.images) || data.images.length === 0) {
      warnings.push('No product images found (optional)');
      data.images = [];
    } else {
      data.images = data.images
        .filter(img => typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://')))
        .slice(0, 10);
    }

    // 8. Bullet features validation
    if (!Array.isArray(data.bulletFeatures)) {
      data.bulletFeatures = [];
    } else {
      data.bulletFeatures = DataNormalizer.cleanArray(data.bulletFeatures).slice(0, 20);
    }

    // 9. Description validation
    if (!data.description) {
      data.description = '';
    } else {
      data.description = DataNormalizer.cleanText(data.description);
    }

    // 10. Specifications validation
    data.specifications = DataNormalizer.cleanSpecifications(data.specifications);

    // 11. Currency validation
    if (!data.currency || !/^[A-Z]{3}$/.test(data.currency)) {
      data.currency = 'USD';
    }

    // 12. Rating & ReviewCount validation
    data.rating = typeof data.rating === 'number' && !isNaN(data.rating) ? Math.min(5, Math.max(0, Math.round(data.rating * 10) / 10)) : 0;
    data.reviewCount = typeof data.reviewCount === 'number' && !isNaN(data.reviewCount) ? Math.max(0, Math.round(data.reviewCount)) : 0;

    return { errors, warnings };
  }
}
