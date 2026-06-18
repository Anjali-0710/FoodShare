import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ocsgzbmnnldpcsbfgocz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jc2d6Ym1ubmxkcGNzYmZnb2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTgyMTIsImV4cCI6MjA2NTQ5NDIxMn0.iwtZjMhPxLPE-F9FGGVIqFEPCMUo05PodIq1LmIMQzk';

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
    // Verify Supabase JWT by fetching the user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
    }

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

    next();
  } catch (error) {
    console.error('Supabase auth verification error:', error);
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
