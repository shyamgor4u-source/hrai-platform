// src/routes/auth.js — Login, Register, /me

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com','yahoo.com','hotmail.com','outlook.com','rediffmail.com',
  'ymail.com','icloud.com','live.com','aol.com','protonmail.com'
];

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password. Please try again.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect email or password. Please try again.' });
    }

    if (!user.verified && user.role === 'client') {
      return res.status(403).json({ error: '⏳ Approval Pending — Your account is awaiting verification by the HRAI admin team. Please try again after approval or contact team@hrassociationofindia.com.' });
    }

    const token = signToken(user);
    const avatar = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        company: user.company,
        verified: user.verified,
        avatar,
        permissions: user.permissions || { dashboard: true, campaigns: true, insights: true, certification: false },
      },
    });
  } catch (err) {
    console.error('[Auth Login]', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    const em = (email || '').trim().toLowerCase();
    const domain = em.split('@')[1] || '';

    // Validations matching frontend
    if (!name || !name.trim()) return res.status(400).json({ error: 'Full name is required.' });
    if (!em.includes('@') || !domain) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (PERSONAL_EMAIL_DOMAINS.includes(domain)) {
      return res.status(400).json({ error: 'Only official/work email addresses are accepted. Gmail, Yahoo, Hotmail etc. are not allowed.' });
    }
    if (!phone || !/^[0-9]{10}$/.test(phone.trim())) {
      return res.status(400).json({ error: 'Mobile number must be exactly 10 digits with no spaces, letters or special characters.' });
    }
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const exists = await prisma.user.findUnique({ where: { email: em } });
    if (exists) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const company = domain.split('.')[0];
    const user = await prisma.user.create({
      data: {
        email: em,
        password: hashed,
        name: name.trim(),
        phone: phone.trim(),
        company,
        role: 'client',
        verified: false,
      },
    });

    res.status(201).json({
      message: 'Registration successful. Your account is pending admin approval.',
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, company: user.company, verified: false },
    });
  } catch (err) {
    console.error('[Auth Register]', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// GET /api/auth/me — verify token
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, phone: true, company: true, verified: true, permissions: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const avatar = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    res.json({ user: { ...user, avatar, permissions: user.permissions || { dashboard: true, campaigns: true, insights: true, certification: false } } });
  } catch (err) {
    console.error('[Auth Me]', err);
    res.status(500).json({ error: 'Failed to verify token.' });
  }
});

module.exports = router;
