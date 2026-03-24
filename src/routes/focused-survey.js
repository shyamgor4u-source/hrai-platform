// src/routes/focused-survey.js — Focused public survey responses (submit + list)

const express = require('express');
const prisma = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/focused-survey/public-response — submit a public focused survey response (no auth)
router.post('/public-response', async (req, res) => {
  try {
    const { surveyId, name, email, answers, score } = req.body;

    if (!surveyId || !answers) {
      return res.status(400).json({ error: 'surveyId and answers are required.' });
    }

    const response = await prisma.focusedPublicResponse.create({
      data: {
        surveyId,
        name: name || null,
        email: email ? email.toLowerCase().trim() : null,
        answers,
        score: score || null,
      },
    });

    res.status(201).json({ message: 'Focused survey response submitted.', id: response.id });
  } catch (err) {
    console.error('[Focused Survey Submit]', err);
    res.status(500).json({ error: 'Failed to submit focused survey response.' });
  }
});

// GET /api/focused-survey/public-responses/:surveyId — get all responses for a survey (admin only)
router.get('/public-responses/:surveyId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { surveyId } = req.params;
    const responses = await prisma.focusedPublicResponse.findMany({
      where: { surveyId },
      orderBy: { submittedAt: 'desc' },
    });
    res.json({ responses, count: responses.length });
  } catch (err) {
    console.error('[Focused Survey List]', err);
    res.status(500).json({ error: 'Failed to get focused survey responses.' });
  }
});

// GET /api/focused-survey/public-responses — get all focused public responses (admin only)
router.get('/public-responses', authenticate, requireAdmin, async (req, res) => {
  try {
    const responses = await prisma.focusedPublicResponse.findMany({
      orderBy: { submittedAt: 'desc' },
    });
    res.json({ responses, count: responses.length });
  } catch (err) {
    console.error('[Focused Survey All]', err);
    res.status(500).json({ error: 'Failed to get focused survey responses.' });
  }
});

module.exports = router;
