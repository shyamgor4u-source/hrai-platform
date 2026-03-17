// src/routes/ai.js — Anthropic AI (server-side, key stays private)
// Mirrors the exact system prompts and response formats from the v1 frontend

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function ensureAI(req, res, next) {
  if (!anthropic) {
    return res.status(503).json({ error: 'AI service is not configured. Set ANTHROPIC_API_KEY in environment variables.' });
  }
  next();
}

// POST /api/ai/campaign-insights — campaign AI analysis
// Returns JSON: {executiveSummary, strengths[], concerns[], recommendations[], overallScore, sentiment}
router.post('/campaign-insights', authenticate, ensureAI, async (req, res) => {
  try {
    const { campaignTitle, responses, aggregatedMetrics, companyName } = req.body;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: 'You are an expert HR analyst specialising in employee engagement. Generate a concise executive insights report. Respond ONLY with a JSON object (no markdown, no backticks). Keys: executiveSummary (string, 2-3 sentences), strengths (string[] of 3 items), concerns (string[] of 3 items), recommendations (string[] of 4 items), overallScore (number 0-100), sentiment ("positive"|"neutral"|"needs attention").',
      messages: [{
        role: 'user',
        content: `Organisation: ${companyName || 'Unknown'}. Campaign: ${campaignTitle || 'Untitled'}. Responses: ${responses || 0}. Pillar Scores: ${JSON.stringify(aggregatedMetrics || {})}. Generate a professional HR executive report for HR Association of India (HRAI).`,
      }],
    });

    const text = (message.content || []).map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    res.json({ insight: JSON.parse(clean) });
  } catch (err) {
    console.error('[AI Campaign Insights]', err);
    // Fallback response matching frontend behavior
    const metrics = req.body.aggregatedMetrics || {};
    const scores = Object.values(metrics);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50;
    res.json({
      insight: {
        executiveSummary: 'AI insights temporarily unavailable. Please review the pillar scores below for a manual assessment.',
        strengths: ['Review scores above 70%', 'Identify consistent performers', 'Celebrate team wins'],
        concerns: ['Address scores below 60%', 'Follow up on low-trust indicators', 'Review communication gaps'],
        recommendations: ['Schedule focus groups', 'Create action plans per pillar', 'Set 90-day improvement targets', 'Report back to leadership'],
        overallScore: avg,
        sentiment: 'neutral',
      },
    });
  }
});

// POST /api/ai/pdf-report — PDF report content generation
// Returns JSON: {executiveSummary, strengths[], concerns[], recommendations[], overallScore, sentiment}
router.post('/pdf-report', authenticate, ensureAI, async (req, res) => {
  try {
    const { campaignTitle, responses, aggregatedMetrics, companyName } = req.body;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: 'You are an expert HR analyst specialising in employee engagement. Generate a concise executive insights report. Respond ONLY with a JSON object (no markdown, no backticks). Keys: executiveSummary (string, 2-3 sentences), strengths (string[] of 3 items), concerns (string[] of 3 items), recommendations (string[] of 4 items), overallScore (number 0-100), sentiment ("positive"|"neutral"|"needs attention").',
      messages: [{
        role: 'user',
        content: `Organisation: ${companyName || 'Unknown'}. Campaign: ${campaignTitle || 'Untitled'}. Responses: ${responses || 0}. Pillar Scores: ${JSON.stringify(aggregatedMetrics || {})}.`,
      }],
    });

    const text = (message.content || []).map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    res.json({ insight: JSON.parse(clean) });
  } catch (err) {
    console.error('[AI PDF Report]', err);
    const metrics = req.body.aggregatedMetrics || {};
    const scores = Object.values(metrics);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50;
    res.json({
      insight: {
        executiveSummary: 'AI insights temporarily unavailable. Please review the pillar scores below for a manual assessment.',
        strengths: ['Review scores above 70%', 'Identify consistent performers', 'Celebrate team wins'],
        concerns: ['Address scores below 60%', 'Follow up on low-trust indicators', 'Review communication gaps'],
        recommendations: ['Schedule focus groups', 'Create action plans per pillar', 'Set 90-day improvement targets', 'Report back to leadership'],
        overallScore: avg,
        sentiment: 'neutral',
      },
    });
  }
});

// POST /api/ai/esi-insights — ESI pulse AI analysis
// Returns JSON: {executiveSummary, strengths[], concerns[], recommendations[], overallSentiment, headline}
router.post('/esi-insights', authenticate, ensureAI, async (req, res) => {
  try {
    const { pulseCount, esiIndex, themeData } = req.body;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: 'You are an expert HR analyst for HRAI (HR Association of India), specialising in employee engagement across Indian organisations. Generate a concise executive ESI report. Respond ONLY with a JSON object (no markdown, no backticks). Keys: executiveSummary (string, 2-3 sentences), strengths (string[3]), concerns (string[3]), recommendations (string[4]), overallSentiment ("positive"|"neutral"|"needs attention"), headline (string, one punchy insight sentence).',
      messages: [{
        role: 'user',
        content: `HRAI Employee Sentiment Index Report. Total Responses: ${pulseCount || 0}. Overall EEI Score: ${esiIndex || 0}/100. Theme Scores: ${themeData || '{}'}. Generate insights for Indian HR professionals.`,
      }],
    });

    const text = (message.content || []).map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    res.json({ insight: JSON.parse(clean) });
  } catch (err) {
    console.error('[AI ESI Insights]', err);
    res.json({
      insight: {
        executiveSummary: 'AI insights temporarily unavailable.',
        strengths: ['Review theme scores above 70%', 'Identify engagement drivers', 'Note positive trends'],
        concerns: ['Address themes below 60%', 'Monitor attrition indicators', 'Review fairness perceptions'],
        recommendations: ['Conduct focus groups', 'Address top concerns', 'Set quarterly targets', 'Share findings with leadership'],
        overallSentiment: 'neutral',
        headline: 'ESI analysis requires manual review at this time.',
      },
    });
  }
});

// POST /api/ai/culture-insight — quick culture analysis
// Returns JSON: {summary, themes[], recommendations[]}
router.post('/culture-insight', authenticate, ensureAI, async (req, res) => {
  try {
    const { campaignTitle, aggregatedMetrics, responses } = req.body;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: 'Expert HR culture analyst. Respond ONLY with a JSON object (no markdown). Keys: summary (string), themes (string[3-4]), recommendations (string[3-4]).',
      messages: [{
        role: 'user',
        content: `Survey: ${campaignTitle || 'Untitled'}. Pillar Scores: ${JSON.stringify(aggregatedMetrics || {})}. ${responses || 0} responses.`,
      }],
    });

    const text = (message.content || []).map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    res.json({ insight: JSON.parse(clean) });
  } catch (err) {
    console.error('[AI Culture Insight]', err);
    res.json({
      insight: { summary: 'Analysis unavailable. Check connection.', themes: [], recommendations: [] },
    });
  }
});

module.exports = router;
