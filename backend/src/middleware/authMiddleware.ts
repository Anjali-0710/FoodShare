import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { getDbStatus } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'donor' | 'ngo' | 'volunteer' | 'admin';
    name: string;
  };
}

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
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: 'donor' | 'ngo' | 'volunteer' | 'admin';
      name: string;
    };

    // If MongoDB is connected, double check user presence
    if (getDbStatus()) {
      const userExists = await User.findById(decoded.id).select('-passwordHash');
      if (!userExists) {
        return res.status(401).json({ success: false, message: 'User matching this token no longer exists' });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
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
