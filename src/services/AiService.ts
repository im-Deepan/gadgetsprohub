import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import * as crypto from 'crypto';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type AiProviderType = 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'ollama' | 'lmstudio' | 'azure';

export interface ProviderConfig {
  provider: AiProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  retryAttempts?: number;
}

export interface PromptTemplate {
  name: string;
  key: string;
  category: string;
  promptText: string;
  systemInstruction?: string;
  variables: string[];
  version: number;
  isActive: boolean;
  history: Array<{
    version: number;
    promptText: string;
    systemInstruction?: string;
    updatedBy: string;
    updatedAt: Date;
  }>;
}

export interface ContentQualityReport {
  overallScore: number; // 0 - 100
  readability: {
    score: number;
    gradeLevel: string;
    wordCount: number;
  };
  uniqueness: {
    score: number; // 0 - 100
    duplicatePhrases: string[];
  };
  keywordCoverage: {
    score: number;
    matchedKeywords: string[];
    densityPercentage: number;
  };
  safetyValidation: {
    passed: boolean;
    issues: string[];
    offensiveFlag: boolean;
    emptyFlag: boolean;
    hallucinationFlag: boolean;
  };
}

// ==========================================
// MONGOOSE SCHEMAS & MODELS
// ==========================================

const aiPromptSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true, index: true },
  category: { type: String, required: true, index: true },
  promptText: { type: String, required: true },
  systemInstruction: { type: String },
  variables: [String],
  version: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  history: [{
    version: { type: Number, required: true },
    promptText: { type: String, required: true },
    systemInstruction: { type: String },
    updatedBy: { type: String, default: 'admin' },
    updatedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const aiProviderSettingSchema = new mongoose.Schema({
  provider: { type: String, required: true, unique: true, index: true },
  encryptedApiKey: { type: String },
  baseUrl: { type: String },
  model: { type: String, required: true },
  temperature: { type: Number, default: 0.7 },
  maxTokens: { type: Number, default: 2048 },
  topP: { type: Number, default: 0.95 },
  frequencyPenalty: { type: Number, default: 0 },
  presencePenalty: { type: Number, default: 0 },
  timeout: { type: Number, default: 30000 },
  retryAttempts: { type: Number, default: 3 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const aiCacheSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true, index: true },
  prompt: { type: String, required: true },
  provider: { type: String, required: true },
  model: { type: String, required: true },
  response: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

const aiJobSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., 'batch_enrich', 'rewrite_catalog'
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  category: { type: String },
  promptKey: { type: String },
  provider: { type: String },
  model: { type: String },
  status: { 
    type: String, 
    enum: ['waiting', 'running', 'completed', 'failed', 'paused', 'cancelled'], 
    default: 'waiting',
    index: true
  },
  progress: { type: Number, default: 0 }, // percentage
  total: { type: Number, default: 0 },
  processed: { type: Number, default: 0 },
  workerId: { type: String },
  error: { type: String },
  results: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    status: { type: String },
    error: { type: String },
    responseId: { type: mongoose.Schema.Types.ObjectId, ref: 'AiResponse' }
  }]
}, { timestamps: true });

const aiResponseSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
  promptKey: { type: String, required: true, index: true },
  provider: { type: String, required: true },
  model: { type: String, required: true },
  promptUsed: { type: String, required: true },
  generatedText: { type: String, required: true },
  version: { type: Number, default: 1 },
  qualityScore: { type: Number, default: 100 },
  qualityMetrics: { type: mongoose.Schema.Types.Mixed },
  safetyValidation: { type: mongoose.Schema.Types.Mixed },
  approvalStatus: { 
    type: String, 
    enum: ['generated', 'pending_review', 'approved', 'rejected', 'published', 'archived'], 
    default: 'generated',
    index: true
  },
  approvalHistory: [{
    status: { type: String, required: true },
    changedBy: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    notes: { type: String }
  }]
}, { timestamps: true });

