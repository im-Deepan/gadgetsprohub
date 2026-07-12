import { DataNormalizer } from './DataNormalizer';

export class FieldExtractors {
  private static getTextContent(selectors: string[]): string | null {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        return el.textContent;
      }
    }
    return null;
  }

  public static getTitle(): string {
    const selectors = ['#productTitle', '#title', 'h1.a-size-large'];
    return DataNormalizer.cleanText(this.getTextContent(selectors));
  }

  public static getBrand(): string {
    const selectors = ['#bylineInfo', '#brand', '.po-brand .a-span9'];
    let brand = this.getTextContent(selectors);
    if (brand) {
      brand = brand.replace(/^Brand:\s*/i, '').replace(/^Visit the\s*/i, '').replace(/\s*Store$/i, '');
    }
    return DataNormalizer.cleanText(brand) || 'Unknown Brand';
  }

  public static getAsin(): string {
    // 1. Hidden input
    const asinInput = document.getElementById('ASIN') as HTMLInputElement;
    if (asinInput?.value) return asinInput.value;

    // 2. URL parsing
    const urlMatches = window.location.href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
    if (urlMatches && urlMatches[1]) return urlMatches[1];

    // 3. Search in details list
    const detailsSelectors = ['#detailBullets_feature_div', '#prodDetails'];
    for (const sel of detailsSelectors) {
      const container = document.querySelector(sel);
      if (container) {
        const text = container.textContent || '';
        const match = text.match(/ASIN\s*[:\u200e\u200f]*\s*([A-Z0-9]{10})/);
        if (match && match[1]) return match[1];
      }
    }

    return '';
  }

  public static getPriceString(): string | null {
    const selectors = [
      '.apexPriceToPay .a-offscreen',
      '.priceToPay .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#corePrice_desktop .a-price .a-offscreen',
      '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen'
    ];
    return this.getTextContent(selectors);
  }

  public static getOriginalPriceString(): string | null {
    const selectors = [
      '.basisPrice .a-offscreen',
      'span.a-text-strike'
    ];
    return this.getTextContent(selectors);
  }

  public static getRatingString(): string | null {
    const selectors = [
      '#averageCustomerReviews .a-icon-alt',
      '#averageCustomerReviews_feature_div .a-icon-alt',
      '.reviewCountTextLinkedHistogram .a-icon-alt'
    ];
    return this.getTextContent(selectors);
  }

  public static getReviewCountString(): string | null {
    const selectors = [
      '#acrCustomerReviewText',
      '#averageCustomerReviews_feature_div #acrCustomerReviewText'
    ];
    return this.getTextContent(selectors);
  }

  public static getAvailability(): boolean {
    const selectors = ['#availability', '#outOfStock'];
    const text = this.getTextContent(selectors);
    if (!text) return true; // Assume available if we can't find the badge
    const cleanText = text.toLowerCase();
    return !cleanText.includes('currently unavailable') && !cleanText.includes('out of stock');
  }

  public static getImages(): string[] {
    const images: string[] = [];
    
    // Attempt 1: From high-res scripts (imgBlkFront or landingImage)
    const imgEl = document.querySelector('#landingImage, #imgBlkFront') as HTMLImageElement;
    if (imgEl) {
      // Often contains a data-a-dynamic-image attribute with a JSON mapping of resolutions to image URLs
      const dynamicImages = imgEl.getAttribute('data-a-dynamic-image');
      if (dynamicImages) {
        try {
          const parsed = JSON.parse(dynamicImages);
          // Get the highest resolution image (the keys are URLs, values are resolutions array)
          const urls = Object.keys(parsed);
          if (urls.length > 0) {
             // sort by resolution or just take the last one, usually they are ordered
             images.push(urls[urls.length - 1]);
          }
        } catch (e) {
          if (imgEl.src) images.push(imgEl.src);
        }
      } else if (imgEl.src) {
        images.push(imgEl.src);
      }
    }

    // Attempt 2: Image gallery thumbnail clicks (left nav)
    if (true) {
      const thumbs = document.querySelectorAll('.a-button-thumbnail img');
      thumbs.forEach((t) => {
        const src = (t as HTMLImageElement).src;
        if (src) {
          // Convert thumbnail URL to full size
          const fullSize = src.replace(/\._[A-Z0-9_]+_\./, '.');
          if (!images.includes(fullSize)) images.push(fullSize);
        }
      });
    }

    return images.filter(img => img && img.startsWith('http')).slice(0, 5);
  }

  public static getFeatures(): string[] {
    const selectors = ['#feature-bullets ul li:not(.a-hidden)', '#productFactsDesktopExpander ul li'];
    const features: string[] = [];
    
    for (const selector of selectors) {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) {
        els.forEach(el => {
          const text = DataNormalizer.cleanText(el.textContent);
          if (text) features.push(text);
        });
        break;
      }
    }
    return features;
  }

  public static getDescription(): string {
    const selectors = ['#productDescription', '#aplus'];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        return DataNormalizer.cleanText(el.textContent);
      }
    }
    return '';
  }

  public static getSpecifications(): Record<string, string> {
    const specs: Record<string, string> = {};
    const tableSelectors = [
      '#productDetails_techSpec_section_1',
      '.prodDetTable',
      '#technicalSpecifications_section_1'
    ];

    for (const selector of tableSelectors) {
      const rows = document.querySelectorAll(`${selector} tr`);
      if (rows.length > 0) {
        rows.forEach(row => {
          const th = row.querySelector('th');
          const td = row.querySelector('td');
          if (th && td) {
            const key = DataNormalizer.cleanText(th.textContent);
            const val = DataNormalizer.cleanText(td.textContent);
            if (key && val) specs[key] = val;
          }
        });
        return specs; // Stop after first successful table parse
      }
    }

    // Alternative: List format (e.g., product overview section)
    const overviewContainer = document.querySelector('#poToggleButton');
    if (overviewContainer) {
      const rows = document.querySelectorAll('.a-spacing-small.po-row');
      rows.forEach(row => {
        const keyEl = row.querySelector('.a-span3');
        const valEl = row.querySelector('.a-span9');
        if (keyEl && valEl) {
           const key = DataNormalizer.cleanText(keyEl.textContent);
           const val = DataNormalizer.cleanText(valEl.textContent);
           if (key && val) specs[key] = val;
        }
      });
    }

    return specs;
  }
}
