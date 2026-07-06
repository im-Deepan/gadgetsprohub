import { apiService } from '../../services/api';
import { ExtensionResponse, ProductPayload } from '../../types';
import { logger } from '../../services/logger';

/**
 * Coordinates raw product payload import with the remote database through the ApiService
 */
export async function handleProductImport(payload: ProductPayload): Promise<ExtensionResponse> {
  if (!payload) {
    return { 
      success: false, 
      error: { code: 'INVALID_PAYLOAD', message: 'Product payload is required' } 
    };
  }

  try {
    const result = await apiService.importProduct(payload);
    return result;
  } catch (err: any) {
    logger.error('Failed to import product from background context', err);
    return {
      success: false,
      error: {
        code: err.code || 'IMPORT_FAILED',
        message: err.message || 'Failed to complete product import',
        details: err.details
      }
    };
  }
}
