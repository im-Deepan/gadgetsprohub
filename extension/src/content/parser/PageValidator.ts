export class PageValidator {
  public static isProductPage(): boolean {
    const url = window.location.href;
    
    // Check if it's a known non-product search/cart/browse page
    if (url.includes('/s?') || url.includes('/cart') || url.includes('/gp/cart') || url.includes('/gp/browse') || url.includes('/b?node=')) {
      return false;
    }

    // Check for standard product page DOM elements
    const hasProductTitle = !!document.getElementById('productTitle') || !!document.querySelector('h1#title') || !!document.querySelector('#productTitle_feature_div');
    const hasBuyBox = !!document.getElementById('buybox') || !!document.getElementById('corePriceDisplay_desktop_feature_div') || !!document.getElementById('apex_desktop');
    const hasAsin = !!document.getElementById('ASIN') || !!(document.querySelector('input[name="ASIN"]') as HTMLInputElement)?.value;
    
    if (hasProductTitle || hasBuyBox || hasAsin) {
      return true;
    }

    // Check URL pattern for product identifiers
    if (url.includes('/dp/') || url.includes('/gp/product/') || url.includes('/gp/aw/d/') || url.includes('/d/') || /\/product\/[A-Z0-9]{10}/i.test(url)) {
      return true;
    }

    return false;
  }
}
