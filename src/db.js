// src/db.js — Prisma singleton (prevents multiple instances in dev)

const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Reuse client across hot-reloads in development
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({ log: ['query'] });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
