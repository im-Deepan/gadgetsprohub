import mongoose from 'mongoose';
import { GoogleGenAI, Type } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

export interface SeoMetadataPayload {
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  focusKeyword?: string;
  secondaryKeywords?: string[];
  canonicalUrl?: string;
  robotsMeta?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
  twitterCard?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
}

export interface ReadabilityReport {
  score: number; // 0-100
  gradeLevel: string;
  passiveVoicePercentage: number;
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  keywordDensity: number;
  suggestions: string[];
}

export interface InternalLinkRecommendation {
  targetProductId: string;
  name: string;
  slug: string;
  confidence: number; // 0-100
  anchorText: string;
  relationType: 'category' | 'brand' | 'complementary' | 'similar';
}

export class SeoService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    this.initGemini();
  }

  private initGemini() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  /**
   * Generates a slug from standard text (e.g., product name).
   * Removes standard English stop words for SEO.
   */
  public generateSeoSlug(text: string): string {
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from',
      'by', 'with', 'in', 'out', 'of', 'about', 'is', 'am', 'are', 'was', 'were', 'be', 'been'
    ]);

    let cleanText = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, ' ');    // Collapse whitespaces

    const words = cleanText.split(' ').filter(word => word.length > 0);
    const filteredWords = words.filter(word => !stopWords.has(word));

    // Fallback if stop word filtering leaves it empty
    const resultWords = filteredWords.length > 0 ? filteredWords : words;

    return resultWords.slice(0, 8).join('-'); // Limit to 8 words for slug simplicity
  }

  public generateSeoSlog(text: string): string {
    return this.generateSeoSlug(text);
  }

  /**
   * Creates a 301 Redirect Rule if the product's slug has changed.
   */
  public async handleSlugChange(oldSlug: string, newSlug: string) {
    if (!oldSlug || !newSlug || oldSlug === newSlug) return;

    const RedirectRule = mongoose.model('RedirectRule');
    const source = `/product/${oldSlug}`;
    const target = `/product/${newSlug}`;

    // Ensure we don't create circular redirects
    await RedirectRule.deleteMany({ sourceUrl: target });

    // Update or create redirect rule
    await RedirectRule.findOneAndUpdate(
      { sourceUrl: source },
      { targetUrl: target, type: 301, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }

  /**
   * Analyzes text readability and keyword density.
   */
  public analyzeReadability(text: string, focusKeyword: string = ''): ReadabilityReport {
    if (!text || text.trim().length === 0) {
      return {
        score: 0,
        gradeLevel: 'N/A',
        passiveVoicePercentage: 0,
        wordCount: 0,
        sentenceCount: 0,
        avgSentenceLength: 0,
        keywordDensity: 0,
        suggestions: ['Content is empty. Please add product description.']
      };
    }

    // Basic string cleaning
    const words = text.toLowerCase().match(/\b[a-z0-9']+\b/g) || [];
    const wordCount = words.length;

    // Sentence splitting by punctuation
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length || 1;

    const avgSentenceLength = wordCount / sentenceCount;

    // Heuristic passive voice detection (e.g. "is done", "was bought", "were shipped")
    const passiveWords = ['is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'get', 'got', 'gets', 'getting'];
    const pastParticipleSuffix = ['ed', 'en']; // Basic heuristic suffixes
    let passiveMatches = 0;

    for (let i = 0; i < words.length - 1; i++) {
      if (passiveWords.includes(words[i])) {
        const nextWord = words[i+1];
        const isPastParticipleHeuristic = pastParticipleSuffix.some(suffix => nextWord.endsWith(suffix)) ||
          ['bought', 'taken', 'made', 'done', 'built', 'sold', 'chosen', 'written'].includes(nextWord);
        if (isPastParticipleHeuristic) {
          passiveMatches++;
        }
      }
    }

    const passiveVoicePercentage = wordCount > 0 ? Math.round((passiveMatches / wordCount) * 100) : 0;

    // Keyword density
    let keywordDensity = 0;
    if (focusKeyword && focusKeyword.trim().length > 0) {
      const keywordLower = focusKeyword.toLowerCase().trim();
      const occurrences = (text.toLowerCase().match(new RegExp(this.escapeRegExp(keywordLower), 'g')) || []).length;
      // Also split focus keyword by space and check individual word count ratio
      const keywordWordCount = keywordLower.split(/\s+/).length;
      keywordDensity = wordCount > 0 ? Number(((occurrences * keywordWordCount) / wordCount * 100).toFixed(2)) : 0;
    }

    // Flesch Reading Ease score simulation (approximated)
    // Formula: 206.835 - 1.015 * (avgSentenceLength) - 84.6 * (syllables per word)
    // We'll estimate syllables per word: avg word length in letters / 3 as a simple heuristic
    let totalLetters = words.reduce((acc, w) => acc + w.length, 0);
    const avgWordLength = wordCount > 0 ? totalLetters / wordCount : 5;
    const estimatedSyllablesPerWord = Math.max(1, avgWordLength / 2.8);

    let score = Math.round(206.835 - 1.015 * avgSentenceLength - 84.6 * estimatedSyllablesPerWord);
    score = Math.max(0, Math.min(100, score));

    // Map score to Grade Level
    let gradeLevel = 'Graduate';
    if (score > 90) gradeLevel = '5th Grade';
    else if (score > 80) gradeLevel = '6th Grade';
    else if (score > 70) gradeLevel = '7th Grade';
    else if (score > 60) gradeLevel = '8th & 9th Grade';
    else if (score > 50) gradeLevel = '10th to 12th Grade';
    else if (score > 30) gradeLevel = 'College';

    const suggestions: string[] = [];
    if (avgSentenceLength > 20) {
      suggestions.push('Sentences are too long. Try splitting complex sentences into smaller ones.');
    }
    if (passiveVoicePercentage > 15) {
      suggestions.push(`High passive voice usage (${passiveVoicePercentage}%). Use active verbs for engaging copywriting.`);
    }
    if (keywordDensity < 1 && focusKeyword) {
      suggestions.push(`Keyword density is low (${keywordDensity}%). Consider using "${focusKeyword}" more naturally throughout the text.`);
    } else if (keywordDensity > 3.5 && focusKeyword) {
      suggestions.push(`Keyword stuffing detected (${keywordDensity}%). Reduce focus keyword count to avoid search penalty.`);
    }
    if (wordCount < 300) {
      suggestions.push('Description word count is short. Expand to 300+ words to improve search index relevance.');
    }

    return {
      score,
      gradeLevel,
      passiveVoicePercentage,
      wordCount,
      sentenceCount,
      avgSentenceLength,
      keywordDensity,
      suggestions
    };
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Evaluates the SEO Score of a Product.
   */
  public async calculateSeoScore(product: any): Promise<{ score: number; suggestions: string[] }> {
    const suggestions: string[] = [];
    let score = 0;

    // 1. Title Length Check (ideal 50-60 chars)
    const title = product.seoTitle || product.name || '';
    if (title.length >= 50 && title.length <= 65) {
      score += 15;
    } else if (title.length > 0) {
      score += 8;
      suggestions.push(`SEO Title is ${title.length} characters. Aim for the 50-65 character ideal length.`);
    } else {
      suggestions.push('SEO Title is missing. Generate a custom optimized title.');
    }

    // 2. Meta Description Length Check (ideal 120-160 chars)
    const desc = product.seoDescription || product.description || '';
    if (desc.length >= 120 && desc.length <= 160) {
      score += 15;
    } else if (desc.length > 0) {
      score += 8;
      suggestions.push(`Meta Description is ${desc.length} characters. Keep it between 120-160 characters.`);
    } else {
      suggestions.push('Meta Description is missing. Write an enticing search snippet.');
    }

    // 3. Focus Keyword Usage
    const focus = product.focusKeyword || '';
    if (focus && focus.trim().length > 0) {
      score += 10;
      const focusLower = focus.toLowerCase();

      // In title
      if (title.toLowerCase().includes(focusLower)) {
        score += 15;
      } else {
        suggestions.push(`Include your Focus Keyword "${focus}" near the beginning of your SEO Title.`);
      }

      // In Meta Description
      if (desc.toLowerCase().includes(focusLower)) {
        score += 15;
      } else {
        suggestions.push(`Include your Focus Keyword "${focus}" in the first 120 characters of your Meta Description.`);
      }

      // In Slug/URL
      const slug = product.slug || '';
      if (slug.toLowerCase().includes(focusLower.replace(/\s+/g, '-'))) {
        score += 10;
      } else {
        suggestions.push(`Include your Focus Keyword "${focus}" in your URL slug.`);
      }
    } else {
      suggestions.push('Set a Focus Keyword to target high-intent buying queries.');
    }

    // 4. Image ALT coverage
    const images = product.images || [];
    if (images.length > 0) {
      score += 5;
      // Standard alt attribute check is done on frontend, but we allocate points here
      score += 5; 
    } else {
      suggestions.push('No product images found. Image optimization is crucial for Google Images visibility.');
    }

    // 5. Heading & HTML hierarchy
    const longDesc = product.longDescription || '';
    if (longDesc.includes('<h2>') || longDesc.includes('<h3>') || longDesc.includes('##') || longDesc.includes('###')) {
      score += 10;
    } else if (longDesc.length > 0) {
      suggestions.push('Use structured headings (H2/H3 tags) in your long description to break up reading sections.');
    }

    // 6. FAQs presence
    const faqs = product.faqs || [];
    if (faqs.length > 0) {
      score += 10;
    } else {
      suggestions.push('Add FAQs with structured schema to win rich answer card snippets in search results.');
    }

    const finalScore = Math.max(0, Math.min(100, score));

    // Audit History Logging
    try {
      const SeoAuditHistory = mongoose.model('SeoAuditHistory');
      await SeoAuditHistory.create({
        productId: product._id,
        score: finalScore,
        auditDate: new Date(),
        suggestions,
        details: {
          titleLength: title.length,
          descLength: desc.length,
          focusKeywordSet: !!focus,
          faqCount: faqs.length
        }
      });
    } catch (e) {
      // Ignore background auditing failure
    }

    return { score: finalScore, suggestions };
  }

  /**
   * Generates Schema.org JSON-LD Structured Data
   */
  public generateStructuredData(product: any, categoryName: string = ''): Record<string, any> {
    const siteUrl = process.env.SITE_URL || 'https://gadgetsprohub.com';
    const productUrl = `${siteUrl}/product/${product.slug}`;
    const images = (product.images || []).map((img: string) => img.startsWith('http') ? img : `${siteUrl}${img}`);

    // Create the core Product Schema
    const schema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'id': productUrl,
      'name': product.name,
      'image': images,
      'description': product.seoDescription || product.description,
      'sku': product.sku || product.asin,
      'mpn': product.asin,
      'brand': {
        '@type': 'Brand',
        'name': product.brand || 'Generic'
      }
    };

    // Aggregate rating if available
    if (product.totalReviews > 0) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        'ratingValue': product.rating || 4.5,
        'reviewCount': product.totalReviews || 1,
        'bestRating': '5',
        'worstRating': '1'
      };
    }

    // Offers (Affiliate Offer)
    schema.offers = {
      '@type': 'Offer',
      'url': product.affiliateLink,
      'priceCurrency': 'USD',
      'price': product.price,
      'itemCondition': 'https://schema.org/NewCondition',
      'availability': product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'seller': {
        '@type': 'Organization',
        'name': 'Amazon'
      }
    };

    // Breadcrumb list schema
    const breadcrumbItems = [];
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': 1,
      'name': 'Home',
      'item': siteUrl
    });

    if (categoryName) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        'position': 2,
        'name': categoryName,
        'item': `${siteUrl}/category/${this.generateSeoSlug(categoryName)}`
      });
    }

    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': categoryName ? 3 : 2,
      'name': product.name,
      'item': productUrl
    });

    schema.breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': breadcrumbItems
    };

    // FAQ Page Schema if available
    const faqs = product.faqs || [];
    if (faqs.length > 0) {
      schema.faqPage = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faqs.map((faq: any) => ({
          '@type': 'Question',
          'name': faq.question,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.answer
          }
        }))
      };
    }

    return schema;
  }

  /**
   * Internal Linking Recommendation Engine.
   * Scores and returns products that would serve as good internal link targets.
   */
  public async getInternalLinkRecommendations(product: any, limit: number = 5): Promise<InternalLinkRecommendation[]> {
    const Product = mongoose.model('Product');
    const targetProducts = await Product.find({
      _id: { $ne: product._id },
      publishingStatus: 'published'
    }).limit(50);

    const recommendations: InternalLinkRecommendation[] = [];

    for (const p of targetProducts) {
      let confidence = 0;
      let relationType: 'category' | 'brand' | 'complementary' | 'similar' = 'category';
      let anchorText = `Check out the ${p.name}`;

      // 1. Same Subcategory or Category
      if (String(p.category) === String(product.category)) {
        confidence += 40;
        relationType = 'similar';
        anchorText = `similar ${p.brand || ''} items`;
      }

      // 2. Same Brand
      if (p.brand && product.brand && p.brand.toLowerCase() === product.brand.toLowerCase()) {
        confidence += 30;
        relationType = 'brand';
        anchorText = `other ${p.brand} devices`;
      }

      // 3. Shared Tags
      const sharedTags = (p.tags || []).filter((tag: string) => (product.tags || []).includes(tag));
      confidence += sharedTags.length * 10;

      // 4. Complementary Keyword Heuristic
      const targetKeywords = p.seoKeywords || [];
      const hasComplementary = targetKeywords.some((k: string) =>
        product.description?.toLowerCase().includes(k.toLowerCase()) ||
        product.name.toLowerCase().includes(k.toLowerCase())
      );
      if (hasComplementary) {
        confidence += 20;
        relationType = 'complementary';
        anchorText = `complementary ${p.name}`;
      }

      if (confidence > 0) {
        recommendations.push({
          targetProductId: p._id.toString(),
          name: p.name,
          slug: p.slug,
          confidence: Math.min(100, confidence),
          anchorText,
          relationType
        });
      }
    }

    // Sort by confidence descending
    return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
  }

  /**
   * AI SEO Assistant: Generates high-intent SEO metadata & copy.
   */
  public async generateAiSeoContent(payload: {
    productName: string;
    description: string;
    brand?: string;
    category?: string;
    keywords?: string[];
  }): Promise<{
    seoTitle: string;
    seoDescription: string;
    focusKeyword: string;
    secondaryKeywords: string[];
    productIntro: string;
    buyingSummary: string;
    ctaSection: string;
    faqs: { question: string; answer: string; category: string }[];
  }> {
    if (!this.ai) {
      // Fallback simple mock generator if GEMINI_API_KEY is not configured
      const focus = this.generateSeoSlug(payload.productName).split('-').slice(0, 3).join(' ');
      return {
        seoTitle: `Best ${payload.productName} Review & Guide (${new Date().getFullYear()})`,
        seoDescription: `Read our comprehensive hands-on expert analysis of the ${payload.productName} by ${payload.brand || 'experts'}. Check the latest pricing, benefits, and specifications here!`,
        focusKeyword: focus,
        secondaryKeywords: [payload.brand || 'review', 'buy online', 'top affiliate product'],
        productIntro: `Welcome to our in-depth showcase of the ${payload.productName}. If you're searching for premium quality and outstanding reliability, this review serves as your ultimate guide.`,
        buyingSummary: `The ${payload.productName} stands out for its great value, outstanding performance, and durable materials, making it a stellar purchase for any enthusiast.`,
        ctaSection: `Don't miss the current promotional discounts! Click below to view the latest live deals on Amazon.`,
        faqs: [
          { question: `Is the ${payload.productName} durable?`, answer: `Yes, built from high-grade materials to ensure long-term durability.`, category: 'Usage' },
          { question: `What is the warranty policy?`, answer: `Standard manufacturer warranties apply. Check Amazon listing details.`, category: 'Warranty' }
        ]
      };
    }

    const keywordsPrompt = payload.keywords && payload.keywords.length > 0 ? `Include these target keywords if possible: ${payload.keywords.join(', ')}` : '';

    const prompt = `
      You are an elite Amazon Affiliate SEO Content Copywriter. Your goal is to generate high-converting, Google-optimized SEO metadata and rich body copywriting sections for the following product:
      - Product Name: ${payload.productName}
      - Brand: ${payload.brand || 'N/A'}
      - Category: ${payload.category || 'N/A'}
      - Basic Description: ${payload.description}
      ${keywordsPrompt}

      Please analyze the product and generate:
      1. A highly optimized SEO Title (ideal length: 50-65 chars) targeting purchasing intent.
      2. An enticing Meta Description (ideal length: 120-160 chars) with a compelling call-to-action.
      3. A single high-volume Focus Keyword (2-4 words).
      4. Three highly relevant Secondary Keywords.
      5. A captivating introductory paragraph (Product Introduction) of about 70-100 words.
      6. A "Buying Intent Summary" highlighting why this product is a must-buy (1-2 sentences).
      7. A powerful CTA (Call-to-Action) section to drive clicks on the affiliate link.
      8. A list of 3 structured FAQs (Question, Answer, Category) matching actual buyer searches.

      You must return your output strictly in JSON format as specified in this JSON Schema:
      {
        "seoTitle": "string",
        "seoDescription": "string",
        "focusKeyword": "string",
        "secondaryKeywords": ["string"],
        "productIntro": "string",
        "buyingSummary": "string",
        "ctaSection": "string",
        "faqs": [
          {
            "question": "string",
            "answer": "string",
            "category": "string"
          }
        ]
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              seoTitle: { type: Type.STRING },
              seoDescription: { type: Type.STRING },
              focusKeyword: { type: Type.STRING },
              secondaryKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              productIntro: { type: Type.STRING },
              buyingSummary: { type: Type.STRING },
              ctaSection: { type: Type.STRING },
              faqs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING },
                    category: { type: Type.STRING }
                  },
                  required: ['question', 'answer', 'category']
                }
              }
            },
            required: ['seoTitle', 'seoDescription', 'focusKeyword', 'secondaryKeywords', 'productIntro', 'buyingSummary', 'ctaSection', 'faqs']
          }
        }
      });

      const text = response.text || '';
      return JSON.parse(text);
    } catch (error: any) {
      console.error('Gemini AI SEO Assistant generation error:', error.message);
      throw error;
    }
  }

  /**
   * Scans descriptions/links in products for broken links or issues.
   */
  public async scanForBrokenAssets(product: any): Promise<{ brokenLinks: string[]; missingAlts: boolean }> {
    const brokenLinks: string[] = [];
    let missingAlts = false;

    // Scan for external links inside description or specifications
    const description = product.longDescription || product.description || '';
    const urlRegex = /href=["'](https?:\/\/[^"']+)["']/g;
    let match;

    while ((match = urlRegex.exec(description)) !== null) {
      const link = match[1];
      if (link.includes('amazon') || link.includes('amzn.to')) {
        // Amazon links are assumed active, but we could flag bad structures
        continue;
      }
      // Simple format check (we can expand to a HEAD request check if needed)
      if (link.includes('broken') || link.includes('example.com/bad')) {
        brokenLinks.push(link);
      }
    }

    // Heuristically check if images lack alt descriptions or are empty
    if (!product.images || product.images.length === 0) {
      missingAlts = true;
    }

    return { brokenLinks, missingAlts };
  }

  /**
   * Generates a standard XML sitemap file with incremental additions.
   */
  public async buildXmlSitemap(req?: any, localProducts?: any[], localBlogs?: any[]): Promise<string> {
    const isMongoConnected = mongoose.connection.readyState === 1;
    let productsList: any[] = [];
    let blogsList: any[] = [];
    let categoriesList: any[] = [];

    const siteUrl = process.env.SITE_URL || process.env.APP_URL || (req ? `${req.headers['x-forwarded-proto'] || req.protocol || 'https'}://${req.get('host') || 'gadgetsprohub.com'}` : 'https://gadgetsprohub.com');

    if (isMongoConnected) {
      try {
        const Product = mongoose.model('Product');
        const Category = mongoose.model('Category');
        const Blog = mongoose.model('Blog');
        
        productsList = await Product.find({}, 'slug updatedAt createdAt').lean();
        blogsList = await Blog.find({ published: true }, 'slug updatedAt createdAt').lean();
        categoriesList = await Category.find({}, 'slug').lean();

        // Also update SitemapRecord cache if we want to retain it
        const SitemapRecord = mongoose.model('SitemapRecord');
        await SitemapRecord.deleteMany({});
        // Rebuild cache for records
        for (const url of ['', '/about', '/contact', '/blog']) {
          await SitemapRecord.create({
            loc: `${siteUrl}${url}`,
            priority: url === '' ? 1.0 : 0.5,
            changefreq: 'weekly',
            type: 'static'
          });
        }
        for (const cat of categoriesList) {
          await SitemapRecord.create({
            loc: `${siteUrl}/category/${cat.slug}`,
            priority: 0.7,
            changefreq: 'daily',
            type: 'category'
          });
        }
        for (const p of productsList) {
          await SitemapRecord.create({
            loc: `${siteUrl}/product/${p.slug}`,
            priority: 0.8,
            changefreq: 'daily',
            lastmod: p.updatedAt || p.createdAt,
            type: 'product'
          });
        }
        for (const b of blogsList) {
          await SitemapRecord.create({
            loc: `${siteUrl}/blog/${b.slug}`,
            priority: 0.7,
            changefreq: 'weekly',
            lastmod: b.updatedAt || b.createdAt,
            type: 'blog'
          });
        }
      } catch (err: any) {
        console.warn('Failed to sync SitemapRecord cache:', err.message);
      }
    }
    
    if (productsList.length === 0 && (localProducts || []).length > 0) {
      productsList = (localProducts || []).map((p: any) => ({
        slug: p.slug,
        updatedAt: p.updatedAt || p.createdAt || new Date(),
      }));
    }
    if (blogsList.length === 0 && (localBlogs || []).length > 0) {
      blogsList = (localBlogs || []).map((b: any) => ({
        slug: b.slug,
        updatedAt: b.updatedAt || b.createdAt || new Date(),
      }));
    }
    if (categoriesList.length === 0) {
      const catsSet = new Set<string>();
      (localProducts || []).forEach((p: any) => {
        if (p.categorySlug) catsSet.add(p.categorySlug);
        else if (p.category?.slug) catsSet.add(p.category.slug);
      });
      categoriesList = Array.from(catsSet).map(slug => ({ slug }));
    }

    const staticUrls = [
      { path: '', changefreq: 'daily', priority: '1.0' },
      { path: 'products', changefreq: 'daily', priority: '0.9' },
      { path: 'blogs', changefreq: 'weekly', priority: '0.8' },
      { path: 'contact', changefreq: 'monthly', priority: '0.6' },
      { path: 'about-us', changefreq: 'monthly', priority: '0.5' },
      { path: 'privacy-policy', changefreq: 'monthly', priority: '0.4' },
      { path: 'terms-conditions', changefreq: 'monthly', priority: '0.4' },
      { path: 'disclaimer', changefreq: 'monthly', priority: '0.4' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    const todayStr = new Date().toISOString().split('T')[0];

    // Static pages
    for (const item of staticUrls) {
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}/${item.path}</loc>\n`;
      xml += `    <lastmod>${todayStr}</lastmod>\n`;
      xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
      xml += `    <priority>${item.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic Categories
    for (const cat of categoriesList) {
      if (!cat.slug) continue;
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}/category/${cat.slug}</loc>\n`;
      xml += `    <lastmod>${todayStr}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic products
    for (const prod of productsList) {
      if (!prod.slug) continue;
      const dateVal = prod.updatedAt || prod.createdAt || new Date();
      let dateStr = todayStr;
      try {
        dateStr = new Date(dateVal).toISOString().split('T')[0];
      } catch (err) {
        dateStr = todayStr;
      }
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}/product-detail/${prod.slug}</loc>\n`;
      xml += `    <lastmod>${dateStr}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic blogs
    for (const blog of blogsList) {
      if (!blog.slug) continue;
      const dateVal = blog.updatedAt || blog.createdAt || new Date();
      let dateStr = todayStr;
      try {
        dateStr = new Date(dateVal).toISOString().split('T')[0];
      } catch (err) {
        dateStr = todayStr;
      }
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}/blog-detail/${blog.slug}</loc>\n`;
      xml += `    <lastmod>${dateStr}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    // Save sitemap file to public folder so search engines can read it directly
    const publicSitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    try {
      const dir = path.dirname(publicSitemapPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(publicSitemapPath, xml, 'utf8');
    } catch (err: any) {
      console.warn('Failed to write sitemap.xml to disk:', err.message);
    }

    return xml;
  }
}

export const seoService = new SeoService();
