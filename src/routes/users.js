// src/routes/users.js — User management (admin + superadmin)

const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { authenticate, requireAdmin, requireSuperadmin } = require('../middleware/auth');

const router = express.Router();

// ── Client user management (Admin) ──────────────────────────────────────────

// GET /api/users — list all client users (verified + unverified)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'client' },
      select: { id: true, email: true, name: true, phone: true, company: true, verified: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    console.error('[Users List]', err);
    res.status(500).json({ error: 'Failed to list users.' });
  }
});

// GET /api/users/pending — pending (unverified) users
router.get('/pending', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'client', verified: false },
      select: { id: true, email: true, name: true, phone: true, company: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    console.error('[Users Pending]', err);
    res.status(500).json({ error: 'Failed to list pending users.' });
  }
});

// PUT /api/users/:id/verify — approve a user
router.put('/:id/verify', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { verified: true },
      select: { id: true, email: true, name: true, phone: true, company: true, verified: true },
    });
    res.json({ message: 'User verified.', user });
  } catch (err) {
    console.error('[Users Verify]', err);
    res.status(500).json({ error: 'Failed to verify user.' });
  }
});

// PUT /api/users/verify-all — approve all pending users
router.put('/verify-all', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.user.updateMany({
      where: { role: 'client', verified: false },
      data: { verified: true },
    });
    res.json({ message: 'All pending users verified.' });
  } catch (err) {
    console.error('[Users Verify All]', err);
    res.status(500).json({ error: 'Failed to verify all users.' });
  }
});

// DELETE /api/users/:id — delete (reject) a user
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted.' });
  } catch (err) {
    console.error('[Users Delete]', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// ── Admin management (Superadmin) ───────────────────────────────────────────

// GET /api/users/admins — list admins
router.get('/admins', authenticate, requireSuperadmin, async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'superadmin'] } },
      select: { id: true, email: true, name: true, role: true, permissions: true, verified: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const result = admins.map(a => ({
      ...a,
      avatar: a.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      permissions: a.permissions || { dashboard: true, campaigns: true, insights: true, certification: false },
    }));
    res.json({ admins: result });
  } catch (err) {
    console.error('[Admins List]', err);
    res.status(500).json({ error: 'Failed to list admins.' });
  }
});

// POST /api/users/admins — create admin
router.post('/admins', authenticate, requireSuperadmin, async (req, res) => {
  try {
    const { email, password, name, permissions } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (exists) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashed,
        name: name.trim(),
        role: 'admin',
        verified: true,
        permissions: permissions || { dashboard: true, campaigns: true, insights: true, certification: false },
      },
    });

    const avatar = admin.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    res.status(201).json({
      message: 'Admin created.',
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role, avatar, permissions: admin.permissions },
    });
  } catch (err) {
    console.error('[Admins Create]', err);
    res.status(500).json({ error: 'Failed to create admin.' });
  }
});

// PUT /api/users/admins/:id — update admin (name, email, password, permissions)
router.put('/admins/:id', authenticate, requireSuperadmin, async (req, res) => {
  try {
    const { email, password, name, permissions } = req.body;
    const data = {};
    if (email) data.email = email.toLowerCase().trim();
    if (name) data.name = name.trim();
    if (password) data.password = await bcrypt.hash(password, 12);
    if (permissions !== undefined) data.permissions = permissions;

    const admin = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, name: true, role: true, permissions: true },
    });
    res.json({ message: 'Admin updated.', admin });
  } catch (err) {
    console.error('[Admins Update]', err);
    res.status(500).json({ error: 'Failed to update admin.' });
  }
});

// DELETE /api/users/admins/:id — delete admin (cannot delete superadmin)
router.delete('/admins/:id', authenticate, requireSuperadmin, async (req, res) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'Admin not found.' });
    if (target.role === 'superadmin') return res.status(403).json({ error: 'Cannot delete superadmin.' });

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Admin deleted.' });
  } catch (err) {
    console.error('[Admins Delete]', err);
    res.status(500).json({ error: 'Failed to delete admin.' });
  }
});

module.exports = router;