const aiAnalyticsSchema = new mongoose.Schema({
  provider: { type: String, required: true, index: true },
  model: { type: String, required: true, index: true },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  estimatedCost: { type: Number, default: 0 },
  responseTimeMs: { type: Number, default: 0 },
  status: { type: String, enum: ['success', 'failed'], required: true },
  cached: { type: Boolean, default: false },
  error: { type: String }
}, { timestamps: true });

// Prevent overwrite errors on reload/dev mode
export const AiPrompt = mongoose.models.AiPrompt || mongoose.model('AiPrompt', aiPromptSchema);
export const AiProviderSetting = mongoose.models.AiProviderSetting || mongoose.model('AiProviderSetting', aiProviderSettingSchema);
export const AiCache = mongoose.models.AiCache || mongoose.model('AiCache', aiCacheSchema);
export const AiJob = mongoose.models.AiJob || mongoose.model('AiJob', aiJobSchema);
export const AiResponse = mongoose.models.AiResponse || mongoose.model('AiResponse', aiResponseSchema);
export const AiAnalytics = mongoose.models.AiAnalytics || mongoose.model('AiAnalytics', aiAnalyticsSchema);

// ==========================================
// CORE AI SERVICE
// ==========================================

export class AiService {
  private encryptionKey: Buffer;
  private ivLength = 16;
  private defaultProvider: AiProviderType = 'gemini';
  private defaultModelMap: Record<AiProviderType, string> = {
    gemini: 'gemini-3.5-flash',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-haiku-latest',
    openrouter: 'meta-llama/llama-3-70b-instruct',
    ollama: 'llama3',
    lmstudio: 'meta-llama-3-8b-instruct',
    azure: 'gpt-4'
  };

  constructor() {
    // Decouple API key encryption from JWT_SECRET to prevent token rotation from destroying database keys.
    const secret = process.env.AI_KEY_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'a-very-secure-enterprise-32-byte-secret-key-phrase';
    this.encryptionKey = crypto.scryptSync(secret, 'salt-enterprise-affiliate-ai', 32);
  }

  // ==========================================
  // ENCRYPTION HELPERS (API Keys security)
  // ==========================================

