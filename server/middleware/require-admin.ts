import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to require admin privileges
 * Checks if user is authenticated AND has admin role/email
 */
export function requireAdmin(req: any, res: Response, next: NextFunction) {
  // First check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }

  // Check if user has admin privileges
  const isAdmin = 
    req.user.role?.toLowerCase() === 'admin' ||
    req.user.email?.endsWith('@admin.com') ||
    process.env.VITE_ADMIN_FEATURES === '1'; // Environment-level admin enable

  if (!isAdmin) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Administrative privileges required to access this resource'
    });
  }

  next();
}
