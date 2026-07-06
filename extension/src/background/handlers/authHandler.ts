import { apiService } from '../../services/api';
import { extensionStorage } from '../../services/storage';
import { ExtensionResponse } from '../../types';
import { logger } from '../../services/logger';

/**
 * Authenticates session state against remote affiliate backend
 */
export async function handleSessionVerification(): Promise<ExtensionResponse> {
  try {
    const session = await apiService.checkSession();
    return {
      success: true,
      data: session
    };
  } catch (err: any) {
    logger.error('Session check failed in handler', err);
    return {
      success: false,
      error: {
        code: 'SESSION_CHECK_FAILED',
        message: err.message || 'Failed to verify auth session'
      }
    };
  }
}

/**
 * Persists updated authorization tokens securely in local storage
 */
export async function handleSessionTokenUpdate(payload: { token: string | null; email?: string | null }): Promise<ExtensionResponse> {
  if (!payload) {
    return { success: false, error: { code: 'INVALID_PAYLOAD', message: 'Payload is required' } };
  }

  try {
    await extensionStorage.updateSettings({
      authToken: payload.token || null,
      adminEmail: payload.email || null
    });

    return { success: true };
  } catch (err: any) {
    logger.error('Token set failed in handler', err);
    return {
      success: false,
      error: {
        code: 'TOKEN_SET_FAILED',
        message: err.message || 'Failed to write session token'
      }
    };
  }
}
