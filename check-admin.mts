import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function checkAdmin() {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@myblog.com' },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        password: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      console.log('❌ Admin user does NOT exist in database');
      console.log('\nAlternative users in database:');
      const users = await prisma.user.findMany({
        take: 5,
        select: {
          email: true,
          role: true,
          username: true,
          isEmailVerified: true,
        },
      });
      console.table(users);
      return;
    }

    console.log('✅ Admin user EXISTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: ${admin.email}`);
    console.log(`Username: ${admin.username}`);
    console.log(`Role: ${admin.role}`);
    console.log(`Email Verified: ${admin.isEmailVerified}`);
    console.log(`Created: ${admin.createdAt}`);
    console.log(`Updated: ${admin.updatedAt}`);
    console.log(`Password Hash: ${admin.password ? '✓ Set' : '❌ MISSING'}`);

    // Test password
    if (admin.password) {
      const testPassword = 'Admin@12345678';
      const isValid = await bcrypt.compare(testPassword, admin.password);
      console.log(`\nPassword Test for "${testPassword}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
