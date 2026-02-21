import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function checkCaptcha() {
  const captchaSettings = await prisma.captchaSettings.findFirst();
  console.log("CAPTCHA Settings:");
  console.log("- Enabled:", captchaSettings?.captchaEnabled);
  console.log("- Required for Login:", captchaSettings?.requireCaptchaForLogin);
  console.log("- Provider:", captchaSettings?.provider);
  
  await prisma.$disconnect();
}

checkCaptcha();
