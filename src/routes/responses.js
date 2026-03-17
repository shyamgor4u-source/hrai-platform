// src/routes/responses.js — Survey response submission + retrieval
// Also handles merging aggregated metrics into the parent campaign

const express = require('express');
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// POST /api/campaigns/:id/responses — submit a survey response (public)
router.post('/', async (req, res) => {
  try {
    const campaignId = req.params.id;
    const { answers, name, email, metrics } = req.body;

    if (!answers) return res.status(400).json({ error: 'Answers are required.' });

    // Verify campaign exists and is active
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
    if (!campaign.active) return res.status(403).json({ error: 'This campaign is not currently accepting responses.' });

    // Create response
    const response = await prisma.response.create({
      data: {
        name: name || null,
        email: email ? email.toLowerCase().trim() : null,
        answers,
        metrics: metrics || null,
        campaignId,
      },
    });

    // Update campaign: increment response count in aggregatedMetrics + update participants status
    const prevMetrics = (typeof campaign.aggregatedMetrics === 'object' && campaign.aggregatedMetrics) ? campaign.aggregatedMetrics : {};
    const responseCount = await prisma.response.count({ where: { campaignId } });
    const newMetrics = metrics || {};

    // Merge metrics using running average
    const mergedMetrics = {};
    const allKeys = new Set([...Object.keys(prevMetrics), ...Object.keys(newMetrics)]);
    const prevCount = responseCount - 1; // count before this response
    allKeys.forEach(k => {
      const pv = prevMetrics[k] || 0;
      const nv = newMetrics[k] || 0;
      mergedMetrics[k] = prevCount === 0 ? nv : Math.round((pv * prevCount + nv) / responseCount);
    });

    // Update participant status if email matches
    let participants = Array.isArray(campaign.participants) ? [...campaign.participants] : [];
    if (email) {
      participants = participants.map(p =>
        (p.email || '').toLowerCase() === email.toLowerCase().trim()
          ? { ...p, status: 'Completed' }
          : p
      );
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { aggregatedMetrics: mergedMetrics, participants },
    });

    res.status(201).json({ message: 'Response submitted.', id: response.id });
  } catch (err) {
    console.error('[Responses Submit]', err);
    res.status(500).json({ error: 'Failed to submit response.' });
  }
});

// GET /api/campaigns/:id/responses — get responses (authenticated)
router.get('/', authenticate, async (req, res) => {
  try {
    const responses = await prisma.response.findMany({
      where: { campaignId: req.params.id },
      orderBy: { submittedAt: 'desc' },
    });
    res.json({ responses, count: responses.length });
  } catch (err) {
    console.error('[Responses List]', err);
    res.status(500).json({ error: 'Failed to get responses.' });
  }
});

module.exports = router;
