/**
 * GET /api/captcha/challenge
 *
 * Server-side challenge generation for the in-house CAPTCHA provider.
 * Generates a random code, stores the answer in DB with expiry,
 * and returns an SVG image (as data URI) + challenge ID.
 *
 * The answer is NEVER sent to the client — only the image and ID.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { CHALLENGE_TTL_MS, DEFAULT_CODE_LENGTH } from '@/features/captcha/utils/constants';
import { createLogger } from '@/server/observability/logger';

const logger = createLogger('api/captcha/challenge');

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateChallengeSvg(code: string): string {
  const width = 200;
  const height = 60;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="100%" height="100%" fill="#f0f4f8"/>`;

  // Noise lines
  for (let i = 0; i < 8; i++) {
    const x1 = randomInt(0, width);
    const y1 = randomInt(0, height);
    const x2 = randomInt(0, width);
    const y2 = randomInt(0, height);
    const colors = ['#cbd5e1', '#93c5fd', '#c4b5fd', '#fca5a5', '#86efac'];
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors[randomInt(0, colors.length - 1)]}" stroke-width="${randomInt(1, 3)}" opacity="0.5"/>`;
  }

  // Noise dots
  for (let i = 0; i < 40; i++) {
    svg += `<circle cx="${randomInt(0, width)}" cy="${randomInt(0, height)}" r="${randomInt(1, 3)}" fill="#94a3b8" opacity="${(randomInt(2, 5) / 10).toFixed(1)}"/>`;
  }

  // Text characters with distortion
  const startX = 20;
  const charWidth = (width - 40) / code.length;
  for (let i = 0; i < code.length; i++) {
    const x = startX + i * charWidth + randomInt(-3, 3);
    const y = 38 + randomInt(-5, 5);
    const rot = randomInt(-15, 15);
    const size = randomInt(20, 28);
    const colors = ['#1e293b', '#1e40af', '#7c3aed', '#b91c1c', '#047857'];
    svg += `<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" font-weight="bold" fill="${colors[randomInt(0, colors.length - 1)]}" transform="rotate(${rot},${x},${y})">${code[i]}</text>`;
  }

  svg += '</svg>';
  return svg;
}

export async function GET() {
  try {
    // Generate random numeric code
    const codeLength = DEFAULT_CODE_LENGTH;
    const digits = Array.from({ length: codeLength }, () => randomInt(0, 9));
    const answer = digits.join('');

    // Generate SVG image
    const svg = generateChallengeSvg(answer);
    const image = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    // Store challenge in DB with expiry
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
    const challenge = await prisma.captchaChallenge.create({
      data: {
        answer,
        expiresAt,
        maxAttempts: 3,
      },
    });

    // Return image + ID (never the answer!)
    return NextResponse.json({
      image,
      captchaId: challenge.id,
    });
  } catch (error) {
    logger.error('Challenge generation error:', { error });
    return NextResponse.json(
      { error: 'Failed to generate challenge' },
      { status: 500 },
    );
  }
}
