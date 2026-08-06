export interface ViewMetadata {
  title: string;
  description: string;
  keywords?: string;
  ogType?: string;
  ogUrl?: string;
  ogImage?: string;
  noindex?: boolean;
}

/**
 * Default metadata settings for static views.
 */
export const DEFAULT_VIEW_METADATA: Record<string, ViewMetadata> = {
  home: {
    title: 'GadgetsProHub | Top Electronics, Smart Gear & Tech Reviews',
    description: 'Discover top-rated tech gadgets, electronics, and honest reviews. Compare specs and find the best prices on smartphones, laptops, audio gear, and more.',
    keywords: 'electronics, gadgets, smartphones, laptops, audio gear, smartwatches, tech reviews, budget gadgets, GadgetsProHub',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  products: {
    title: 'All Products - Compare Tech Specs & Prices | GadgetsProHub',
    description: 'Browse our full collection of gadgets and compare specifications across smartphones, laptops, audio gear, and smart accessories.',
    keywords: 'product directory, search gadgets, electronic specs, compare mobile phones, compare laptops',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  blogs: {
    title: 'Tech Guides & Product Reviews | GadgetsProHub',
    description: 'Read the latest tech insights, buying guides, and step-by-step product comparisons from our editorial team.',
    keywords: 'tech blog, gadgets guide, buying guides, tech reviews, software guides',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  contact: {
    title: 'Contact Us | GadgetsProHub Support',
    description: 'Have a question or feedback? Get in touch with our support team and we will respond promptly.',
    keywords: 'contact support, customer service, customer care, support GadgetsProHub, ask experts',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  login: {
    title: 'Sign In | GadgetsProHub',
    description: 'Sign in to your account to save your favorite products, manage price alerts, and sync your preferences across devices.',
    keywords: 'sign in, log in, account login, secure sign in',
    ogType: 'website',
    ogImage: '/favicon.png',
    noindex: true
  },
  profile: {
    title: 'Your Account | GadgetsProHub',
    description: 'Manage your saved products, account profile settings, and location preferences.',
    keywords: 'user profile, my account, settings, saved products',
    ogType: 'website',
    ogImage: '/favicon.png',
    noindex: true
  },
  admin: {
    title: 'Admin Dashboard | GadgetsProHub',
    description: 'Manage catalog products, user reviews, and site settings.',
    keywords: 'admin panel, management console, catalog management',
    ogType: 'website',
    ogImage: '/favicon.png',
    noindex: true
  },
  'privacy-policy': {
    title: 'Privacy Policy | GadgetsProHub',
    description: 'Read our privacy policy to understand how we protect your personal data and handle your account information.',
    keywords: 'privacy policy, safe browsing, data policy, terms, user safety',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  'about-us': {
    title: 'About Us | GadgetsProHub',
    description: 'Learn about our mission to provide clear, honest product reviews and spec comparisons for tech enthusiasts.',
    keywords: 'about GadgetsProHub, tech reviews team, our mission',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  'terms-conditions': {
    title: 'Terms & Conditions | GadgetsProHub',
    description: 'Review the terms and conditions for using our website and services.',
    keywords: 'terms of service, conditions of use, user agreement',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  disclaimer: {
    title: 'Affiliate Disclosure | GadgetsProHub',
    description: 'Disclosure regarding our affiliate links, partner relationships, and editorial review standards.',
    keywords: 'affiliate disclaimer, review transparency, commission disclosure',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  '404': {
    title: '404 - Page Not Found | GadgetsProHub',
    description: 'The page you requested could not be found. Search our catalog or return to the homepage.',
    keywords: '404, page not found, GadgetsProHub',
    ogType: 'website',
    ogImage: '/favicon.png',
    noindex: true
  }
};

/**
 * Dynamically updates document head elements based on provided metadata.
 * Sets the main page title, description meta, keywords, and appropriate Open Graph (OG) elements.
 */
export function updateDocumentMetadata(meta: ViewMetadata): void {
  if (typeof document === 'undefined') return;

  // 1. Update Title
  document.title = meta.title;

  // 2. Helper to set/update/create meta tags
  const setMetaTag = (selector: string, attrName: string, attrValue: string, value: string | undefined): void => {
    if (value === undefined) {
      const existing = document.querySelector(selector);
      if (existing) {
        existing.remove();
      }
      return;
    }

    let element = document.querySelector(selector);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attrName, attrValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', value);
  };

  // Standard Meta Tags
  setMetaTag('meta[name="description"]', 'name', 'description', meta.description);
  setMetaTag('meta[name="keywords"]', 'name', 'keywords', meta.keywords);

  if (meta.noindex) {
    setMetaTag('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow');
  } else {
    setMetaTag('meta[name="robots"]', 'name', 'robots', 'index, follow');
  }

  // Open Graph / Facebook Meta Tags
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', meta.title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', meta.description);
  setMetaTag('meta[property="og:type"]', 'property', 'og:type', meta.ogType || 'website');
  
  if (meta.ogUrl) {
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', meta.ogUrl);
  } else {
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', window.location.href);
  }

  if (meta.ogImage) {
    const absoluteOgImage = meta.ogImage.startsWith('http://') || meta.ogImage.startsWith('https://')
      ? meta.ogImage
      : `${window.location.origin}${meta.ogImage.startsWith('/') ? '' : '/'}${meta.ogImage}`;
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', absoluteOgImage);
  }
}
