import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import express from 'express';
import { JWT_SECRET_KEY, getCookieToken } from '../config';
import { User, BlacklistedToken, AuthCode } from '../models';
import { isTokenLocalBlacklisted, localUsers, saveLocalUsers, getIsMongoConnected, atomicWriteFileAsync } from '../storage';
import { isAdminEmail } from '../utils';
import { ConfigurationService, TotpService, PersonalAccessToken, UserSession } from '../../services/RefinementService';
import { SecurityAnomalyService } from '../../services/SecurityAnomalyService';
import { getSecureClientIp } from './rateLimiters';

export const sanitizeUser = (userObj: any) => {
  if (!userObj) return userObj;
  const clean = userObj.toObject ? userObj.toObject() : { ...userObj };
  delete clean.password;
  delete clean.verificationToken;
  delete clean.pendingEmailToken;
  delete clean.pendingEmailTokenExpires;
  delete clean.pendingEmail;
  delete clean.twoFactorSecret;
  return clean;
};

export const verifyPatTwoFactor = async (req: express.Request, userId: any): Promise<boolean> => {
  if (!ConfigurationService.getFlag('enable2fa')) return true;
  try {
    const user = await User.findById(userId);
    if (!user || !(user as any).twoFactorEnabled) return true;
    const code = (req.headers['x-2fa-code'] || req.headers['x-two-factor-code'] || req.headers['2fa-code'] || req.body?.twoFactorCode || req.body?.code) as string;
    if (!code) return false;
    return TotpService.verifyToken((user as any).twoFactorSecret, code);
  } catch (e) {
    return false;
  }
};

export const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<any> => {
  const isMongoConnected = getIsMongoConnected();
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey && ConfigurationService.getFlag('enablePatAuthentication') && isMongoConnected) {
    try {
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const pat = await PersonalAccessToken.findOne({ tokenHash: keyHash, revoked: false });
      if (pat) {
        const is2FaValid = await verifyPatTwoFactor(req, pat.userId);
        if (!is2FaValid) {
          return res.status(401).json({ error: '2FA code required or invalid for PAT authentication', requiresTwoFactor: true });
        }
        pat.lastUsedAt = new Date();
        await pat.save().catch((e: any) => console.warn(e));
        (req as any).userId = pat.userId.toString();
        (req as any).isPatAuthenticated = true;
        return next();
      }
    } catch (e) {
      console.warn("API key authentication failed:", e);
    }
  }

  let token = req.headers.authorization?.split(' ')[1];
  const isSafeMethod = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  
  if (!token && isSafeMethod) {
    token = getCookieToken(req);
  }
  if (!token) return res.status(401).json({ error: 'No authorization token supplied' });
  
  let isBlacklisted = false;
  if (isMongoConnected) {
    isBlacklisted = !!(await BlacklistedToken.exists({ token }));
  } else {
    isBlacklisted = isTokenLocalBlacklisted(token);
  }
  if (isBlacklisted) {
    return res.status(401).json({ error: 'Token has been revoked, please login again' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY, { algorithms: ['HS256'] }) as { userId: string };
    (req as any).userId = decoded.userId;
    (req as any).authToken = token;

    if (isMongoConnected && ConfigurationService.getFlag('enableDeviceManagement')) {
      const sessionCount = await UserSession.countDocuments({ userId: decoded.userId });
      if (sessionCount > 0) {
        const activeSession = await UserSession.findOne({ token, revoked: false });
        if (!activeSession) {
          return res.status(401).json({ error: 'Session has been revoked or expired' });
        }
      } else {
        await UserSession.create({
          userId: decoded.userId,
          token,
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          revoked: false
        }).catch(() => {});
      }
    }

    next();
  } catch (error: any) {
    if (isMongoConnected && ConfigurationService.getFlag('enablePatAuthentication')) {
      try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const pat = await PersonalAccessToken.findOne({ tokenHash, revoked: false });
        if (pat) {
          const is2FaValid = await verifyPatTwoFactor(req, pat.userId);
          if (!is2FaValid) {
            return res.status(401).json({ error: '2FA code required or invalid for PAT authentication', requiresTwoFactor: true });
          }
          pat.lastUsedAt = new Date();
          await pat.save().catch((e: any) => console.warn(e));
          (req as any).userId = pat.userId.toString();
          (req as any).isPatAuthenticated = true;
          return next();
        }
      } catch (e) {
        console.warn("Fallback PAT authentication check failed:", e);
      }
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired, please login again' });
    }
    res.status(401).json({ error: 'Invalid token, please authorize again' });
  }
};

export const adminOnly = (req: express.Request, res: express.Response, next: express.NextFunction): any => {
  authenticate(req, res, async () => {
    try {
      const userId = (req as any).userId;
      const isMongoConnected = getIsMongoConnected();
      
      if (isMongoConnected) {
        const user = await User.findById(userId);
        if (!user) return res.status(403).json({ error: 'Administrative privileges required' });
        
        (req as any).userEmail = user.email;
        if (!user.role) {
          user.role = isAdminEmail(user.email) ? 'admin' : 'user';
          await User.updateOne({ _id: user._id }, { $set: { role: user.role } }).catch(e => console.warn(e));
        }
        if (user.role === 'admin') {
          return next();
        }
        
        return res.status(403).json({ error: 'Administrative privileges required' });
      } else {
        const u = localUsers.find(user => user._id === userId);
        if (!u) return res.status(403).json({ error: 'Administrative privileges required' });
        
        (req as any).userEmail = u.email;
        if (!u.role) {
          u.role = isAdminEmail(u.email) ? 'admin' : 'user';
          saveLocalUsers();
        }
        if (u.role === 'admin') {
          return next();
        }
        
        return res.status(403).json({ error: 'Administrative privileges required' });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'An internal error occurred.' });
    }
  });
};

