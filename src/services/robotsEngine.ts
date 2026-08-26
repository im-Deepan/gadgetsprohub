/**
 * Robots.txt & Robots Core Engine
 * Standardized to RFC 9309 (Robots Exclusion Protocol Standard)
 * Designed for High-Performance SEO, Google-InspectionTool Compatibility,
 * AI Bot Management, Social Link Previews, and Faceted Crawl-Budget Optimization.
 */

export interface RobotsRuleGroup {
  userAgent: string | string[];
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
  cleanParam?: string[];
}

export interface RobotsOptions {
  host?: string;
  sitemaps?: string[];
  enableAiBots?: boolean;
  enableSeoAuditBots?: boolean;
  customRules?: RobotsRuleGroup[];
}

export interface RobotsValidationResult {
  userAgent: string;
  urlPath: string;
  allowed: boolean;
  matchingRule?: string;
  ruleType: 'allow' | 'disallow' | 'default-allow';
  reason: string;
}

/**
 * Default crawler definitions grouped by archetype and intent
 */
export const ROBOTS_CRAWLER_GROUPS = {
  // 1. Google Inspection & Search Engine Core
  googleInspection: [
    'Google-InspectionTool',
    'Googlebot',
    'Googlebot-Smartphone',
    'Googlebot-Image',
    'Googlebot-News',
    'Googlebot-Video',
    'Storebot-Google',
    'Mediapartners-Google',
    'AdsBot-Google',
    'FeedFetcher-Google',
    'APIs-Google'
  ],

  // 2. Global Major Search Engines
  majorSearchEngines: [
    'Bingbot',
    'msnbot',
    'DuckDuckBot',
    'YandexBot',
    'Baiduspider',
    'Slurp',
    'Applebot',
    'Sogou web spider',
    'Qwantify',
    'NaverBot'
  ],

  // 3. Social Media & Rich Preview Scrapers
  socialMediaBots: [
    'facebookexternalhit',
    'WhatsApp',
    'Twitterbot',
    'TelegramBot',
    'LinkedInBot',
    'Pinterestbot',
    'Discordbot',
    'Slackbot',
    'SkypeUriPreview'
  ],

  // 4. AI & LLM Assistants (Search & Training)
  aiAssistantBots: [
    'GPTBot',
    'ChatGPT-User',
    'PerplexityBot',
    'ClaudeBot',
    'anthropic-ai',
    'Google-Extended',
    'Amazonbot',
    'Bytespider',
    'cohere-ai',
    'CCBot'
  ],

  // 5. SEO Intelligence & Audit Crawlers
  seoAuditBots: [
    'Screaming Frog SEO Spider',
    'AhrefsBot',
    'SemrushBot',
    'DotBot',
    'MJ12bot',
    'SiteAuditBot'
  ]
};

/**
 * Standard public paths allowed across all crawlers
 */
export const STANDARD_ALLOWED_PATHS: string[] = [
  '/',
  '/products',
  '/product-detail/',
  '/blogs',
  '/blog-detail/',
  '/categories',
  '/deals',
  '/compare',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/faq',
  '/search',
  '/sitemap.xml',
  '/assets/',
  '/uploads/',
  '/*.js$',
  '/*.css$',
  '/*.png$',
  '/*.webp$',
  '/*.jpg$',
  '/*.jpeg$',
  '/*.svg$',
  '/*.ico$',
  '/*.json$',
  '/api/products',
  '/api/categories',
  '/api/blogs',
  '/api/deals',
  '/api/health-check',
  '/api/visit'
];

/**
 * Sensitive and crawl-waste paths disallowed for public catch-all bots
 */
export const STANDARD_DISALLOWED_PATHS: string[] = [
  '/admin',
  '/admin/',
  '/profile',
  '/login',
  '/register',
  '/auth/',
  '/api/admin/',
  '/api/auth/',
  '/api/telemetry/',
  '/api/metrics/',
  '/api/internal/',
  '/draft/',
  '/preview/',
  '/*?*sort=',
  '/*?*filter=',
  '/*?*session=',
  '/*?*token=',
  '/*?*preview='
];

/**
 * Generates an RFC 9309-compliant robots.txt text payload
 */
