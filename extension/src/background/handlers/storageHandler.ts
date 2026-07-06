import { extensionStorage } from '../../services/storage';
import { ExtensionResponse } from '../../types';
import { logger } from '../../services/logger';

/**
 * Handles generic data cache operations
 */
export async function handleStorageWrite(payload: { key: string; value: any }): Promise<ExtensionResponse> {
  if (!payload || !payload.key) {
    return { success: false, error: { code: 'INVALID_PAYLOAD', message: "Invalid caching parameters" } };
  }
  try {
    await extensionStorage.set(payload.key, payload.value);
    return { success: true };
  } catch (err: any) {
    logger.error('Failed to write to storage via message handler', err);
    return { success: false, error: { code: 'WRITE_FAILED', message: err.message || 'Storage write failed' } };
  }
}

/**
 * Handles generic data retrieval operations
 */
export async function handleStorageRead(key: string): Promise<ExtensionResponse> {
  if (!key) {
    return { success: false, error: { code: 'INVALID_PAYLOAD', message: "Key is required for reading" } };
  }
  try {
    const val = await extensionStorage.get(key);
    return { success: true, data: val };
  } catch (err: any) {
    logger.error('Failed to read from storage via message handler', err);
    return { success: false, error: { code: 'READ_FAILED', message: err.message || 'Storage read failed' } };
  }
}
