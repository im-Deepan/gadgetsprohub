export class DataNormalizer {
  public static cleanText(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '') // Strip residual HTML tags
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Strip unprintable control characters
      .replace(/\s+/g, ' ')
      .trim();
  }

  public static cleanArray(arr: (string | null | undefined)[] | null | undefined): string[] {
    if (!Array.isArray(arr)) return [];
    const set = new Set<string>();
    for (const item of arr) {
      const cleaned = this.cleanText(item);
      if (cleaned) {
        set.add(cleaned);
      }
    }
    return Array.from(set);
  }

  public static cleanSpecifications(specs: Record<string, any> | null | undefined): Record<string, string> {
    if (!specs || typeof specs !== 'object') return {};
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(specs)) {
      const cleanKey = this.cleanText(key);
      const cleanVal = this.cleanText(typeof val === 'string' ? val : String(val ?? ''));
      if (cleanKey && cleanVal) {
        result[cleanKey] = cleanVal;
      }
    }
    return result;
  }

  public static parsePrice(priceStr: string | null | undefined): number {
    if (!priceStr || typeof priceStr !== 'string' || !priceStr.trim()) return 0;

    const trimmed = priceStr.trim();

    // 1. Look for standard currency decimal pattern (e.g., $19.99, £1,299.00)
    // First try matching explicit currency amount with 2 decimal places to avoid capturing collapsed strings
    const decimalMatches = trimmed.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g) || 
                           trimmed.match(/\d+(?:,\d{3})*\.\d{1,2}/g);
                           
    if (decimalMatches && decimalMatches.length > 0) {
      const cleanNum = parseFloat(decimalMatches[0].replace(/,/g, ''));
      if (!isNaN(cleanNum) && cleanNum >= 0 && cleanNum <= 100000) {
        return Math.round(cleanNum * 100) / 100;
      }
    }

    // 2. Generic number match fallback
    const genericMatch = trimmed.match(/\d+(?:[\.,]\d+)?/);
    if (!genericMatch) return 0;

    let cleaned = genericMatch[0];
    if (!cleaned.includes('.') && trimmed.includes(',') && /^\d+,\d{1,2}$/.test(cleaned)) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }

    let val = parseFloat(cleaned);
    if (isNaN(val) || val < 0) return 0;

    // 3. Handle integer price string collapsed from whole + fraction without decimal (e.g. "1999" -> 19.99)
    if (val >= 1000 && !trimmed.includes('.') && !trimmed.includes(',')) {
      if (val % 100 !== 0) {
        val = val / 100;
      }
    }

    if (val > 100000) return 0;

    return Math.round(val * 100) / 100;
  }

  public static parseRating(ratingStr: string | null | undefined): number {
    if (!ratingStr) return 0;
    const match = ratingStr.match(/(\d+\.\d+|\d+)/);
    if (!match) return 0;
    const rating = parseFloat(match[0]);
    if (isNaN(rating) || rating < 0) return 0;
    return Math.min(5, Math.max(0, Math.round(rating * 10) / 10));
  }

  public static parseReviewCount(reviewStr: string | null | undefined): number {
    if (!reviewStr) return 0;
    const clean = reviewStr.split(' ')[0]?.replace(/[^0-9]/g, '');
    const count = parseInt(clean, 10);
    return isNaN(count) || count < 0 ? 0 : count;
  }

  public static parseCurrency(priceStr: string | null | undefined): string {
    if (!priceStr) return 'USD';
    if (priceStr.includes('£')) return 'GBP';
    if (priceStr.includes('€')) return 'EUR';
    if (priceStr.includes('₹')) return 'INR';
    if (priceStr.includes('¥')) return 'JPY';
    if (priceStr.includes('C$')) return 'CAD';
    if (priceStr.includes('A$')) return 'AUD';
    return 'USD';
  }
}

