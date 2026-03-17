// scripts/seed.js — Seed default admin accounts (matches v1 HRAI_ADMINS)

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMINS = [
  {
    email: 'team@hrassociationofindia.com',
    password: 'HRAI@2026',
    name: 'HRAI Master Admin',
    role: 'superadmin',
  },
  {
    email: 'admin2@hrassociationofindia.com',
    password: 'Hr@admin2',
    name: 'Priya Sharma',
    role: 'admin',
  },
  {
    email: 'admin3@hrassociationofindia.com',
    password: 'Hr@admin3',
    name: 'Rahul Menon',
    role: 'admin',
  },
];

async function main() {
  console.log('🌱 Seeding HRAI admin accounts...\n');

  for (const admin of ADMINS) {
    const existing = await prisma.user.findUnique({ where: { email: admin.email } });

    if (!existing) {
      const hashed = await bcrypt.hash(admin.password, 12);
      await prisma.user.create({
        data: {
          email: admin.email,
          password: hashed,
          name: admin.name,
          role: admin.role,
          verified: true,
          permissions: { dashboard: true, campaigns: true, insights: true, certification: admin.role === 'superadmin' },
        },
      });
      console.log(`✅ ${admin.role}: ${admin.email} / ${admin.password}`);
    } else {
      console.log(`⏭️  ${admin.email} already exists, skipping.`);
    }
  }

  console.log('\n🎉 Seeding complete!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
