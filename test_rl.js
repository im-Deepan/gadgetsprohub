import express from 'express';
import { rateLimit } from 'express-rate-limit';
const app = express();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.ip || '127.0.0.1',
  validate: { xForwardedForHeader: false, default: false }
});
console.log("Success");
