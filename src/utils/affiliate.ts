/**
 * Ensures that every Amazon affiliate link contains the correct site tag (default: gadgetsprohub-21)
 * and falls back to constructing a clean Amazon link if only ASIN is available.
 */
export function getCleanAffiliateUrl(
  affiliateLink?: string,
  asin?: string,
  affiliateCode?: string
): string {
  let raw = (affiliateLink || '').trim();

  // Fallback to ASIN if affiliateLink is missing or placeholder
  if ((!raw || raw.includes('B501...') || raw.includes('example.com')) && asin) {
    const fallbackTag = affiliateCode || 'gadgetsprohub-21';
    return `https://www.amazon.com/dp/${asin}/?tag=${fallbackTag}`;
  }

  if (!raw) return '';

  // Ensure protocol prefix
  if (!/^https?:\/\//i.test(raw)) {
    raw = 'https://' + raw;
  }

  try {
    const urlObj = new URL(raw);
    const host = urlObj.hostname.toLowerCase();

    // Map affiliate parameter by marketplace domain
    let paramName = 'affid'; // Default fallback generic parameter
    let isAmazon = false;
    
    if (host.includes('amazon.') || host.includes('amzn.') || host.includes('link.amazon') || host === 'link.amazon' || host === 'a.co' || host.includes('a.co')) {
      paramName = 'tag';
      isAmazon = true;
    } else if (host.includes('ebay.')) {
      paramName = 'campid';
    } else if (host.includes('aliexpress.')) {
      paramName = 'aff_short_key';
    } else if (host.includes('walmart.')) {
      paramName = 'publisherId';
    } else if (host.includes('flipkart.') || host.includes('myntra.') || host.includes('croma.')) {
      paramName = 'affid';
    }

    // Apply the correct affiliate code, or fallback to default only for Amazon
    let tagToApply = affiliateCode;
    if (!tagToApply && isAmazon) {
      tagToApply = 'gadgetsprohub-21';
    }

    if (tagToApply) {
      urlObj.searchParams.set(paramName, tagToApply);
    }
    return urlObj.toString();
  } catch (err) {
    const isAmazon = raw.includes('amazon.') || raw.includes('amzn.') || raw.includes('link.amazon') || raw.includes('a.co');
    let tagToApply = affiliateCode;
    if (!tagToApply && isAmazon) {
      tagToApply = 'gadgetsprohub-21';
    }

    if (tagToApply) {
      // If URL parsing fails, string regex fallback
      if (isAmazon) {
        if (!raw.includes('tag=')) {
          const sep = raw.includes('?') ? '&' : '?';
          return `${raw}${sep}tag=${tagToApply}`;
        } else {
          return raw.replace(/tag=[^&]+/g, `tag=${tagToApply}`);
        }
      }
      
      // Generic regex fallback for other marketplaces
      if (!raw.includes('affid=') && !raw.includes('tag=') && !raw.includes('campid=')) {
        const sep = raw.includes('?') ? '&' : '?';
        return `${raw}${sep}affid=${tagToApply}`;
      } else if (raw.includes('affid=')) {
        return raw.replace(/affid=[^&]+/g, `affid=${tagToApply}`);
      } else if (raw.includes('campid=')) {
        return raw.replace(/campid=[^&]+/g, `campid=${tagToApply}`);
      }
    }
  }

  return raw;
}
