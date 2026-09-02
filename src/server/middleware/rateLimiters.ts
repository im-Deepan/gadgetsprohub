import express from 'express';
import rateLimit from 'express-rate-limit';
import { SecurityAnomalyService } from '../../services/SecurityAnomalyService';
import { logSecurityAction } from '../storage';

export const getSecureClientIp = (req: express.Request): string => {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const headerStr = Array.isArray(xff) ? xff[0] : xff;
    if (typeof headerStr === 'string') {
      const parts = headerStr.split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        return parts[parts.length - 1];
      }
    }
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

export const createRateLimiter = (tierId: string, options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getSecureClientIp,
    validate: { xForwardedForHeader: false, default: false },
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req: express.Request, res: express.Response) => {
      const clientIp = getSecureClientIp(req);
      const userAgent = (req.headers['user-agent'] as string) || 'unknown';
      const path = req.originalUrl || req.path;
      const method = req.method;

      SecurityAnomalyService.recordRateLimitHit(
        tierId,
        clientIp,
        path,
        method,
        userAgent,
        options.max,
        options.windowMs
      );

      logSecurityAction(req, 'RATE_LIMIT_EXCEEDED', undefined, {
        tierId,
        limit: options.max,
        windowMs: options.windowMs,
        path,
        method
      }).catch(e => console.warn('Failed to log rate limit security action:', e));

      res.status(429).json({
        success: false,
        error: options.message,
        retryAfterSeconds: Math.ceil(options.windowMs / 1000),
        tier: tierId
      });
    }
  });
};

// Rate limiting tiers
export const generalLimiter = createRateLimiter('global', {
  windowMs: 5 * 60 * 1000,
  max: 600,
  message: 'Too many requests from this IP address. Please slow down and try again in 5 minutes.'
});

export const loginLimiter = createRateLimiter('strict_login', {
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: 'Too many login attempts. Please try again in 15 minutes.'
});

export const authLimiter = createRateLimiter('sensitive_auth', {
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Excessive authorization requests detected. Please retry in 15 minutes.'
});

export const passwordResetLimiter = createRateLimiter('password_reset', {
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please check your email or wait 15 minutes before retrying.'
});

export const pairLimiter = createRateLimiter('extension_pair', {
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many pairing attempts from this IP. Please try again in 10 minutes.'
});

export const adminApiLimiter = createRateLimiter('admin_api', {
  windowMs: 5 * 60 * 1000,
  max: 200,
  message: 'High volume of administrative actions detected. Please slow down.'
});

export const aiComputeLimiter = createRateLimiter('ai_heavy', {
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: 'AI generation / heavy compute rate limit reached. Please wait 5 minutes before initiating new generation requests.'
});

export const emailActionLimiter = createRateLimiter('public_actions', {
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many submissions from this IP. Please try again in 15 minutes.'
});

export const importLimiter = createRateLimiter('product_import', {
  windowMs: 60 * 1000,
  max: 30,
  message: 'Import rate limit exceeded. Please pace product imports to prevent overloading external sources and backend systems.'
});
