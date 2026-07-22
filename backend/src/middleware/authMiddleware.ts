import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ocsgzbmnnldpcsbfgocz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_NdZzQBEthlCcKXp5c-tEQg_o5davYD8';

// Use service role if available, else anon key for token verification
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'donor' | 'ngo' | 'volunteer' | 'admin';
    name: string;
  };
}

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'foodshare-super-secret-key';

export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }

  try {
    let user: any = null;
    let isSupabase = false;

    // Try verifying with Supabase auth client first
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
        isSupabase = true;
      }
    } catch (supabaseErr) {
      // Supabase verification error, fallback to local verification
    }

    if (isSupabase && user) {
      // Fetch user profile from profiles table to get role and name
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, role, email')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        // Allow request with basic info even if profile not found
        req.user = {
          id: user.id,
          email: user.email || '',
          role: 'donor', // default fallback
          name: user.user_metadata?.name || '',
        };
      } else {
        req.user = {
          id: profile.id,
          email: profile.email || user.email || '',
          role: profile.role as 'donor' | 'ngo' | 'volunteer' | 'admin',
          name: profile.name || '',
        };
      }
    } else {
      // Fallback to local JWT verification signed by authController
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role as 'donor' | 'ngo' | 'volunteer' | 'admin',
          name: decoded.name || '',
        };
      } catch (localJwtErr) {
        return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
      }
    }

    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
  }
};

export const authorize = (...roles: Array<'donor' | 'ngo' | 'volunteer' | 'admin'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, no user profile' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};
