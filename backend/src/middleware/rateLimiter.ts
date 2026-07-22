import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const WINDOW_SIZE_MS = 60 * 1000; // 1 minute

interface RateLimitData {
  count: number;
  resetTime: number;
}

const requestMap = new Map<string, RateLimitData>();

const getUserIdFromToken = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.decode(token) as any;
    return decoded?.sub || decoded?.id || null;
  } catch (_) {
    return null;
  }
};

export const chatRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Automatically bypass rate limiting in development or localhost environments
  if (
    process.env.NODE_ENV === 'development' ||
    req.hostname === 'localhost' ||
    req.hostname === '127.0.0.1' ||
    req.ip === '::1' ||
    req.ip === '127.0.0.1'
  ) {
    console.log(`[Rate Limiter] Bypassing rate limiter for development request from ${req.ip}`);
    return next();
  }

  const now = Date.now();
  const userId = getUserIdFromToken(req.headers.authorization);
  const isAuth = !!userId;

  const rateLimitKey = isAuth ? `user_${userId}` : `ip_${req.ip || req.socket.remoteAddress || 'unknown'}`;
  const limit = isAuth ? 60 : 20;

  let limitData = requestMap.get(rateLimitKey);

  if (!limitData || now > limitData.resetTime) {
    limitData = {
      count: 0,
      resetTime: now + WINDOW_SIZE_MS
    };
  }

  limitData.count++;
  requestMap.set(rateLimitKey, limitData);

  const remaining = Math.max(0, limit - limitData.count);
  const secondsLeft = Math.ceil((limitData.resetTime - now) / 1000);

  // Log rate limiter metrics
  console.log(`[Rate Limiter Log] Key: ${rateLimitKey} | Current Count: ${limitData.count} | Current Limit: ${limit} | Remaining: ${remaining} | Reset in: ${secondsLeft}s`);

  if (limitData.count > limit) {
    res.setHeader('Retry-After', secondsLeft.toString());
    return res.status(429).json({
      success: false,
      message: `Too many requests. Please try again after ${secondsLeft} seconds.`,
      retryAfter: secondsLeft
    });
  }

  next();
};
