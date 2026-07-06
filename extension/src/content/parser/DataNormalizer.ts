export class DataNormalizer {
  public static cleanText(text: string | null | undefined): string {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  public static parsePrice(priceStr: string | null | undefined): number {
    if (!priceStr) return 0;
    const clean = priceStr.replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
  }

  public static parseRating(ratingStr: string | null | undefined): number {
    if (!ratingStr) return 0;
    // Usually "4.5 out of 5 stars"
    const match = ratingStr.match(/(\d+\.\d+|\d+)/);
    return match ? parseFloat(match[0]) : 0;
  }

  public static parseReviewCount(reviewStr: string | null | undefined): number {
    if (!reviewStr) return 0;
    // "1,234 ratings" or "1.234 ratings"
    const clean = reviewStr.split(' ')[0]?.replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
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
