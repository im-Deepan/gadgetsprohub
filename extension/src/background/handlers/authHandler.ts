import { apiService, decodeTokenExpiration } from '../../services/api';
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
    const tokenExpiresAt = payload.token ? decodeTokenExpiration(payload.token) : null;
    await extensionStorage.updateSettings({
      authToken: payload.token || null,
      adminEmail: payload.email || null,
      tokenExpiresAt
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

/**
 * Initiates remote user authentication and saves tokens on success
 */
export async function handleLogin(payload: { email?: string; password?: string }): Promise<ExtensionResponse> {
  if (!payload || !payload.email || !payload.password) {
    return {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Email and password are required' }
    };
  }

  try {
    const session = await apiService.login(payload.email, payload.password);
    
    // Check if user is administrator
    if (session.user?.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED_ROLE',
          message: 'Access denied: Only administrators are authorized to use the importer extension.'
        }
      };
    }

    // Decode expiration
    const tokenExpiresAt = session.token ? decodeTokenExpiration(session.token) : null;

    // Persist authentication info
    await extensionStorage.updateSettings({
      authToken: session.token,
      adminEmail: session.user.email,
      tokenExpiresAt
    });

    return {
      success: true,
      data: {
        email: session.user.email,
        role: session.user.role
      }
    };
  } catch (err: any) {
    logger.error('Login request failed in handler', err);
    return {
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: err.message || 'Authentication failed. Please verify credentials.'
      }
    };
  }
}

/**
 * Revokes existing credentials and logs the administrator out safely
 */
export async function handleLogout(): Promise<ExtensionResponse> {
  try {
    await apiService.logout();
    
    // Clear credentials
    await extensionStorage.updateSettings({
      authToken: null,
      adminEmail: null,
      tokenExpiresAt: null
    });

    return { success: true };
  } catch (err: any) {
    logger.error('Logout request failed in handler', err);
    return {
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: err.message || 'Failed to sign out'
      }
    };
  }
}
