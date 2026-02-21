const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@myblog.com' },
      select: { id: true, email: true, name: true, isActive: true, role: true, emailVerified: true, createdAt: true }
    });
    
    if (admin) {
      console.log('✓ Admin user found:');
      console.log(JSON.stringify(admin, null, 2));
      console.log('\n⚠️  User status:');
      console.log('- Active:', admin.isActive);
      console.log('- Email verified:', admin.emailVerified);
      console.log('- Role:', admin.role);
    } else {
      console.log('✗ Admin user NOT found in database');
    }
  } catch (err) {
    console.error('Database error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
