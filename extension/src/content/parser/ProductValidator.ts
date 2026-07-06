import { ProductPayload } from '../../types';

export class ProductValidator {
  public static validate(data: Partial<ProductPayload>): { errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.name && !(data as any).title) errors.push('Product title is missing');
    if (!data.asin || data.asin.length !== 10) errors.push(`Invalid or missing ASIN: ${data.asin}`);
    if (!data.productUrl) errors.push('Product URL is missing');
    
    if (!data.images || data.images.length === 0) {
      warnings.push('No product images found (optional)');
      data.images = []; // Graceful degradation
    }
    
    if (data.currentPrice === undefined || data.currentPrice <= 0) {
      warnings.push('Current price is 0 or missing (might be out of stock)');
      data.currentPrice = 0;
    }

    if (!data.brand || data.brand === 'Unknown Brand') {
      warnings.push('Brand could not be extracted accurately');
      data.brand = 'Unknown Brand';
    }

    if (!data.description && (!data.bulletFeatures || data.bulletFeatures.length === 0)) {
      warnings.push('No product description or features found');
      data.description = '';
      data.bulletFeatures = [];
    }

    return { errors, warnings };
  }
}
