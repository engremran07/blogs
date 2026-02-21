import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if admin user exists
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@myblog.com' },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        isActive: true, 
        role: true, 
        emailVerified: true, 
        createdAt: true,
        password: true
      }
    });
    
    if (admin) {
      console.log('✓ Admin user found:');
      console.log(`  Email: ${admin.email}`);
      console.log(`  Name: ${admin.name}`);
      console.log(`  Role: ${admin.role}`);
      console.log(`  Active: ${admin.isActive}`);
      console.log(`  Email Verified: ${admin.emailVerified}`);
      console.log(`  Created: ${admin.createdAt}`);
      console.log(`  Has password hash: ${!!admin.password}`);
      
      if (admin.password) {
        // Test password verification
        const testPassword = 'Admin@12345678';
        const isValid = await bcrypt.compare(testPassword, admin.password);
        console.log(`\n✓ Password verification test:`);
        console.log(`  Test password: ${testPassword}`);
        console.log(`  Password valid: ${isValid}`);
      }
    } else {
      console.log('✗ Admin user NOT found - admin@myblog.com does not exist');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
