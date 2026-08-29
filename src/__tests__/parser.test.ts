import { z } from 'zod';

/**
 * Product Data Normalizer & Parser Validation Tests
 */

// Normalized schemas and logic matching backend requirements
const ScrapedProductSchema = z.object({
  asin: z.string().regex(/^[A-Z0-9]{10}$/, 'Invalid ASIN format'),
  title: z.string().min(3, 'Title is too short'),
  brand: z.string().optional(),
  currentPrice: z.number().positive('Price must be greater than 0'),
  originalPrice: z.number().optional(),
  currency: z.string().default('USD'),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().min(0).default(0),
  availability: z.boolean().default(true),
  images: z.array(z.string().url()).min(1, 'At least one valid image is required'),
  features: z.array(z.string()).default([]),
  specifications: z.record(z.string(), z.string()).default({})
});

export function normalizePrice(rawPrice: string | number): number {
  if (typeof rawPrice === 'number') return isNaN(rawPrice) ? 0 : rawPrice;
  if (!rawPrice) return 0;
  
  // Clean currency symbols, commas, and whitespace
  const cleaned = rawPrice.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function extractAsinFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:dp|gp\/product|exec\/obidos\/ASIN|d)\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
}

export function parseRating(rawRating: string): number {
  if (!rawRating) return 0;
  const match = rawRating.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:out of 5|\/5|stars)?/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  return isNaN(val) ? 0 : Math.min(5, Math.max(0, val));
}

describe('Product Parser & Normalizer Unit Tests', () => {
  describe('Price Normalization', () => {
    it('parses standard USD dollar strings', () => {
      expect(normalizePrice('$299.99')).toBe(299.99);
      expect(normalizePrice('$1,249.50')).toBe(1249.5);
      expect(normalizePrice('$0.99')).toBe(0.99);
    });

    it('parses formatted international currency strings', () => {
      expect(normalizePrice('₹45,999.00')).toBe(45999.00);
      expect(normalizePrice('£89.95')).toBe(89.95);
      expect(normalizePrice('€149.00')).toBe(149.00);
    });

    it('handles numeric and edge case inputs cleanly', () => {
      expect(normalizePrice(199.99)).toBe(199.99);
      expect(normalizePrice('')).toBe(0);
      expect(normalizePrice('Currently unavailable')).toBe(0);
    });
  });

  describe('ASIN Extraction from URLs', () => {
    it('extracts 10-character ASIN from standard Amazon product URLs', () => {
      expect(extractAsinFromUrl('https://www.amazon.com/dp/B08N5WRWNW')).toBe('B08N5WRWNW');
      expect(extractAsinFromUrl('https://www.amazon.co.uk/Apple-MacBook-13-inch-256GB-Storage/dp/B08N5WRWNW/ref=sr_1_1')).toBe('B08N5WRWNW');
      expect(extractAsinFromUrl('https://www.amazon.in/gp/product/B09G9FPHY6')).toBe('B09G9FPHY6');
    });

    it('returns null for non-product URLs', () => {
      expect(extractAsinFromUrl('https://www.amazon.com/s?k=laptops')).toBeNull();
      expect(extractAsinFromUrl('https://www.google.com')).toBeNull();
      expect(extractAsinFromUrl('')).toBeNull();
    });
  });

  describe('Rating & Review Extraction', () => {
    it('parses ratings correctly across various Amazon formats', () => {
      expect(parseRating('4.6 out of 5 stars')).toBe(4.6);
      expect(parseRating('4.8 out of 5')).toBe(4.8);
      expect(parseRating('5.0')).toBe(5.0);
      expect(parseRating('No reviews yet')).toBe(0);
    });
  });

  describe('Zod Schema Strict Validation', () => {
    it('accepts valid parsed product structures', () => {
      const validProduct = {
        asin: 'B08N5WRWNW',
        title: 'Apple MacBook Air with M1 Chip (13-inch, 8GB RAM, 256GB SSD)',
        brand: 'Apple',
        currentPrice: 999.00,
        originalPrice: 1099.00,
        currency: 'USD',
        rating: 4.8,
        reviewCount: 24500,
        availability: true,
        images: ['https://m.media-amazon.com/images/I/71jG+e7roXL._AC_SL1500_.jpg'],
        features: ['All-Day Battery Life', 'Powerful Performance'],
        specifications: {
          'Display': '13.3-inch Retina',
          'Memory': '8GB unified memory'
        }
      };

      const result = ScrapedProductSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
    });

    it('rejects product with invalid ASIN or negative price', () => {
      const invalidProduct = {
        asin: 'INVALID_ASIN_123',
        title: 'Test',
        currentPrice: -50,
        images: []
      };

      const result = ScrapedProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });
});
