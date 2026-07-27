import { z } from 'zod';

/**
 * Contact Inquiry Form Zod Schema
 */
export const contactSchema = z.object({
  name: z.string()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(50, { message: 'Name must be 50 characters or less' })
    .transform(val => val.trim()),
  email: z.string()
    .email({ message: 'Please enter a valid email address format' })
    .transform(val => val.trim().toLowerCase()),
  phone: z.string()
    .optional()
    .refine(val => !val || /^\+?[0-9\s\-()\.]{7,20}$/.test(val), {
      message: 'Please enter a valid phone number (7 to 20 digits)'
    }),
  subject: z.string()
    .max(100, { message: 'Subject must be 100 characters or less' })
    .optional(),
  message: z.string()
    .min(10, { message: 'Message must be at least 10 characters long' })
    .max(2000, { message: 'Message must be 2000 characters or less' })
    .transform(val => val.trim())
});

/**
 * User Login Zod Schema
 */
export const loginSchema = z.object({
  email: z.string()
    .email({ message: 'Please enter a valid email address' })
    .transform(val => val.trim().toLowerCase()),
  password: z.string()
    .min(6, { message: 'Password must be at least 6 characters' })
});

/**
 * User Registration Zod Schema
 */
export const registerSchema = z.object({
  name: z.string()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(50, { message: 'Name must be 50 characters or less' })
    .transform(val => val.trim()),
  email: z.string()
    .email({ message: 'Please enter a valid email address' })
    .transform(val => val.trim().toLowerCase()),
  password: z.string()
    .min(6, { message: 'Password must be at least 6 characters long' })
});

/**
 * User Profile Settings Schema
 */
export const profileSchema = z.object({
  name: z.string()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(50, { message: 'Name must be 50 characters or less' })
    .transform(val => val.trim()),
  district: z.string().optional()
});

/**
 * Email Address Change Schema (including specific Gmail check)
 */
export const emailChangeSchema = z.object({
  newEmail: z.string()
    .email({ message: 'Please enter a valid email address format (e.g., name@example.com)' })
    .transform(val => val.trim().toLowerCase())
}).superRefine((data, ctx) => {
  const parts = data.newEmail.split('@');
  if (parts.length === 2) {
    const [localPart, domain] = parts;
    if (domain === 'gmail.com') {
      const cleanLocal = localPart.replace(/\./g, '');
      if (cleanLocal.length < 6 || cleanLocal.length > 30) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newEmail'],
          message: 'Gmail usernames must be between 6 and 30 characters long (excluding periods).'
        });
      }
      if (!/^[a-z0-9.]+$/.test(localPart)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newEmail'],
          message: 'Gmail usernames can only contain letters (a-z), numbers (0-9), and periods (.).'
        });
      }
      if (localPart.startsWith('.') || localPart.endsWith('.')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newEmail'],
          message: 'Gmail usernames cannot start or end with a period.'
        });
      }
      if (localPart.includes('..')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newEmail'],
          message: 'Gmail usernames cannot contain consecutive periods (..).'
        });
      }
    }
  }
});
