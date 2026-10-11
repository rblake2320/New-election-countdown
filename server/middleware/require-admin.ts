import { Response, NextFunction } from 'express';
import { pool } from '../db';

/**
 * Middleware to require admin privileges.
 *
 * Must run AFTER `isAuthenticated` (server/auth.ts), which sets
 * `req.userId` / `req.user.claims.sub`. The role is read from the
 * `users` table on every call — there is no environment or email-suffix
 * bypass. Fails closed on any lookup error.
 */
export async function requireAdmin(req: any, res: Response, next: NextFunction) {
  const userId: string | undefined = req.userId ?? req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource',
    });
  }

  try {
    const { rows } = await pool.query<{ role: string | null }>(
      'SELECT role FROM users WHERE id = $1 LIMIT 1',
      [String(userId)],
    );
    if (rows[0]?.role?.toLowerCase() === 'admin') {
      req.user = { ...(req.user ?? {}), role: 'admin' };
      return next();
    }
  } catch (error) {
    console.error('requireAdmin: role lookup failed', error instanceof Error ? error.message : error);
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Unable to verify administrative privileges',
    });
  }

  return res.status(403).json({
    error: 'Forbidden',
    message: 'Administrative privileges required to access this resource',
  });
}
