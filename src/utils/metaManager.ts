export interface ViewMetadata {
  title: string;
  description: string;
  keywords?: string;
  ogType?: string;
  ogUrl?: string;
  ogImage?: string;
}

/**
 * Default metadata settings for static views.
 */
export const DEFAULT_VIEW_METADATA: Record<string, ViewMetadata> = {
  home: {
    title: 'gadgetsprohub | Premium Electronics & Smart Gear Directory',
    description: 'Discover trending, premium electronics and detailed specifications. Find honest reviews and the best deals on smartphones, laptops, audio gear, and wearables at gadgetsprohub.',
    keywords: 'electronics, smart gear, gadget directory, smartphones, laptops, audio gear, smartwatches, tech reviews, budget gadgets, gadgetsprohub',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  products: {
    title: 'Products Directory - Explore Tech Specifications | gadgetsprohub',
    description: 'Browse our full catalog of premium electronic products and compare specifications across phones, laptops, wearables, and other smart gadgets.',
    keywords: 'product directory, search gadgets, electronic specs, compare mobile phones, compare laptops',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  blogs: {
    title: 'Editorial Blog & Expert Tech Guides | gadgetsprohub',
    description: 'Read the latest technical insights, gadget buying guides, step-by-step tutorials, and electronics reviews curated by expert research analysts.',
    keywords: 'tech blog, gadgets guide, buying guides, tech reviews, software guides',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  contact: {
    title: 'Contact Support & Expert Inquiries | gadgetsprohub',
    description: 'Contact our professional support team. We value your feedback and will handle all inquiries regarding product specs or advertising opportunities within 24 working hours.',
    keywords: 'contact support, customer service, customer care, support gadgetsprohub, ask experts',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  login: {
    title: 'Secure Account Authentication | gadgetsprohub',
    description: 'Sign into your credentialed profile safely using Google OAuth core services to synchronize your bookmarks, catalog preferences, and local cache.',
    keywords: 'sign in, log in Google, oauth login, secure login',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  profile: {
    title: 'User Profile & Preferred Location Settings | gadgetsprohub',
    description: 'Manage your synchronized account bookmarks, pre-preferred Tamil Nadu district settings, and review local usage sessions safely.',
    keywords: 'user profile, my account, settings, local bookmarks',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  admin: {
    title: 'Security Control Board & Product Feed Panel',
    description: 'Authorized administrative session to curate products catalog list, manage reviews feed, and review global traffic telemetry safely.',
    keywords: 'admin panel, management console, secure database, catalog inputs',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  'privacy-policy': {
    title: 'Privacy Policy & Data Protections | gadgetsprohub',
    description: 'Learn about how gadgetsprohub handles user sign-in credentials, local preference data, and browser cache security with full procedural transparency.',
    keywords: 'privacy policy, safe browsing, data policy, terms, user safety',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  'about-us': {
    title: 'About Our Technical Affiliate Mission | gadgetsprohub',
    description: 'Learn about the professional research team behind gadgetsprohub, our rigorous specifications curation standard, and Tamil Nadu regional affiliate service.',
    keywords: 'about gadgetsprohub, tech affiliate, affiliate mission, our project',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  'terms-conditions': {
    title: 'Terms of Use & affiliate Agreements | gadgetsprohub',
    description: 'Understand the legal conditions, usage rules, and reference constraints governing your access to gadgetsprohub interactive tools.',
    keywords: 'terms of service, conditions of use, user agreement',
    ogType: 'website',
    ogImage: '/favicon.png'
  },
  disclaimer: {
    title: 'Affiliate Commissions & Review Disclaimer | gadgetsprohub',
    description: 'Full transparency disclosure concerning our affiliate links, advertising partners, and the objectivity of our product review ratings.',
    keywords: 'affiliate disclaimer, review transparency, commission disclosures',
    ogType: 'website',
    ogImage: '/favicon.png'
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
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', meta.ogImage);
  }
}
