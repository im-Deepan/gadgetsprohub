import { extensionStorage } from '../../services/storage';
import { ExtensionResponse } from '../../types';
import { logger } from '../../services/logger';

const ALLOWED_STORAGE_KEYS = new Set([
  'lastImportedAsin',
  'gph_last_imported_asin',
  'parser_debug_logs',
  'currentBulkJob',
  'recent_imported_cache'
]);

/**
 * Handles generic data cache operations
 */
export async function handleStorageWrite(payload: { key: string; value: any }): Promise<ExtensionResponse> {
  if (!payload || !payload.key) {
    return { success: false, error: { code: 'INVALID_PAYLOAD', message: "Invalid caching parameters" } };
  }
  if (!ALLOWED_STORAGE_KEYS.has(payload.key)) {
    logger.warn(`Storage write rejected for disallowed key: ${payload.key}`);
    return { success: false, error: { code: 'FORBIDDEN_KEY', message: `Write access to storage key '${payload.key}' is restricted.` } };
  }
  try {
    const valueSize = new Blob([JSON.stringify(payload.value)]).size;
    if (valueSize > 5 * 1024 * 1024) { // 5MB limit
      return { success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Storage write payload exceeds size limit.' } };
    }
    await extensionStorage.set(payload.key, payload.value);
    return { success: true };
  } catch (err: any) {
    logger.error('Failed to write to storage via message handler', err);
    return { success: false, error: { code: 'WRITE_FAILED', message: 'Storage write operation failed due to an internal error.' } };
  }
}

/**
 * Handles generic data retrieval operations
 */
export async function handleStorageRead(key: string): Promise<ExtensionResponse> {
  if (!key) {
    return { success: false, error: { code: 'INVALID_PAYLOAD', message: "Key is required for reading" } };
  }
  if (!ALLOWED_STORAGE_KEYS.has(key)) {
    logger.warn(`Storage read rejected for disallowed key: ${key}`);
    return { success: false, error: { code: 'FORBIDDEN_KEY', message: `Read access to storage key '${key}' is restricted.` } };
  }
  try {
    const val = await extensionStorage.get(key);
    return { success: true, data: val };
  } catch (err: any) {
    logger.error('Failed to read from storage via message handler', err);
    return { success: false, error: { code: 'READ_FAILED', message: 'Storage read operation failed due to an internal error.' } };
  }
}
