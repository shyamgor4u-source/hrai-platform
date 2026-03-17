// src/routes/campaigns.js — Campaign CRUD + report access + metrics update

const express = require('express');
const prisma = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/campaigns — list campaigns
// Admin sees all; client sees only where their email is in participants or reportAccess
router.get('/', authenticate, async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        reportAccess: { select: { email: true } },
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let result = campaigns.map(c => ({
      id: c.id,
      title: c.title,
      companyId: c.companyId,
      companyName: c.companyName,
      companyIndustry: c.companyIndustry,
      track: c.track,
      status: c.status,
      active: c.active,
      participants: c.participants || [],
      aggregatedMetrics: c.aggregatedMetrics || {},
      aiInsight: c.aiInsight,
      pdfInsight: c.pdfInsight,
      reportAccessEmails: c.reportAccess.map(r => r.email),
      responses: c._count.responses,
      createdAt: c.createdAt,
      ownerId: c.ownerId,
    }));

    // Client filtering
    if (req.user.role === 'client') {
      const userEmail = req.user.email.toLowerCase().trim();
      result = result.filter(c => {
        const inParticipants = (c.participants || []).some(p => (p.email || '').toLowerCase().trim() === userEmail);
        const inReport = (c.reportAccessEmails || []).some(e => (e || '').toLowerCase().trim() === userEmail);
        return inParticipants || inReport;
      });
    }

    res.json({ campaigns: result });
  } catch (err) {
    console.error('[Campaigns List]', err);
    res.status(500).json({ error: 'Failed to list campaigns.' });
  }
});

// GET /api/campaigns/:id — single campaign detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    const c = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        reportAccess: { select: { email: true } },
        _count: { select: { responses: true } },
      },
    });
    if (!c) return res.status(404).json({ error: 'Campaign not found.' });

    res.json({
      campaign: {
        ...c,
        reportAccessEmails: c.reportAccess.map(r => r.email),
        responses: c._count.responses,
      },
    });
  } catch (err) {
    console.error('[Campaigns Get]', err);
    res.status(500).json({ error: 'Failed to get campaign.' });
  }
});

// POST /api/campaigns — create campaign (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, companyId, companyName, companyIndustry, track, participants, status } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const campaign = await prisma.campaign.create({
      data: {
        title,
        companyId: companyId || null,
        companyName: companyName || null,
        companyIndustry: companyIndustry || null,
        track: track || 'C.A.R.E. (OPEN)',
        status: status || 'active',
        active: true,
        participants: participants || [],
        aggregatedMetrics: {},
        ownerId: req.user.id,
      },
    });

    res.status(201).json({ campaign });
  } catch (err) {
    console.error('[Campaigns Create]', err);
    res.status(500).json({ error: 'Failed to create campaign.' });
  }
});

// PUT /api/campaigns/:id — update campaign (admin)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, companyId, companyName, companyIndustry, track, status, active, participants, aggregatedMetrics, aiInsight, pdfInsight } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (companyId !== undefined) data.companyId = companyId;
    if (companyName !== undefined) data.companyName = companyName;
    if (companyIndustry !== undefined) data.companyIndustry = companyIndustry;
    if (track !== undefined) data.track = track;
    if (status !== undefined) data.status = status;
    if (active !== undefined) data.active = active;
    if (participants !== undefined) data.participants = participants;
    if (aggregatedMetrics !== undefined) data.aggregatedMetrics = aggregatedMetrics;
    if (aiInsight !== undefined) data.aiInsight = aiInsight;
    if (pdfInsight !== undefined) data.pdfInsight = pdfInsight;

    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ campaign });
  } catch (err) {
    console.error('[Campaigns Update]', err);
    res.status(500).json({ error: 'Failed to update campaign.' });
  }
});

// DELETE /api/campaigns/:id — delete campaign (admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.json({ message: 'Campaign deleted.' });
  } catch (err) {
    console.error('[Campaigns Delete]', err);
    res.status(500).json({ error: 'Failed to delete campaign.' });
  }
});

// ── Report Access ────────────────────────────────────────────────────────────

// POST /api/campaigns/:id/report-access
router.post('/:id/report-access', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email is required.' });

    const access = await prisma.reportAccess.create({
      data: { email: email.toLowerCase().trim(), campaignId: req.params.id },
    });
    res.status(201).json({ access });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'This email already has access.' });
    console.error('[Report Access Add]', err);
    res.status(500).json({ error: 'Failed to add report access.' });
  }
});

// DELETE /api/campaigns/:id/report-access/:email
router.delete('/:id/report-access/:email', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.reportAccess.deleteMany({
      where: { campaignId: req.params.id, email: req.params.email.toLowerCase().trim() },
    });
    res.json({ message: 'Report access removed.' });
  } catch (err) {
    console.error('[Report Access Remove]', err);
    res.status(500).json({ error: 'Failed to remove report access.' });
  }
});

module.exports = router;
