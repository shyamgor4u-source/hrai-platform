// src/middleware/auth.js — JWT authentication middleware

const jwt = require('jsonwebtoken');
const prisma = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

/**
 * Requires a valid JWT token in the Authorization header.
 * Attaches `req.user` with id, email, name, role.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, name, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Requires the user to be an admin or superadmin.
 * Must be used AFTER authenticate.
 */
function requireAdmin(req, res, next) {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

/**
 * Requires the user to be a superadmin.
 * Must be used AFTER authenticate.
 */
function requireSuperadmin(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access required.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireSuperadmin };
