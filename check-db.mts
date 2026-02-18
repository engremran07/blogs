import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const p = new PrismaClient({ adapter });

// 1. Disable captcha in both settings tables
await p.captchaSettings.updateMany({ data: { captchaEnabled: false, requireCaptchaForLogin: false, requireCaptchaForRegistration: false, requireCaptchaForComments: false, requireCaptchaForContact: false, requireCaptchaForPasswordReset: false } });
console.log('✅ CaptchaSettings: captchaEnabled=false, all requireCaptchaFor*=false');

await p.siteSettings.updateMany({ data: { captchaEnabled: false } });
console.log('✅ SiteSettings: captchaEnabled=false');

// 2. Update admin password to meet policy (12+ chars, upper, lower, digit, special)
const newPassword = 'Admin@12345678';
const hash = await bcrypt.hash(newPassword, 12);
const result = await p.user.updateMany({ where: { email: 'admin@myblog.com' }, data: { password: hash } });
console.log(`✅ Updated admin password (${result.count} user(s)): ${newPassword}`);

// Verify
const cs = await p.captchaSettings.findFirst({ select: { captchaEnabled: true, requireCaptchaForLogin: true } });
console.log('Verify CaptchaSettings:', JSON.stringify(cs));
const ss = await p.siteSettings.findFirst({ select: { captchaEnabled: true } });
console.log('Verify SiteSettings:', JSON.stringify(ss));

await p.$disconnect();
