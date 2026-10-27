import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'aegis-pharma-jwt-token-key-2026';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No bearer token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = await db.users.findById(decoded.id);

    if (!user) {
      user = await db.users.findOne({ username: decoded.username });
    }

    if (!user || !user.active) {
      return res.status(403).json({ success: false, message: 'User account is inactive or no longer valid.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired session token.' });
  }
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const userRole = req.user.role;

    // Allow ADMIN, QA_MANAGER, or exact match
    const isAuthorized =
      userRole === 'ADMIN' ||
      roles.includes(userRole) ||
      (userRole === 'QA_MANAGER' && (roles.includes('QA_QC_MANAGER') || roles.includes('QA_MANAGER'))) ||
      (userRole === 'QA_QC_MANAGER' && (roles.includes('QA_QC_MANAGER') || roles.includes('QA_MANAGER')));

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: `Permission Denied: Action requires one of the following roles: [${roles.join(', ')}]. Current role: ${userRole}`
      });
    }

    next();
  };
}
