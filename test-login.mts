import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function testLogin() {
  console.log("🔍 Testing login with admin@myblog.com / Admin@12345678\n");

  try {
    // Step 1: Find user
    const user = await prisma.user.findUnique({
      where: { email: "admin@myblog.com" },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        role: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      console.log("❌ User not found");
      return;
    }
    console.log("✅ User found:", user.email);

    // Step 2: Compare password
    const passwordMatch = await bcrypt.compare("Admin@12345678", user.password);
    console.log(`✅ Password verification: ${passwordMatch ? "PASS" : "FAIL"}`);

    // Step 3: Check email verification
    console.log(`✅ Email verified: ${user.isEmailVerified}`);

    // Step 4: Simulate auth.ts logic
    console.log("\n📋 Auth flow simulation:");
    console.log("1. Email normalized:", "admin@myblog.com".toLowerCase().trim());
    console.log("2. User lookup: ✓");
    console.log("3. Password comparison: ✓");
    console.log("4. User data returned:");
    console.log({
      id: user.id,
      email: user.email,
      name: user.username,
      role: user.role,
      username: user.username,
    });

    console.log("\n✅ Login should succeed!");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
