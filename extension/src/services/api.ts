/**
 * Reusable and resilient API client for communicate with GadgetsProHub Affiliate Store.
 * Centralizes request headers, auth tokens, standard error handling, and robust typing.
 */
import { extensionStorage } from './storage';
import { NetworkError, AuthenticationError, ValidationError, ExtensionError } from '../utils/errors';
import { logger } from './logger';
import { ProductPayload, ExtensionResponse } from '../types';

class ApiService {
  /**
   * Universal fetch runner wrapping server requests with secure headers and exceptions
   */
  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = await extensionStorage.getApiUrl();
    const token = await extensionStorage.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers
    };

    const targetUrl = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
    logger.debug(`[API Request] ${config.method || 'GET'} ${targetUrl}`);

    try {
      const response = await fetch(targetUrl, config);
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const responseData = isJson ? await response.json() : null;

      if (!response.ok) {
        logger.error(`[API Error Response] Status ${response.status}`, responseData);
        
        if (response.status === 401 || response.status === 403) {
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
   * Imports parsed Amazon product data to our website
   */
  public async importProduct(productData: ProductPayload): Promise<ExtensionResponse> {
    return this.request<ExtensionResponse>('/api/import-amazon', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
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