export const checkIsAdmin = async (req: express.Request): Promise<boolean> => {
  const token = req.headers.authorization?.replace('Bearer ', '') || getCookieToken(req);
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY, { algorithms: ['HS256'] }) as { userId: string };
    if (!decoded || !decoded.userId) return false;
    
    const isMongoConnected = getIsMongoConnected();
    if (isMongoConnected) {
      const user = await User.findById(decoded.userId);
      if (!user) return false;
      const role = user.role || (isAdminEmail(user.email) ? 'admin' : 'user');
      return role === 'admin';
    } else {
      const u = localUsers.find(user => user._id === decoded.userId);
      if (!u) return false;
      const role = u.role || (isAdminEmail(u.email) ? 'admin' : 'user');
      return role === 'admin';
    }
  } catch (err) {
    return false;
  }
};

export interface PendingAuthCode {
  userId: string;
  expiresAt: number;
}
export const LOCAL_AUTH_CODES_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_auth_codes.json');

export const getLocalAuthCodes = (): Record<string, PendingAuthCode> => {
  try {
    if (fs.existsSync(LOCAL_AUTH_CODES_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_AUTH_CODES_FILE, 'utf8')) || {};
    }
  } catch (e) {}
  return {};
};

export const saveLocalAuthCodes = (codes: Record<string, PendingAuthCode>) => {
  try {
    atomicWriteFileAsync(LOCAL_AUTH_CODES_FILE, JSON.stringify(codes, null, 2), 'utf8');
  } catch (e) {}
};

export const createPendingAuthCode = async (userId: string): Promise<string> => {
  const code = crypto.randomBytes(16).toString('hex');
  if (getIsMongoConnected()) {
    await AuthCode.create({ code, userId });
  } else {
    const codes = getLocalAuthCodes();
    codes[code] = { userId, expiresAt: Date.now() + 60000 };
    saveLocalAuthCodes(codes);
  }
  return code;
};

export const signUserToken = (userId: any): string => {
  return jwt.sign({ userId }, JWT_SECRET_KEY, { expiresIn: '30d', algorithm: 'HS256' });
};

// Brute force protection
const failedLoginTracker = new Map<string, { count: number; lockUntil?: Date; lastAttemptAt: Date }>();

export function cleanupFailedLoginTracker(): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const now = new Date();
  for (const [email, record] of failedLoginTracker.entries()) {
    if (record.lastAttemptAt < oneHourAgo && (!record.lockUntil || record.lockUntil < now)) {
      failedLoginTracker.delete(email);
    }
  }
}

const bruteForceCleanupTimer = setInterval(() => {
  try {
    cleanupFailedLoginTracker();
  } catch (err: any) {
    console.error('[failedLoginTracker Cleanup Error]:', err);
  }
}, 60 * 60 * 1000);
if (typeof bruteForceCleanupTimer.unref === 'function') {
  bruteForceCleanupTimer.unref();
}

export function checkBruteForceLockout(email: string): { isLocked: boolean; remainingMinutes?: number } {
  cleanupFailedLoginTracker();
  if (!ConfigurationService.getFlag('enableBruteForceProtection')) {
    return { isLocked: false };
  }
  const record = failedLoginTracker.get(email);
  if (!record || !record.lockUntil) {
    return { isLocked: false };
  }
  const now = new Date();
  if (now < record.lockUntil) {
    const remainingMs = record.lockUntil.getTime() - now.getTime();
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
    return { isLocked: true, remainingMinutes };
  } else {
    failedLoginTracker.delete(email);
    return { isLocked: false };
  }
}

export function recordFailedLoginAttempt(email: string, req?: express.Request, reason: string = 'Invalid password or account not found'): void {
  cleanupFailedLoginTracker();
  if (req) {
    const clientIp = getSecureClientIp(req);
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';
    const path = req.originalUrl || req.path;
    SecurityAnomalyService.recordFailedAuth(clientIp, email, reason, path, userAgent);
  }
  if (!ConfigurationService.getFlag('enableBruteForceProtection')) return;
  const record = failedLoginTracker.get(email) || { count: 0, lastAttemptAt: new Date() };
  record.count += 1;
  record.lastAttemptAt = new Date();
  if (record.count >= 5) {
    record.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    console.warn(`[BruteForceProtection] Account ${email} locked for 15 minutes after 5 consecutive failed login attempts.`);
  }
  failedLoginTracker.set(email, record);
}

export function clearFailedLoginAttempts(email: string, req?: express.Request): void {
  failedLoginTracker.delete(email);
  if (req) {
    const clientIp = getSecureClientIp(req);
    SecurityAnomalyService.recordSuccessfulAuth(email, clientIp);
  }
}
