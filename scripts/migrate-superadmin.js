// scripts/migrate-superadmin.js — One-time: change superadmin to shyam.gor@outlook.com, demote old superadmin
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Migrating superadmin credentials...\n');

  // 1. Demote old superadmin (team@hrassociationofindia.com) to admin
  const oldSuper = await prisma.user.findUnique({ where: { email: 'team@hrassociationofindia.com' } });
  if (oldSuper) {
    await prisma.user.update({
      where: { email: 'team@hrassociationofindia.com' },
      data: {
        role: 'admin',
        name: 'HRAI Admin',
        permissions: { dashboard: true, campaigns: true, insights: true, certification: false },
      },
    });
    console.log('✅ Demoted team@hrassociationofindia.com → admin');
  }

  // 2. Create or update new superadmin
  const newEmail = 'shyam.gor@outlook.com';
  const newPassword = await bcrypt.hash('HRAI@123', 12);
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });

  if (existing) {
    await prisma.user.update({
      where: { email: newEmail },
      data: {
        role: 'superadmin',
        name: 'Shyam Gor',
        password: newPassword,
        verified: true,
        permissions: { dashboard: true, campaigns: true, insights: true, certification: true },
      },
    });
    console.log(`✅ Updated ${newEmail} → superadmin`);
  } else {
    await prisma.user.create({
      data: {
        email: newEmail,
        password: newPassword,
        name: 'Shyam Gor',
        role: 'superadmin',
        verified: true,
        permissions: { dashboard: true, campaigns: true, insights: true, certification: true },
      },
    });
    console.log(`✅ Created ${newEmail} as superadmin`);
  }

  console.log('\n🎉 Migration complete!');
}

main()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
