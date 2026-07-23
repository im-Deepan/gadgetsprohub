export class DataNormalizer {
  public static cleanText(text: string | null | undefined): string {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  public static parsePrice(priceStr: string | null | undefined): number {
    if (!priceStr || !priceStr.trim()) return 0;
    // Extract first valid monetary amount (e.g. $1,234.56, £99.99, $12.99 - $15.99, $19.99 (List: $24.99))
    const match = priceStr.match(/\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?/);
    if (!match) return 0;

    let cleaned = match[0];
    if (!cleaned.includes('.') && priceStr.includes(',') && /^\d+,\d{1,2}$/.test(cleaned)) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }

    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
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
