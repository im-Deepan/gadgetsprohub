/**
 * Ensures that every Amazon affiliate link contains the correct site tag (default: gadgetsprohub-21)
 * and falls back to constructing a clean Amazon link if only ASIN is available.
 */
export function getCleanAffiliateUrl(
  affiliateLink?: string,
  asin?: string,
  affiliateCode?: string
): string {
  const defaultTag = (affiliateCode && affiliateCode !== 'gadgetspro-20') ? affiliateCode : 'gadgetsprohub-21';
  let raw = (affiliateLink || '').trim();

  // Fallback to ASIN if affiliateLink is missing or placeholder
  if ((!raw || raw.includes('B501...') || raw.includes('example.com')) && asin) {
    return `https://www.amazon.com/dp/${asin}/?tag=${defaultTag}`;
  }

  if (!raw) return '';

  // Ensure protocol prefix
  if (!/^https?:\/\//i.test(raw)) {
    raw = 'https://' + raw;
  }

  try {
    const urlObj = new URL(raw);
    const host = urlObj.hostname.toLowerCase();

    // Check if link is an Amazon marketplace domain or amzn shortener
    if (
      host.includes('amazon.') ||
      host.includes('amzn.') ||
      host.includes('amzn.to')
    ) {
      urlObj.searchParams.set('tag', defaultTag);
      return urlObj.toString();
    }
  } catch (err) {
    // If URL parsing fails, string regex fallback
    if (raw.includes('amazon.') || raw.includes('amzn.')) {
      if (!raw.includes('tag=')) {
        const sep = raw.includes('?') ? '&' : '?';
        return `${raw}${sep}tag=${defaultTag}`;
      } else {
        return raw.replace(/tag=[^&]+/g, `tag=${defaultTag}`);
      }
    }
  }

  return raw;
}
