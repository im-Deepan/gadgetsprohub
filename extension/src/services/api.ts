/**
 * Reusable and resilient API client for communicate with GadgetsProHub Affiliate Store.
 * Centralizes request headers, auth tokens, standard error handling, and robust typing.
 */
import { extensionStorage } from './storage';
import { CONFIG } from '../config';
import { NetworkError, AuthenticationError, ValidationError, ExtensionError } from '../utils/errors';
import { logger } from './logger';
import { ProductPayload, ExtensionResponse } from '../types';

/**
 * Decodes a JWT token without verifying signature to extract JSON claims.
 */
function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Decodes a JWT's expiration claim and returns the epoch millisecond timestamp.
 */
export function decodeTokenExpiration(token: string): number | null {
  const decoded = decodeJwt(token);
  if (decoded && typeof decoded.exp === 'number') {
    return decoded.exp * 1000;
  }
  return null;
}

/**
 * Generates a unique, trace-friendly correlation ID for backend logs.
 */
export function generateCorrelationId(): string {
  return 'gph_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

class ApiService {
  /**
   * Universal fetch runner wrapping server requests with secure headers and exceptions
   */
  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = await extensionStorage.getApiUrl();
    const token = await extensionStorage.getAuthToken();
    const correlationId = generateCorrelationId();
    const extensionId = (typeof chrome !== 'undefined' && chrome.runtime?.id) ? chrome.runtime.id : 'gph-importer';

    // Validate and construct target URL
    const cleanBaseUrl = (baseUrl || '').trim().replace(/\/$/, '');
    if (!cleanBaseUrl || !/^https?:\/\//i.test(cleanBaseUrl)) {
      throw new ValidationError('Invalid or unconfigured API Base URL.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Correlation-ID': correlationId,
      'X-Extension-ID': extensionId,
      'X-Extension-Version': '1.0.0',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers
    };

    const targetUrl = `${cleanBaseUrl}${endpoint}`;
    logger.debug(`[API Request] ${config.method || 'GET'} ${targetUrl} [Correlation ID: ${correlationId}]`);

    try {
      const response = await fetch(targetUrl, config);
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const responseData = isJson ? await response.json() : null;

      if (!response.ok) {
        logger.error(`[API Error Response] Status ${response.status}`, responseData);
        
        if (response.status === 401 || response.status === 403) {
          // Clear invalid tokens from storage automatically
          await extensionStorage.updateSettings({
            authToken: null,
            adminEmail: null,
            tokenExpiresAt: null
          });
          throw new AuthenticationError(responseData?.error || 'Authentication failure. Please log in again.');
        }
        
        if (response.status === 400) {
          throw new ValidationError(responseData?.error || 'Invalid product payload submitted.');
        }

        throw new ExtensionError(
          responseData?.error || `Remote server returned error code ${response.status}`,
          'SERVER_ERROR',
          responseData
        );
      }

      return responseData as T;
    } catch (err: any) {
      if (err instanceof ExtensionError) {
        throw err;
      }
      logger.error('[API Connection Error]', err);
      throw new NetworkError(`Failed to connect to GadgetsProHub Server: ${err.message}`);
    }
  }

  /**
   * Logs in with the remote API using email and password
   */
  public async login(email: string, password: string): Promise<{ token: string; user: { role: string; email: string } }> {
    return this.request<{ token: string; user: { role: string; email: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  /**
   * Logs out from the remote API, blacklisting the active token, and unconditionally clearing local credentials
   */
  public async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', {
        method: 'POST'
      });
    } catch (err) {
      logger.warn('Remote logout network call failed or token already invalid', err);
    } finally {
      await extensionStorage.updateSettings({
        authToken: null,
        adminEmail: null,
        tokenExpiresAt: null
      });
      await extensionStorage.remove(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      await extensionStorage.remove('authToken');
      await extensionStorage.remove('adminEmail');
    }
  }

  /**
   * Imports parsed Amazon product data to our website with customizable duplicate strategies and options
   */
  public async importProduct(
    productData: ProductPayload,
    strategy: 'create' | 'skip' | 'update' | 'merge' | 'replace' = 'create',
    options?: { overwriteDescription?: boolean; overwriteImages?: boolean }
  ): Promise<ExtensionResponse> {
    const serverPayload = {
      name: productData.name,
      price: productData.currentPrice,
      originalPrice: productData.originalPrice || productData.currentPrice,
      discount: productData.discount || 0,
      rating: productData.rating || 0,
      totalReviews: productData.reviewCount || 0,
      asin: productData.asin,
      categoryName: productData.specifications?.['Category'] || 'Electronics',
      brand: productData.brand || 'Generic',
      description: productData.description || '',
      longDescription: productData.description || '',
      imageUrl: productData.images?.[0] || '',
      images: productData.images || [],
      productUrl: productData.productUrl || (productData.asin ? `https://www.amazon.in/dp/${productData.asin}` : ''),
      affiliateLink: productData.affiliateLink || (productData.asin ? `https://www.amazon.in/dp/${productData.asin}?tag=gadgetsprohub-21` : ''),
      affiliateCode: 'gadgetsprohub-21',
      specifications: productData.specifications || {},
      features: productData.bulletFeatures || [],
      strategy,
      options
    };

    return this.request<ExtensionResponse>('/api/admin/products/import', {
      method: 'POST',
      body: JSON.stringify(serverPayload)
    });
  }

  /**
   * Checks if a product with the given ASIN already exists on the remote database
   */
  public async checkDuplicate(asin: string): Promise<{ success: boolean; exists: boolean; product?: any }> {
    return this.request<{ success: boolean; exists: boolean; product?: any }>(`/api/admin/products/check-duplicate/${asin}`);
  }

  /**
   * Retrieves paginated product import logs with filtering and keyword searches
   */
  public async getImportHistory(params?: { page?: number; limit?: number; search?: string; result?: string }): Promise<{
    success: boolean;
    data: any[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined) query.append(key, String(val));
      });
    }
    return this.request<{
      success: boolean;
      data: any[];
      pagination: { total: number; page: number; limit: number; pages: number };
    }>(`/api/admin/products/import/history?${query.toString()}`);
  }

  /**
   * Retrieves high-level aggregated import pipeline success, failure, and strategy metrics
   */
  public async getImportAnalytics(): Promise<{
    success: boolean;
    data: {
      totalImports: number;
      successfulImports: number;
      failedImports: number;
      duplicateAttempts: number;
      updatedProducts: number;
      mergedProducts: number;
      skippedProducts: number;
      averageProcessingTimeMs: number;
      validationFailures: number;
    };
  }> {
    return this.request<any>('/api/admin/products/import/analytics');
  }

  /**
   * Verifies the active login session and role with the remote API
   */
  public async checkSession(): Promise<{ isAuthenticated: boolean; role?: string; email?: string }> {
    try {
      const res = await this.request<{ isAuthenticated: boolean; user?: { role: string; email: string } }>('/api/auth/status');
      return {
        isAuthenticated: res.isAuthenticated,
        role: res.user?.role,
        email: res.user?.email
      };
    } catch (err) {
      logger.warn('Failed session check with remote API', err);
      return { isAuthenticated: false };
    }
  }
}

export const apiService = new ApiService();