export function generateRobotsTxt(options: RobotsOptions = {}): string {
  const host = options.host || 'gadgetsprohub.onrender.com';
  const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const baseUrl = `https://${cleanHost}`;

  const defaultSitemaps = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap-products.xml`,
    `${baseUrl}/sitemap-blogs.xml`,
    `${baseUrl}/sitemap-categories.xml`,
    `${baseUrl}/sitemap-images.xml`,
    `${baseUrl}/sitemap-videos.xml`
  ];

  const sitemaps = options.sitemaps && options.sitemaps.length > 0 ? options.sitemaps : defaultSitemaps;

  const lines: string[] = [];

  // Header Notice
  lines.push('# =========================================================================');
  lines.push('# Robots.txt Specification for gadgetsprohub');
  lines.push('# RFC 9309 Compliant | Optimized for High Performance & Google Inspection');
  lines.push(`# Canonical Host: ${cleanHost}`);
  lines.push(`# Generated At: ${new Date().toISOString()}`);
  lines.push('# =========================================================================\n');

  // 1. Google Inspection Tool & Search Engine Core Bots
  lines.push('# 1. Google Inspection Tool, Mobile Smartphone & Search Engine Core');
  for (const bot of ROBOTS_CRAWLER_GROUPS.googleInspection) {
    lines.push(`User-agent: ${bot}`);
  }
  lines.push('Allow: /');
  lines.push('Allow: /assets/');
  lines.push('Allow: /uploads/');
  lines.push('Allow: /api/products');
  lines.push('Allow: /api/categories');
  lines.push('Allow: /api/blogs');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /api/admin/');
  lines.push('Disallow: /api/auth/');
  lines.push('');

  // 2. Global Major Search Engines (Bing, DuckDuckGo, Yandex, Baidu, Apple, etc.)
  lines.push('# 2. Global Search Engines (Bing, DuckDuckGo, Yandex, Baidu, Apple, etc.)');
  for (const bot of ROBOTS_CRAWLER_GROUPS.majorSearchEngines) {
    lines.push(`User-agent: ${bot}`);
  }
  lines.push('Allow: /');
  lines.push('Allow: /assets/');
  lines.push('Allow: /uploads/');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /api/admin/');
  lines.push('Disallow: /api/auth/');
  lines.push('');

  // 3. Social Media & Messaging OpenGraph Preview Bots
  lines.push('# 3. Social Media Platforms & Messaging Link Unfurlers (WhatsApp, Facebook, Twitter, Telegram)');
  for (const bot of ROBOTS_CRAWLER_GROUPS.socialMediaBots) {
    lines.push(`User-agent: ${bot}`);
  }
  lines.push('Allow: /');
  lines.push('Allow: /assets/');
  lines.push('Allow: /uploads/');
  lines.push('Allow: /og-banner.png');
  lines.push('Allow: /favicon.png');
  lines.push('Disallow: /admin/');
  lines.push('');

  // 4. AI & LLM Assistants (Search, Citations & AI Overviews)
  lines.push('# 4. AI Knowledge Bases, LLMs & Retrieval Engines (ChatGPT, Perplexity, Claude)');
  for (const bot of ROBOTS_CRAWLER_GROUPS.aiAssistantBots) {
    lines.push(`User-agent: ${bot}`);
  }
  if (options.enableAiBots !== false) {
    lines.push('Allow: /');
    lines.push('Allow: /products');
    lines.push('Allow: /product-detail/');
    lines.push('Allow: /blogs');
    lines.push('Allow: /blog-detail/');
    lines.push('Disallow: /admin/');
    lines.push('Disallow: /api/admin/');
    lines.push('Disallow: /api/auth/');
  } else {
    lines.push('Disallow: /');
  }
  lines.push('');

  // 5. SEO Intelligence & Audit Crawlers
  lines.push('# 5. SEO Diagnostic & Audit Crawlers (Screaming Frog, Ahrefs, Semrush)');
  for (const bot of ROBOTS_CRAWLER_GROUPS.seoAuditBots) {
    lines.push(`User-agent: ${bot}`);
  }
  lines.push('Allow: /');
  lines.push('Crawl-delay: 2');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /api/admin/');
  lines.push('Disallow: /api/auth/');
  lines.push('');

  // 6. Catch-All Directives for General Web Crawlers
  lines.push('# 6. General Catch-All Rules for All Other Web Crawlers');
  lines.push('User-agent: *');
  lines.push('Allow: /');
  lines.push('Allow: /assets/');
  lines.push('Allow: /uploads/');
  lines.push('Allow: /search');
  lines.push('Allow: /og-banner.png');
  lines.push('Allow: /favicon.png');
  lines.push('Allow: /api/products');
  lines.push('Allow: /api/categories');
  lines.push('Allow: /api/blogs');
  lines.push('Allow: /api/deals');
  lines.push('Allow: /api/visit');
  lines.push('Allow: /api/health-check');
  for (const pathDisallowed of STANDARD_DISALLOWED_PATHS) {
    lines.push(`Disallow: ${pathDisallowed}`);
  }
  lines.push('');

  // Sitemaps & Host declaration
  lines.push('# =========================================================================');
  lines.push('# Sitemaps & Host Index Declaration');
  lines.push('# =========================================================================');
  for (const sitemap of sitemaps) {
    lines.push(`Sitemap: ${sitemap}`);
  }
  lines.push(`Host: ${cleanHost}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Validates whether a target URL path is allowed for a specified User-Agent under given robots rules
 */
export function validateRobotsUrl(
  userAgent: string,
  urlPath: string,
  robotsTxtContent?: string
): RobotsValidationResult {
  const content = robotsTxtContent || generateRobotsTxt();
  const normalizedAgent = userAgent.trim().toLowerCase();
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;

  // Simple parsing of content blocks
  const blocks: Array<{ agents: string[]; allows: string[]; disallows: string[] }> = [];
  let currentBlock: { agents: string[]; allows: string[]; disallows: string[] } = {
    agents: [],
    allows: [],
    disallows: []
  };

  const lines = content.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === 'user-agent') {
      if (currentBlock.allows.length > 0 || currentBlock.disallows.length > 0) {
        blocks.push(currentBlock);
        currentBlock = { agents: [value.toLowerCase()], allows: [], disallows: [] };
      } else {
        currentBlock.agents.push(value.toLowerCase());
      }
    } else if (key === 'allow') {
      currentBlock.allows.push(value);
    } else if (key === 'disallow') {
      currentBlock.disallows.push(value);
    }
  }
  if (currentBlock.agents.length > 0) {
    blocks.push(currentBlock);
  }

  // Find most specific block matching the user agent
  let matchingBlock = blocks.find(b =>
    b.agents.some(a => a === normalizedAgent || (a !== '*' && normalizedAgent.includes(a)))
  );

  if (!matchingBlock) {
    matchingBlock = blocks.find(b => b.agents.includes('*'));
  }

  if (!matchingBlock) {
    return {
      userAgent,
      urlPath: normalizedPath,
      allowed: true,
      ruleType: 'default-allow',
      reason: 'No matching rule found in robots.txt. Defaulting to allow.'
    };
  }

  // Helper to match path pattern (supports wildcard *)
  const matchesPattern = (pattern: string, path: string) => {
    if (!pattern) return false;
    if (pattern === '/') return true;
    const regexPattern = '^' + pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\$$/, '$');
    try {
      const regex = new RegExp(regexPattern);
      return regex.test(path);
    } catch {
      return path.startsWith(pattern);
    }
  };

  // Longest matching rule wins (standard RFC 9309 rule precedence)
  let longestMatch: { type: 'allow' | 'disallow'; pattern: string; length: number } | null = null;

  for (const allow of matchingBlock.allows) {
    if (matchesPattern(allow, normalizedPath)) {
      if (!longestMatch || allow.length >= longestMatch.length) {
        longestMatch = { type: 'allow', pattern: allow, length: allow.length };
      }
    }
  }

  for (const disallow of matchingBlock.disallows) {
    if (matchesPattern(disallow, normalizedPath)) {
      if (!longestMatch || disallow.length > longestMatch.length) {
        longestMatch = { type: 'disallow', pattern: disallow, length: disallow.length };
      }
    }
  }

  if (longestMatch) {
    return {
      userAgent,
      urlPath: normalizedPath,
      allowed: longestMatch.type === 'allow',
      matchingRule: `${longestMatch.type.toUpperCase()}: ${longestMatch.pattern}`,
      ruleType: longestMatch.type,
      reason: `Matched specific directive "${longestMatch.type.toUpperCase()}: ${longestMatch.pattern}" for agent "${userAgent}"`
    };
  }

  return {
    userAgent,
    urlPath: normalizedPath,
    allowed: true,
    ruleType: 'default-allow',
    reason: `Allowed by default under agent block [${matchingBlock.agents.join(', ')}]`
  };
}
