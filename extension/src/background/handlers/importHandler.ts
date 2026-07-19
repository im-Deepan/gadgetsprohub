import { apiService } from '../../services/api';
import { ExtensionResponse, ProductPayload } from '../../types';
import { logger } from '../../services/logger';

/**
 * Coordinates raw product payload import with the remote database through the ApiService
 */
export async function handleProductImport(
  payload: ProductPayload | { product: ProductPayload; strategy?: 'create' | 'skip' | 'update' | 'merge' | 'replace'; options?: { overwriteDescription?: boolean; overwriteImages?: boolean } }
): Promise<ExtensionResponse> {
  if (!payload) {
    return { 
      success: false, 
      error: { code: 'INVALID_PAYLOAD', message: 'Product payload is required' } 
    };
  }

  // Determine if wrapped payload or direct payload
  let productData: ProductPayload;
  let strategy: 'create' | 'skip' | 'update' | 'merge' | 'replace' = 'create';
  let options: any = undefined;

  if ('product' in payload && (payload as any).product) {
    const wrapped = payload as { product: ProductPayload; strategy?: 'create' | 'skip' | 'update' | 'merge' | 'replace'; options?: any };
    productData = wrapped.product;
    strategy = wrapped.strategy || 'create';
    options = wrapped.options;
  } else {
    productData = payload as ProductPayload;
  }

  try {
    // Pre-flight validation: must be authenticated and must be an admin
    const session = await apiService.checkSession();
    if (!session.isAuthenticated) {
      return {
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Your session has expired or is invalid. Please log in to import products.'
        }
      };
    }

    if (session.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED_ROLE',
          message: 'Access denied: Only administrators can import products.'
        }
      };
    }

    const result = await apiService.importProduct(productData, strategy, options);
    return result;
  } catch (err: any) {
    logger.error('Failed to import product from background context', err);
    return {
      success: false,
      error: {
        code: err.code || 'IMPORT_FAILED',
        message: 'Failed to complete product import',
        details: err.details
      }
    };
  }
}
