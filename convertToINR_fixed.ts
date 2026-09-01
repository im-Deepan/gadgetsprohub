export async function convertToINR(amount: number, fromCurrency?: string | null, urlOrHint?: string | null): Promise<number> {
  if (!amount || isNaN(amount) || amount <= 0) return 0;
  
  let curr = (fromCurrency || '').trim().toUpperCase();
  if (!curr && urlOrHint) {
    const hint = urlOrHint.toLowerCase();
    if (hint.includes('amazon.in') || hint.includes('flipkart') || hint.includes('meesho') || hint.includes('myntra') || hint.includes('ajio') || hint.includes('croma') || hint.includes('reliancedigital')) {
      curr = 'INR';
    } else if (hint.includes('amazon.co.uk') || hint.includes('ebay.co.uk') || hint.includes('.uk')) {
      curr = 'GBP';
    } else if (hint.includes('amazon.ae') || hint.includes('.ae')) {
      curr = 'AED';
    } else if (hint.includes('amazon.de') || hint.includes('amazon.fr') || hint.includes('amazon.es') || hint.includes('amazon.it') || hint.includes('.eu')) {
      curr = 'EUR';
    } else if (hint.includes('amazon.ca') || hint.includes('.ca')) {
      curr = 'CAD';
    } else if (hint.includes('amazon.com.au') || hint.includes('.au')) {
      curr = 'AUD';
    } else if (hint.includes('amazon.com') || hint.includes('walmart') || hint.includes('bestbuy') || hint.includes('ebay.com') || hint.includes('aliexpress')) {
      curr = 'USD';
    }
  }

  if (curr === 'INR' || curr === '₹' || curr === 'RS' || curr === 'RS.') {
    return Math.round(amount);
  }

  if (!curr) {
    if (amount <= 1000) {
      curr = 'USD';
    } else {
      return Math.round(amount);
    }
  }

  if (curr === '$') curr = 'USD';
  if (curr === '€') curr = 'EUR';
  if (curr === '£') curr = 'GBP';
  if (curr === '¥') curr = 'JPY';
  
  try {
    const ms = MarketplaceService.getInstance();
    const inrValue = await ms.convertCurrency(amount, curr, 'INR');
    return Math.round(inrValue);
  } catch (e) {
    const rates: Record<string, number> = {
      'USD': 83.5,
      'EUR': 91.0,
      'GBP': 106.0,
      'AED': 22.75,
      'CAD': 61.5,
      'AUD': 54.5,
      'JPY': 0.55,
      'CNY': 11.5,
      'SGD': 62.0
    };
    const rate = rates[curr] || 83.5;
    return Math.round(amount * rate);
  }
}
