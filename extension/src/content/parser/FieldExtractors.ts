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
    const primaryContainers = [
      '#titleSection',
      '#title_feature_div',
      '#productTitle_feature_div',
      '#centerCol',
      '#ppd',
      '#dp-container'
    ];
    const childTitleSelectors = [
      '#productTitle',
      '#title',
      'h1.a-size-large',
      'h1 span#productTitle',
      'h1'
    ];

    // 1. Search inside primary title/center-col containers first
    for (const containerSel of primaryContainers) {
      const container = document.querySelector(containerSel);
      if (container) {
        for (const childSel of childTitleSelectors) {
          const el = container.querySelector(childSel);
          if (el && el.textContent) {
            const clean = DataNormalizer.cleanText(el.textContent);
            if (clean && clean.length > 2) {
              return clean;
            }
          }
        }
      }
    }

    // 2. Fallback to global document-wide selectors
    const globalSelectors = ['#productTitle', '#title', 'h1.a-size-large', 'h1'];
    return DataNormalizer.cleanText(this.getTextContent(globalSelectors));
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
    const buyboxSelectors = [
      '#corePriceDisplay_desktop_feature_div',
      '#corePrice_desktop',
      '#apex_desktop',
      '#buybox',
      '#price',
      '#desktop_buybox',
      '#centerCol',
      '#combinedBuyBox'
    ];

    const priceChildSelectors = [
      '.a-price.priceToPay .a-offscreen',
      '.apexPriceToPay .a-offscreen',
      '.priceToPay .a-offscreen',
      '.a-price[data-a-size="xl"] .a-offscreen',
      '.a-price[data-a-size="b"] .a-offscreen',
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#priceblock_saleprice',
      '.a-color-price'
    ];

    const isValidNumericPrice = (str: string): boolean => {
      const parsed = DataNormalizer.parsePrice(str);
      return typeof parsed === 'number' && !isNaN(parsed) && parsed > 0;
    };

    // 1. Search inside primary buybox containers
    for (const boxSel of buyboxSelectors) {
      const container = document.querySelector(boxSel);
      if (container) {
        for (const childSel of priceChildSelectors) {
          const el = container.querySelector(childSel);
          if (el && el.textContent) {
            const text = el.textContent.trim();
            if (text && isValidNumericPrice(text)) {
              return text;
            }
          }
        }

        const wholeEl = container.querySelector('.a-price-whole');
        const fractionEl = container.querySelector('.a-price-fraction');
        if (wholeEl && wholeEl.textContent) {
          const whole = wholeEl.textContent.replace(/[^0-9]/g, '');
          const fraction = fractionEl ? fractionEl.textContent?.replace(/[^0-9]/g, '') || '00' : '00';
          if (whole) {
            const constructed = `${whole}.${fraction}`;
            if (isValidNumericPrice(constructed)) {
              return constructed;
            }
          }
        }
      }
    }

    // 2. Fallback to document-wide selectors
    for (const childSel of priceChildSelectors) {
      const el = document.querySelector(childSel);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        if (text && isValidNumericPrice(text)) {
          return text;
        }
      }
    }

    // 3. Global whole + fraction fallback
    const globalWhole = document.querySelector('.a-price-whole');
    const globalFraction = document.querySelector('.a-price-fraction');
    if (globalWhole && globalWhole.textContent) {
      const whole = globalWhole.textContent.replace(/[^0-9]/g, '');
      const fraction = globalFraction ? globalFraction.textContent?.replace(/[^0-9]/g, '') || '00' : '00';
      if (whole) {
        const constructed = `${whole}.${fraction}`;
        if (isValidNumericPrice(constructed)) {
          return constructed;
        }
      }
    }

    return null;
  }

  public static getOriginalPriceString(): string | null {
    const buyboxSelectors = [
      '#corePriceDisplay_desktop_feature_div',
      '#corePrice_desktop',
      '#apex_desktop',
      '#buybox',
      '#price',
      '#centerCol'
    ];

    const strikeChildSelectors = [
      '.basisPrice .a-offscreen',
      '.a-text-price .a-offscreen',
      'span.a-text-strike',
      '.a-price[data-a-strike="true"] .a-offscreen',
      '#priceblock_listprice'
    ];

    const isValidNumericPrice = (str: string): boolean => {
      const parsed = DataNormalizer.parsePrice(str);
      return typeof parsed === 'number' && !isNaN(parsed) && parsed > 0;
    };

    for (const boxSel of buyboxSelectors) {
      const container = document.querySelector(boxSel);
      if (container) {
        for (const childSel of strikeChildSelectors) {
          const el = container.querySelector(childSel);
          if (el && el.textContent) {
            const text = el.textContent.trim();
            if (text && isValidNumericPrice(text)) {
              return text;
            }
          }
        }
      }
    }

    for (const childSel of strikeChildSelectors) {
      const el = document.querySelector(childSel);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        if (text && isValidNumericPrice(text)) {
          return text;
        }
      }
    }

    return null;
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
