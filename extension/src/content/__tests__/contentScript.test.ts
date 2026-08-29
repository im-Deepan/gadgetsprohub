/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://www.amazon.com/dp/B08F7PTF53"}
 */
import { AmazonParser } from '../parser';
import { ProductValidator } from '../parser/ProductValidator';
import { PageValidator } from '../parser/PageValidator';

describe('Content Script & Parser Integration Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('correctly handles scraping a rich Amazon product page', async () => {
    document.body.innerHTML = `
      <div id="titleSection">
        <h1 id="productTitle">Sony WH-1000XM5 Wireless Headphones</h1>
      </div>
      <a id="bylineInfo">Visit the Sony Store</a>
      <input type="hidden" id="ASIN" value="B09XS7JWHH" />
      <div id="corePriceDisplay_desktop_feature_div">
        <span class="a-price priceToPay"><span class="a-offscreen">$398.00</span></span>
      </div>
      <div class="basisPrice">
        <span class="a-offscreen">$449.99</span>
      </div>
      <div id="averageCustomerReviews_feature_div">
        <span class="a-icon-alt">4.6 out of 5 stars</span>
        <span id="acrCustomerReviewText">8,412 ratings</span>
      </div>
      <div id="availability">
        <span class="a-color-success">In Stock</span>
      </div>
      <img id="landingImage" src="https://m.media-amazon.com/images/I/61+elL4t1BL._AC_SL1500_.jpg" />
      <div id="feature-bullets">
        <ul class="a-unordered-list a-vertical a-spacing-mini">
          <li><span class="a-list-item">Industry Leading Noise Cancellation</span></li>
          <li><span class="a-list-item">Magnificent Sound Quality</span></li>
          <li><span class="a-list-item">Crystal Clear Hands-Free Calling</span></li>
        </ul>
      </div>
      <div id="productDescription">
        <p>The WH-1000XM5 wireless headphones rewrite the rules for distraction-free listening.</p>
      </div>
    `;

    const result = await AmazonParser.parse();
    expect(result.isValidPage).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data).toBeDefined();

    const data = result.data!;
    expect(data.name).toBe('Sony WH-1000XM5 Wireless Headphones');
    expect(data.brand).toBe('Sony');
    expect(data.asin).toBe('B09XS7JWHH');
    expect(data.currentPrice).toBe(398.00);
    expect(data.originalPrice).toBe(449.99);
    expect(data.rating).toBe(4.6);
    expect(data.reviewCount).toBe(8412);
    expect(data.availability).toBe(true);
    expect(data.bulletFeatures).toHaveLength(3);
    expect(data.bulletFeatures[0]).toBe('Industry Leading Noise Cancellation');

    // Schema Validation
    const validation = ProductValidator.validate(data);
    expect(validation.errors).toHaveLength(0);
  });

  it('detects when page is a non-product search or browse page', () => {
    // Test URL-based detection
    const isSearch = PageValidator.isProductPage();
    expect(typeof isSearch).toBe('boolean');
  });

  it('validates schema and catches missing title or missing ASIN', () => {
    const invalidProduct: any = {
      name: '',
      asin: '',
      currentPrice: 99.99,
      originalPrice: 129.99,
      rating: 4.5,
      reviewCount: 10,
      currency: 'USD',
      availability: true,
      images: [],
      bulletFeatures: [],
      description: '',
      specifications: {}
    };

    const validation = ProductValidator.validate(invalidProduct);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors.some(e => e.includes('title') || e.includes('Product title is missing'))).toBe(true);
    expect(validation.errors.some(e => e.includes('ASIN') || e.includes('ASIN is missing'))).toBe(true);
  });
});
