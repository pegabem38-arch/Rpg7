import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. High quality brand SVG icon (RPG Social)
const brandSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <linearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#innerGrad)" stroke="rgba(255,255,255,0.15)" stroke-width="4" />

  <!-- Central RPG Emblem / Sparkle -->
  <g transform="translate(256, 256)" filter="url(#glow)">
    <!-- 4-point Diamond Star -->
    <path d="M 0 -130 Q 15 -35 85 -10 Q 15 15 0 130 Q -15 15 -85 -10 Q -15 -35 0 -130 Z" fill="url(#bgGrad)" />
    <!-- Secondary diagonal accent star -->
    <path d="M 0 -70 Q 10 -20 50 -5 Q 10 10 0 70 Q -10 10 -50 -5 Q -10 -20 0 -70 Z" fill="#ffffff" opacity="0.9" transform="rotate(45)" />
    <!-- Core Bright Dot -->
    <circle cx="0" cy="0" r="18" fill="#ffffff" />
  </g>

  <!-- Text RPG Subtitle -->
  <text x="256" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" text-anchor="middle" fill="#ffffff" letter-spacing="8">RPG</text>
</svg>`;

// 2. Maskable SVG icon with 15% safe padding
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#09090b"/>
      <stop offset="50%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>

  <!-- Full Bleed Background for Android safe zone -->
  <rect width="512" height="512" fill="url(#bgGradMask)" />
  <circle cx="256" cy="256" r="230" fill="none" stroke="url(#accentGrad)" stroke-width="6" opacity="0.6"/>

  <!-- Content scaled within safe-zone (inner 75%) -->
  <g transform="translate(256, 230) scale(0.85)">
    <path d="M 0 -130 Q 15 -35 85 -10 Q 15 15 0 130 Q -15 15 -85 -10 Q -15 -35 0 -130 Z" fill="url(#accentGrad)" />
    <path d="M 0 -70 Q 10 -20 50 -5 Q 10 10 0 70 Q -10 10 -50 -5 Q -10 -20 0 -70 Z" fill="#ffffff" opacity="0.95" transform="rotate(45)" />
    <circle cx="0" cy="0" r="18" fill="#ffffff" />
  </g>

  <text x="256" y="390" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" text-anchor="middle" fill="#ffffff" letter-spacing="8">RPG</text>
</svg>`;

async function generate() {
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), brandSvg);
  fs.writeFileSync(path.join(publicDir, 'icon-maskable.svg'), maskableSvg);

  const svgBuffer = Buffer.from(brandSvg);
  const maskableBuffer = Buffer.from(maskableSvg);

  // Generate 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // Generate 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // Generate maskable 512x512
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Generate Apple Touch Icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Generate Favicon (64x64)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('All PWA icons generated successfully in /public!');
}

generate().catch(console.error);
