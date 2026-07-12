import { ProductPayload } from '../../types';
import { FieldExtractors } from './FieldExtractors';
import { DataNormalizer } from './DataNormalizer';

export class ProductBuilder {
  constructor(private log: (msg: string) => void) {}

  public build(): Partial<ProductPayload> {
    const title = FieldExtractors.getTitle();
    this.log(`Extracted title: ${title.substring(0, 30)}...`);

    const brand = FieldExtractors.getBrand();
    const asin = FieldExtractors.getAsin();
    this.log(`Extracted ASIN: ${asin}, Brand: ${brand}`);

    const priceStr = FieldExtractors.getPriceString();
    const origPriceStr = FieldExtractors.getOriginalPriceString();
    const currentPrice = DataNormalizer.parsePrice(priceStr);
    const originalPrice = DataNormalizer.parsePrice(origPriceStr) || currentPrice;
    
    let discount = 0;
    if (originalPrice > currentPrice && currentPrice > 0) {
      discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }
    const currency = DataNormalizer.parseCurrency(priceStr || origPriceStr);
    this.log(`Extracted Price: ${currentPrice} ${currency}, Discount: ${discount}%`);

    const ratingStr = FieldExtractors.getRatingString();
    const reviewStr = FieldExtractors.getReviewCountString();
    const rating = DataNormalizer.parseRating(ratingStr);
    const reviewCount = DataNormalizer.parseReviewCount(reviewStr);
    this.log(`Extracted Rating: ${rating} (${reviewCount} reviews)`);

    const availability = FieldExtractors.getAvailability();
    const images = FieldExtractors.getImages();
    this.log(`Extracted ${images.length} images. Available: ${availability}`);

    const bulletFeatures = FieldExtractors.getFeatures();
    const description = FieldExtractors.getDescription();
    const specifications = FieldExtractors.getSpecifications();

    const urlObj = new URL(window.location.href);
    const originalTag = urlObj.searchParams.get('tag');
    const tag = originalTag || 'shopgear-20';

    urlObj.search = '';
    const productUrl = urlObj.toString();

    let affiliateLink = productUrl;
    if (asin && (productUrl.includes('amazon.com') || productUrl.includes('amzn.to'))) {
      affiliateLink = `https://www.amazon.com/dp/${asin}/?tag=${tag}`;
    }

    const result: Partial<ProductPayload> & { title?: string } = {
      name: title,
      title, // Backward compatibility with previous schema
      brand,
      asin,
      price: currentPrice,
      currentPrice,
      originalPrice,
      discount,
      currency,
      rating,
      reviewCount,
      availability,
      description,
      bulletFeatures,
      specifications,
      images,
      productUrl,
      affiliateLink,
      parserVersion: '1.1.0'
    };

    return result;
  }
}
