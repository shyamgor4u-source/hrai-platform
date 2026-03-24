// server.js — HRAI Intelligence Platform — Main Entry Point

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const path     = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes            = require('./src/routes/auth');
const userRoutes            = require('./src/routes/users');
const campaignRoutes        = require('./src/routes/campaigns');
const responseRoutes        = require('./src/routes/responses');
const pulseRoutes           = require('./src/routes/pulse');
const focusedSurveyRoutes   = require('./src/routes/focused-survey');
const aiRoutes              = require('./src/routes/ai');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",      // needed for Babel standalone
        "'unsafe-eval'",        // needed for Babel standalone JSX transpilation
        "cdnjs.cloudflare.com",
        "cdn.jsdelivr.net",
      ],
      styleSrc:  ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      imgSrc:    ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],   // API calls go to same origin now — no more direct Anthropic calls
      fontSrc:   ["'self'", "fonts.gstatic.com", "fonts.googleapis.com"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120,
  message: { error: 'Rate limit exceeded. Please slow down.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'AI request limit exceeded. Please wait a moment.' },
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/users',     apiLimiter, userRoutes);
app.use('/api/campaigns', apiLimiter, campaignRoutes);
app.use('/api/campaigns', apiLimiter, (req, res, next) => {
  // Mount response routes under /api/campaigns/:id/responses
  req.params.id = req.params.id || req.url.split('/')[1];
  next();
});

// Nested responses: /api/campaigns/:id/responses
const responsesRouter = express.Router({ mergeParams: true });
responsesRouter.use('/:id/responses', responseRoutes);
app.use('/api/campaigns', apiLimiter, responsesRouter);

app.use('/api/pulse',           apiLimiter, pulseRoutes);
app.use('/api/focused-survey',  apiLimiter, focusedSurveyRoutes);
app.use('/api/ai',              aiLimiter, aiRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ── Serve the React frontend ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback — all non-API routes → index.html
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Ensure DB tables exist ────────────────────────────────────────────────────
const prisma = require('./src/db');
(async () => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS focused_public_responses (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "surveyId" TEXT NOT NULL,
        name TEXT,
        email TEXT,
        answers JSONB NOT NULL,
        score INTEGER,
        "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] focused_public_responses table ready.');
  } catch (err) {
    console.error('[DB Init]', err.message);
  }
})();

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   HRAI Intelligence Platform — v2.0.0             ║
  ║   Server:   http://localhost:${PORT}                 ║
  ║   API:      http://localhost:${PORT}/api             ║
  ║   Health:   http://localhost:${PORT}/api/health      ║
  ║   DB:       ${process.env.DATABASE_URL || 'sqlite'}         ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
