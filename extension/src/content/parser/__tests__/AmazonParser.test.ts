/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://www.amazon.com/dp/B08F7PTF53"}
 */
import { AmazonParser } from '../index';

describe('AmazonParser Snapshot', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts product fields perfectly from a standard page', async () => {
    document.body.innerHTML = `
      <div id="productTitle">Awesome Wireless Headphones</div>
      <a id="bylineInfo">Visit the CoolAudio Store</a>
      <input type="hidden" id="ASIN" value="B08F7PTF53" />
      <div id="corePriceDisplay_desktop_feature_div">
        <span class="a-price"><span class="a-offscreen">$99.99</span></span>
      </div>
      <div class="basisPrice">
        <span class="a-offscreen">$149.99</span>
      </div>
      <div id="averageCustomerReviews_feature_div">
        <span class="a-icon-alt">4.7 out of 5 stars</span>
        <span id="acrCustomerReviewText">10,234 ratings</span>
      </div>
      <div id="availability">
        <span>In Stock.</span>
      </div>
      <img id="landingImage" src="https://m.media-amazon.com/images/I/51w+z.jpg" />
      <div id="feature-bullets">
        <ul>
          <li>Active Noise Cancellation</li>
          <li>30 hours battery life</li>
        </ul>
      </div>
      <div id="productDescription">
        <p>These headphones are amazing for music lovers.</p>
      </div>
    `;

    const result = await AmazonParser.parse();
    
    expect(result.isValidPage).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data).toBeDefined();
    
    const data = result.data!;
    expect(data.name).toBe('Awesome Wireless Headphones');
    expect(data.brand).toBe('CoolAudio');
    expect(data.asin).toBe('B08F7PTF53');
    expect(data.currentPrice).toBe(99.99);
    expect(data.originalPrice).toBe(149.99);
    expect(data.currency).toBe('USD');
    expect(data.rating).toBe(4.7);
    expect(data.reviewCount).toBe(10234);
    expect(data.availability).toBe(true);
    expect(data.images).toEqual(['https://m.media-amazon.com/images/I/51w+z.jpg']);
    expect(data.bulletFeatures).toEqual(['Active Noise Cancellation', '30 hours battery life']);
    expect(data.description).toBe('These headphones are amazing for music lovers.');
    expect(data.parserVersion).toBe('1.1.0');
    expect(result.metrics?.extractionSuccessRate).toBeGreaterThan(90);
  });
});
