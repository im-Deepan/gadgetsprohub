export class PageValidator {
  public static isProductPage(): boolean {
    const url = window.location.href;
    
    // Check if it's a known non-product page
    if (url.includes('/s?') || url.includes('/cart') || url.includes('/gp/cart') || url.includes('/b?') || url.includes('/gp/b')) {
      return false;
    }

    // Check URL pattern for product identifiers
    if (!url.includes('/dp/') && !url.includes('/gp/product/')) {
      return false;
    }

    // Check for standard product page DOM elements
    const hasProductTitle = !!document.getElementById('productTitle');
    const hasBuyBox = !!document.getElementById('buybox') || !!document.getElementById('corePriceDisplay_desktop_feature_div');
    
    return hasProductTitle || hasBuyBox;
  }
}
