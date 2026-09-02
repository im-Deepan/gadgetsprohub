import dotenv from 'dotenv';
import crypto from 'crypto';
import express from 'express';

dotenv.config();

export const getSanitizedMongoUri = (uri: string | undefined): string => {
  if (!uri) return 'undefined';
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = '******';
    return parsed.toString();
  } catch {
    return uri.replace(/:([^:@]+)@/, ':******@');
  }
};

export const escapeHTML = (str: string | undefined): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

let generatedFallbackSecret: string | null = null;
export const getJwtSecret = (): string => {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '' && process.env.JWT_SECRET !== 'your-secret-key') {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be explicitly provided in production. Check your .env file or deployment config.');
  }
  if (!generatedFallbackSecret) {
    try {
      generatedFallbackSecret = crypto.randomBytes(64).toString('hex');
    } catch {
      generatedFallbackSecret = 'fallback-gadgetsprohub-crypto-secret-key-32bytes-hex-99201';
    }
    console.warn("⚠️ JWT_SECRET env variable not provided; generated 64-byte high-entropy fallback secret for development.");
  }
  if (!generatedFallbackSecret) throw new Error('Failed to generate JWT secret');
  return generatedFallbackSecret;
};

export const JWT_SECRET_KEY = getJwtSecret();

export const getCookieToken = (req: express.Request): string | undefined => {
  if (!req.headers.cookie) return undefined;
  const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
};

export const cleanUndefined = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

export function escapeRegExp(value: any) {
  if (typeof value !== 'string') return '';
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
