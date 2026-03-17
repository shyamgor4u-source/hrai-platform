// src/routes/pulse.js — ESI pulse survey (submit, list, count)

const express = require('express');
const prisma = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/pulse — submit ESI response (public, no auth)
router.post('/', async (req, res) => {
  try {
    const { answers, name, email, phone, linkedin, location, gender, salary, designation, industry, lookingForChange } = req.body;

    if (!answers) return res.status(400).json({ error: 'Answers are required.' });

    const response = await prisma.pulseResponse.create({
      data: {
        name: name || null,
        email: email ? email.toLowerCase().trim() : null,
        phone: phone || null,
        linkedin: linkedin || null,
        location: location || null,
        gender: gender || null,
        salary: salary || null,
        designation: designation || null,
        industry: industry || null,
        lookingForChange: lookingForChange || null,
        answers,
      },
    });

    res.status(201).json({ message: 'Pulse response submitted.', id: response.id });
  } catch (err) {
    console.error('[Pulse Submit]', err);
    res.status(500).json({ error: 'Failed to submit pulse response.' });
  }
});

// GET /api/pulse — get all ESI responses (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const responses = await prisma.pulseResponse.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ responses, count: responses.length });
  } catch (err) {
    console.error('[Pulse List]', err);
    res.status(500).json({ error: 'Failed to get pulse responses.' });
  }
});

// GET /api/pulse/count — public count for meter display
router.get('/count', async (req, res) => {
  try {
    const count = await prisma.pulseResponse.count();
    res.json({ count });
  } catch (err) {
    console.error('[Pulse Count]', err);
    res.status(500).json({ error: 'Failed to get count.' });
  }
});

module.exports = router;