  public encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  public decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) return '';
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return '';
    }
  }

  // ==========================================
  // PROVIDER CONFIG MANAGEMENT
  // ==========================================

  public async getProviderSettings(provider: AiProviderType): Promise<any> {
    let settings = await AiProviderSetting.findOne({ provider });
    if (!settings) {
      // Return default un-saved configuration
      return {
        provider,
        model: this.defaultModelMap[provider],
        temperature: 0.7,
        maxTokens: 2048,
        topP: 0.95,
        isActive: false
      };
    }
    const raw = settings.toObject();
    if (raw.encryptedApiKey) {
      raw.apiKey = this.decrypt(raw.encryptedApiKey);
    }
    return raw;
  }

  public async saveProviderSettings(provider: AiProviderType, data: any): Promise<any> {
    const updateData: any = {
      model: data.model || this.defaultModelMap[provider],
      baseUrl: data.baseUrl,
      temperature: data.temperature ?? 0.7,
      maxTokens: data.maxTokens ?? 2048,
      topP: data.topP ?? 0.95,
      frequencyPenalty: data.frequencyPenalty ?? 0,
      presencePenalty: data.presencePenalty ?? 0,
      timeout: data.timeout ?? 30000,
      retryAttempts: data.retryAttempts ?? 3,
      isActive: data.isActive ?? true
    };

    if (data.apiKey) {
      updateData.encryptedApiKey = this.encrypt(data.apiKey);
    }

    const doc = await AiProviderSetting.findOneAndUpdate(
      { provider },
      updateData,
      { upsert: true, new: true }
    );
    return doc;
  }

  public async getActiveProvider(): Promise<any> {
    const activeProviders = await AiProviderSetting.find({ isActive: true });
    if (activeProviders.length > 0) {
      // Prefer Gemini, then OpenAI, then Anthropic
      const preferredOrder: AiProviderType[] = ['gemini', 'openai', 'anthropic', 'openrouter', 'ollama', 'lmstudio', 'azure'];
      for (const pref of preferredOrder) {
        const found = activeProviders.find(p => p.provider === pref);
        if (found) {
          const raw = found.toObject();
          if (raw.encryptedApiKey) raw.apiKey = this.decrypt(raw.encryptedApiKey);
          return raw;
        }
      }
      const first = activeProviders[0].toObject();
      if (first.encryptedApiKey) first.apiKey = this.decrypt(first.encryptedApiKey);
      return first;
    }

    // Default Fallback
    return {
      provider: 'gemini',
      model: 'gemini-3.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.95,
      isActive: true
    };
  }

  // ==========================================
  // PROMPT MANAGEMENT
  // ==========================================

  public async seedPrompts(): Promise<void> {
    const defaultPrompts = [
      {
        name: 'Product Long Description',
        key: 'product_long_description',
        category: 'Descriptions',
        systemInstruction: 'You are an elite Amazon Affiliate marketing copywriter. Create beautiful, engaging, and rich search-optimized descriptions.',
        promptText: 'Write a comprehensive, engaging SEO optimized long description for the product "{productName}".\n\nAbout this item details:\n{amazonDescription}\n\nKey features to highlight:\n{amazonFeatures}\n\nFocus on benefits, real-world utility, and incorporate the focus keyword "{focusKeyword}" naturally. Use rich markdown structure.',
        variables: ['productName', 'amazonDescription', 'amazonFeatures', 'focusKeyword']
      },
      {
        name: 'Buying Guide',
        key: 'buying_guide',
        category: 'Guides',
        systemInstruction: 'You are an objective shopping advisor helping buyers make informed purchasing choices.',
        promptText: 'Generate an intelligent shopping buying guide for "{productName}".\n\nInclude the following sections:\n1. Who should buy this product\n2. Who should avoid it\n3. Unique advantages & core limitations\n4. Expert usage recommendations\n5. Direct alternative recommendations.',
        variables: ['productName']
      },
      {
        name: 'Editorial Review',
        key: 'editorial_review',
        category: 'Reviews',
        systemInstruction: 'You are an expert editor conducting an exhaustive product teardown.',
        promptText: 'Create a high-integrity hands-on style editorial review for "{productName}" in "{category}".\n\nUse this data as context:\n{amazonDescription}\n\nInclude section headings, specification analysis, real-life scenario simulations, pros/cons, and a final verdict out of 10.',
        variables: ['productName', 'category', 'amazonDescription']
      },
      {
        name: 'Pros & Cons',
        key: 'pros_cons',
        category: 'Metadata',
        systemInstruction: 'Provide clean, factual, bulleted summaries of pros and cons.',
        promptText: 'Analyze "{productName}" details: {amazonDescription}.\n\nReturn exactly 5 robust Pros and 3 genuine Cons in markdown format.',
        variables: ['productName', 'amazonDescription']
      },
      {
        name: 'FAQ Generator',
        key: 'faqs_generator',
        category: 'Metadata',
        systemInstruction: 'Generate authentic frequently asked questions with highly informative answers.',
        promptText: 'Generate a set of 5 FAQ questions and answers for "{productName}" covering Warranty, Troubleshooting, Compatibility, and Setup.\n\nOutput as a valid JSON array of objects with keys: "question", "answer", and "category".',
        variables: ['productName']
      },
      {
        name: 'Product Comparison',
        key: 'comparison_generator',
        category: 'Comparison',
        systemInstruction: 'Analyze and contrast multiple items to help a buyer decide.',
        promptText: 'Compare the following products side-by-side:\n{comparisonList}\n\nGenerate:\n1. Feature comparison analysis\n2. Specification highlights comparison\n3. Best value pick\n4. Premium choice pick\n5. Expert conclusion.',
        variables: ['comparisonList']
      }
    ];

    for (const p of defaultPrompts) {
      const existing = await AiPrompt.findOne({ key: p.key });
      if (!existing) {
        await AiPrompt.create({
          ...p,
          version: 1,
          history: [{
            version: 1,
            promptText: p.promptText,
            systemInstruction: p.systemInstruction,
            updatedBy: 'system',
            updatedAt: new Date()
          }]
        });
      }
    }
  }

  public async getPromptByKey(key: string): Promise<any> {
    return await AiPrompt.findOne({ key });
  }

  public async createOrUpdatePrompt(data: any, author = 'admin'): Promise<any> {
    const existing = await AiPrompt.findOne({ key: data.key });
    if (existing) {
      // Build version bump
      const nextVersion = existing.version + 1;
      existing.history.push({
        version: nextVersion,
        promptText: data.promptText,
        systemInstruction: data.systemInstruction,
        updatedBy: author,
        updatedAt: new Date()
      });
      existing.name = data.name;
      existing.category = data.category;
      existing.promptText = data.promptText;
      existing.systemInstruction = data.systemInstruction;
      existing.variables = data.variables || [];
      existing.version = nextVersion;
      existing.isActive = data.isActive ?? true;
      await existing.save();
      return existing;
    } else {
      const created = await AiPrompt.create({
        name: data.name,
        key: data.key,
        category: data.category,
        promptText: data.promptText,
        systemInstruction: data.systemInstruction,
        variables: data.variables || [],
        version: 1,
        isActive: true,
        history: [{
          version: 1,
          promptText: data.promptText,
          systemInstruction: data.systemInstruction,
          updatedBy: author,
          updatedAt: new Date()
        }]
      });
      return created;
    }
  }

  public async rollbackPrompt(key: string, versionNumber: number, author = 'admin'): Promise<any> {
    const prompt = await AiPrompt.findOne({ key });
    if (!prompt) throw new Error('Prompt template not found');

    const historyItem = prompt.history.find((h: any) => h.version === versionNumber);
    if (!historyItem) throw new Error(`Version ${versionNumber} not found in history`);

    // Create a new rolled-back version as the latest
    const nextVersion = prompt.version + 1;
    prompt.history.push({
      version: nextVersion,
      promptText: historyItem.promptText,
      systemInstruction: historyItem.systemInstruction,
      updatedBy: author,
      updatedAt: new Date()
    });

    prompt.promptText = historyItem.promptText;
    prompt.systemInstruction = historyItem.systemInstruction;
    prompt.version = nextVersion;
    await prompt.save();
    return prompt;
  }

  // ==========================================
  // CACHE ENGINE
  // ==========================================

  private computeHash(prompt: string, provider: string, model: string, systemInstruction?: string): string {
    return crypto.createHash('sha256').update(`${prompt}:${provider}:${model}:${systemInstruction || ''}`).digest('hex');
  }

  public async getCachedResponse(prompt: string, provider: string, model: string, systemInstruction?: string): Promise<string | null> {
    const hash = this.computeHash(prompt, provider, model, systemInstruction);
    const cached = await AiCache.findOne({ hash, expiresAt: { $gt: new Date() } });
    if (cached) return cached.response;
    return null;
  }

  public async setCachedResponse(prompt: string, provider: string, model: string, response: string, ttlMs = 86400000, systemInstruction?: string): Promise<void> {
    const hash = this.computeHash(prompt, provider, model, systemInstruction);
    const expiresAt = new Date(Date.now() + ttlMs);
    await AiCache.findOneAndUpdate(
      { hash },
      { prompt, provider, model, response, expiresAt },
      { upsert: true }
    );
  }

  public async invalidateCache(pattern?: string): Promise<void> {
    if (pattern) {
      // Clear specific matches
      await AiCache.deleteMany({ prompt: new RegExp(pattern, 'i') });
    } else {
      // Clear all
      await AiCache.deleteMany({});
    }
  }

  // ==========================================
  // MULTI-PROVIDER AI EXECUTION HUB
  // ==========================================

  public async executeGeneration(params: {
    prompt: string;
    systemInstruction?: string;
    productId?: string;
    promptKey?: string;
    forceRefresh?: boolean;
    streamHandler?: (chunk: string) => void;
  }): Promise<{ text: string; cached: boolean; analyticsId?: string }> {
    const activeProv = await this.getActiveProvider();
    const provider: AiProviderType = activeProv.provider;
    const model = activeProv.model;

    // Check Cache first if not forcing refresh
    if (!params.forceRefresh && !params.streamHandler) {
      const cachedVal = await this.getCachedResponse(params.prompt, provider, model, params.systemInstruction);
      if (cachedVal) {
        return { text: cachedVal, cached: true };
      }
    }

    const startTime = Date.now();
    let responseText = '';
    let success = false;
    let errorMsg = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      if (provider === 'gemini') {
        const apiKey = activeProv.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Gemini API key is not configured');

        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const system = params.systemInstruction || '';
        
        if (params.streamHandler) {
          // Streaming
          const responseStream = await ai.models.generateContentStream({
            model,
            contents: params.prompt,
            config: {
              systemInstruction: system,
              temperature: activeProv.temperature,
              maxOutputTokens: activeProv.maxTokens,
              topP: activeProv.topP
            }
          });

          for await (const chunk of responseStream) {
            const chunkText = chunk.text || '';
            responseText += chunkText;
            params.streamHandler(chunkText);
          }
        } else {
          // Non-streaming
          const response = await ai.models.generateContent({
            model,
            contents: params.prompt,
            config: {
              systemInstruction: system,
              temperature: activeProv.temperature,
              maxOutputTokens: activeProv.maxTokens,
              topP: activeProv.topP
            }
          });
          responseText = response.text || '';
        }

        // Estimate tokens
        promptTokens = Math.round(params.prompt.length / 4);
        completionTokens = Math.round(responseText.length / 4);
        success = true;

      } else {
        // Generic Http clients for other models (OpenAI, Claude, OpenRouter, Local Ollama/LM Studio)
        const baseUrl = activeProv.baseUrl || this.getProviderDefaultBaseUrl(provider);
        const apiKey = activeProv.apiKey || '';

        if (!baseUrl) throw new Error(`Missing Base URL configuration for provider ${provider}`);
        
        const systemPrompt = params.systemInstruction || 'You are an elite copywriting assistant.';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) {
          if (provider === 'anthropic') {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
          } else {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
        }

        let bodyPayload: any = {};
        if (provider === 'anthropic') {
          bodyPayload = {
            model,
            max_tokens: activeProv.maxTokens || 2048,
            temperature: activeProv.temperature || 0.7,
            system: systemPrompt,
            messages: [{ role: 'user', content: params.prompt }]
          };
        } else {
          // OpenAI, OpenRouter, Ollama, LM Studio compatible completions format
          bodyPayload = {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: params.prompt }
            ],
            temperature: activeProv.temperature || 0.7,
            max_tokens: activeProv.maxTokens || 2048,
            top_p: activeProv.topP || 0.95
          };
        }

        const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
          signal: AbortSignal.timeout(activeProv.timeout || 30000)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }

        const json = await res.json();
        if (provider === 'anthropic') {
          responseText = json.content?.[0]?.text || '';
          promptTokens = json.usage?.input_tokens || 0;
          completionTokens = json.usage?.output_tokens || 0;
        } else {
          responseText = json.choices?.[0]?.message?.content || '';
          promptTokens = json.usage?.prompt_tokens || 0;
          completionTokens = json.usage?.completion_tokens || 0;
        }
        success = true;
      }
    } catch (err: any) {
      success = false;
      errorMsg = err.message || 'Unknown generation error';
      responseText = '';
    }

    const duration = Date.now() - startTime;
    if (success && !promptTokens) {
      promptTokens = Math.round(params.prompt.length / 4);
      completionTokens = Math.round(responseText.length / 4);
    }

    const totalTokens = promptTokens + completionTokens;
    // Rough estimate of cost
    const cost = this.estimateCost(provider, model, promptTokens, completionTokens);

    // Save Analytics
    const analyticsDoc = await AiAnalytics.create({
      provider,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost: cost,
      responseTimeMs: duration,
      status: success ? 'success' : 'failed',
      cached: false,
      error: success ? undefined : errorMsg
    });

    if (!success) {
      throw new Error(errorMsg);
    }

    // Cache the successful output
    await this.setCachedResponse(params.prompt, provider, model, responseText, 86400000, params.systemInstruction);

    return {
      text: responseText,
      cached: false,
      analyticsId: analyticsDoc._id.toString()
    };
  }

  private getProviderDefaultBaseUrl(provider: AiProviderType): string {
    switch (provider) {
      case 'openai': return 'https://api.openai.com/v1';
      case 'anthropic': return 'https://api.anthropic.com/v1';
      case 'openrouter': return 'https://openrouter.ai/api/v1';
      case 'ollama': return 'http://localhost:11434/v1';
      case 'lmstudio': return 'http://localhost:1234/v1';
      default: return '';
    }
  }

  private estimateCost(provider: string, model: string, inTokens: number, outTokens: number): number {
    let rateIn = 0.00015; // default per 1K
    let rateOut = 0.0006;  // default per 1K

    if (provider === 'openai') {
      if (model.includes('gpt-4o-mini')) {
        rateIn = 0.00015 / 1000;
        rateOut = 0.0006 / 1000;
      } else {
        rateIn = 0.005 / 1000;
        rateOut = 0.015 / 1000;
      }
    } else if (provider === 'gemini') {
      rateIn = 0.000075 / 1000;
      rateOut = 0.0003 / 1000;
    } else if (provider === 'anthropic') {
      rateIn = 0.003 / 1000;
      rateOut = 0.015 / 1000;
    }

    return (inTokens * rateIn) + (outTokens * rateOut);
  }

  // ==========================================
  // QUALITY ANALYSIS & DUPLICATE CONTENT ENGINE
  // ==========================================

  public evaluateContent(text: string, focusKeyword = ''): ContentQualityReport {
    if (!text || text.trim() === '') {
      return {
        overallScore: 0,
        readability: { score: 0, gradeLevel: 'N/A', wordCount: 0 },
        uniqueness: { score: 100, duplicatePhrases: [] },
        keywordCoverage: { score: 0, matchedKeywords: [], densityPercentage: 0 },
        safetyValidation: { passed: false, issues: ['Empty content'], emptyFlag: true, offensiveFlag: false, hallucinationFlag: false }
      };
    }

    // 1. Calculate readability (Flesch ease / simple heuristics)
    const cleanText = text.replace(/[#*`_\[\]()\-]/g, '');
    const sentences = cleanText.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    const words = cleanText.split(/\s+/).map(w => w.trim()).filter(Boolean);
    const wordCount = words.length;
    const sentenceCount = sentences.length || 1;
    const avgSentenceLength = wordCount / sentenceCount;

    // Estimate syllables roughly
    let syllables = 0;
    for (const w of words) {
      const match = w.toLowerCase().match(/[aeiouy]{1,2}/g);
      syllables += match ? match.length : 1;
    }
    
    // Flesch Reading Ease Formula: 206.835 - (1.015 * ASL) - (84.6 * ASW)
    const asw = syllables / wordCount;
    let readabilityScore = Math.round(206.835 - (1.015 * avgSentenceLength) - (84.6 * asw));
    readabilityScore = Math.max(0, Math.min(100, readabilityScore));

    let gradeLevel = 'Beginner';
    if (readabilityScore < 30) gradeLevel = 'Advanced (College Graduate)';
    else if (readabilityScore < 50) gradeLevel = 'Professional (College level)';
    else if (readabilityScore < 70) gradeLevel = 'High School';
    else gradeLevel = 'Intermediate (Easy Read)';

    // 2. Duplicate Detection inside content (Repetitive sentences / paragraphs)
    const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 40);
    const duplicates: string[] = [];
    for (let i = 0; i < paragraphs.length; i++) {
      for (let j = i + 1; j < paragraphs.length; j++) {
        // Simple Levenshtein or token match heuristic
        const p1 = paragraphs[i].toLowerCase().slice(0, 50);
        const p2 = paragraphs[j].toLowerCase().slice(0, 50);
        if (p1 === p2 && !duplicates.includes(paragraphs[i])) {
          duplicates.push(paragraphs[i]);
        }
      }
    }
    const uniquenessScore = Math.max(0, 100 - (duplicates.length * 20));

    // 3. Keyword Coverage
    let keywordScore = 0;
    let densityPercentage = 0;
    const matched: string[] = [];
    if (focusKeyword) {
      const kwPattern = new RegExp('\\b' + focusKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'gi');
      const kwMatches = cleanText.match(kwPattern) || [];
      densityPercentage = Number(((kwMatches.length / wordCount) * 100).toFixed(2));
      
      if (kwMatches.length > 0) {
        matched.push(focusKeyword);
        // Ideal density 1% - 3%
        if (densityPercentage >= 1 && densityPercentage <= 3) {
          keywordScore = 100;
        } else if (densityPercentage > 0) {
          keywordScore = 70;
        }
      }
    }

    // 4. Safety & Validation Checks
    const issues: string[] = [];
    let offensiveFlag = false;
    let hallucinationFlag = false;

    // Check for obvious placeholders often hallucinated
    const placeholders = ['[insert name]', 'your_brand', 'lorem ipsum', 'placeholder', 'loremipsum', 'fake specifications'];
    for (const place of placeholders) {
      if (text.toLowerCase().includes(place)) {
        issues.push(`Contains template placeholder: "${place}"`);
        hallucinationFlag = true;
      }
    }

    // Profanity / offensive terms detector (lightweight)
    const offensiveWords = ['offensivephrase1', 'offensivephrase2']; // stub for enterprise compliance
    for (const off of offensiveWords) {
      if (text.toLowerCase().includes(off)) {
        issues.push(`Safety risk: flag offensive term`);
        offensiveFlag = true;
      }
    }

    if (wordCount < 100) {
      issues.push('Content is thin (less than 100 words)');
    }

    const passed = issues.length === 0;

    // Calculate final score
    const overallScore = Math.round(
      (readabilityScore * 0.3) + 
      (uniquenessScore * 0.3) + 
      (keywordScore ? keywordScore * 0.3 : 15) + 
      (passed ? 10 : 0)
    );

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      readability: { score: readabilityScore, gradeLevel, wordCount },
      uniqueness: { score: uniquenessScore, duplicatePhrases: duplicates },
      keywordCoverage: { score: keywordScore || 50, matchedKeywords: matched, densityPercentage },
      safetyValidation: { passed, issues, offensiveFlag, emptyFlag: false, hallucinationFlag }
    };
  }

  // ==========================================
  // CONCRETE BUILDERS (BUYING GUIDES, REVIEWS, TRANSLATIONS)
  // ==========================================

  public async generateProductContent(productData: any, promptKey: string, customVars?: Record<string, string>): Promise<any> {
    const promptDoc = await AiPrompt.findOne({ key: promptKey });
    if (!promptDoc) throw new Error(`Prompt template ${promptKey} not registered`);

    let finalPrompt = promptDoc.promptText;
    
    // Auto populate variables
    const vars: Record<string, string> = {
      productName: productData.name || '',
      amazonDescription: productData.description || '',
      amazonFeatures: (productData.features || []).join(', ') || '',
      category: typeof productData.category === 'object' ? productData.category?.name : '',
      focusKeyword: productData.focusKeyword || '',
      ...customVars
    };

    for (const key of Object.keys(vars)) {
      finalPrompt = finalPrompt.replace(new RegExp(`{${key}}`, 'g'), vars[key]);
    }

    const result = await this.executeGeneration({
      prompt: finalPrompt,
      systemInstruction: promptDoc.systemInstruction,
      productId: productData._id?.toString(),
      promptKey
    });

    // Run evaluation
    const evaluation = this.evaluateContent(result.text, productData.focusKeyword);

    // Save Response to database
    const aiResponse = await AiResponse.create({
      productId: productData._id,
      promptKey,
      provider: (await this.getActiveProvider()).provider,
      model: (await this.getActiveProvider()).model,
      promptUsed: finalPrompt,
      generatedText: result.text,
      qualityScore: evaluation.overallScore,
      qualityMetrics: {
        readability: evaluation.readability,
        uniqueness: evaluation.uniqueness,
        keywordCoverage: evaluation.keywordCoverage
      },
      safetyValidation: evaluation.safetyValidation,
      approvalStatus: 'generated',
      approvalHistory: [{
        status: 'generated',
        changedBy: 'system_generator',
        notes: 'Initial content auto-generation completed.'
      }]
    });

    return aiResponse;
  }

  // Rewrite functionality
  public async rewriteContent(text: string, tone: string): Promise<string> {
    const prompt = `Rewrite the following product text to fit a "${tone}" tone. Ensure formatting, headings, and lists are preserved where necessary.\n\nText to rewrite:\n${text}`;
    const result = await this.executeGeneration({
      prompt,
      systemInstruction: 'You are an elite copy editor. Adapt content tone perfectly while maintaining accurate specifications.'
    });
    return result.text;
  }

  // Multi-Language Translation
  public async translateContent(text: string, language: string): Promise<string> {
    const prompt = `Translate the following text into fluent, natural ${language}. Preserve all Markdown structures, paragraphs, tables, and product HTML parameters without any translation modification.\n\nText to translate:\n${text}`;
    const result = await this.executeGeneration({
      prompt,
      systemInstruction: 'You are a professional enterprise translator.'
    });
    return result.text;
  }

  // ==========================================
  // BACKGROUND JOB QUEUE SYSTEM
  // ==========================================

  public async createBatchEnrichJob(productIds: string[], promptKey: string, categoryId?: string): Promise<any> {
    const job = await AiJob.create({
      type: 'batch_enrich',
      productIds,
      category: categoryId,
      promptKey,
      status: 'waiting',
      total: productIds.length,
      processed: 0,
      progress: 0
    });

    // Trigger process in background asynchronously
    this.processJob(job._id.toString()).catch(e => console.error('Error in background job worker:', e));

    return job;
  }

  private async processJob(jobId: string): Promise<void> {
    const job = await AiJob.findById(jobId);
    if (!job) return;

    job.status = 'running';
    job.workerId = 'worker_' + process.pid;
    await job.save();

    const ProductModel = mongoose.model('Product');

    for (const prodId of job.productIds) {
      // Re-fetch job state in case it was paused or cancelled by user
      const refreshedJob = await AiJob.findById(jobId);
      if (!refreshedJob || refreshedJob.status === 'paused' || refreshedJob.status === 'cancelled') {
        return;
      }

      try {
        const product = await ProductModel.findById(prodId).populate('category');
        if (product) {
          // Run generation
          const response = await this.generateProductContent(product, refreshedJob.promptKey || 'product_long_description');
          
          refreshedJob.results.push({
            productId: prodId as any,
            status: 'completed',
            responseId: response._id
          });
        } else {
          refreshedJob.results.push({
            productId: prodId as any,
            status: 'failed',
            error: 'Product not found'
          });
        }
      } catch (err: any) {
        refreshedJob.results.push({
          productId: prodId as any,
          status: 'failed',
          error: err.message || 'Generation failed'
        });
      }

      refreshedJob.processed += 1;
      refreshedJob.progress = Math.round((refreshedJob.processed / refreshedJob.total) * 100);
      await refreshedJob.save();
    }

    job.status = 'completed';
    await job.save();
  }
}

export const aiService = new AiService();
