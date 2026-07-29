import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function createOgBanner() {
  const width = 1200;
  const height = 630;

  const svgBanner = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="50%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>

      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.03"/>
      </linearGradient>

      <linearGradient id="accentGlow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="50%" stop-color="#a855f7"/>
        <stop offset="100%" stop-color="#38bdf8"/>
      </linearGradient>

      <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#e0e7ff"/>
      </linearGradient>

      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="30" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#bg)"/>

    <!-- Decorative glowing spheres -->
    <circle cx="150" cy="120" r="220" fill="#6366f1" opacity="0.25" filter="url(#glow)"/>
    <circle cx="1050" cy="520" r="260" fill="#38bdf8" opacity="0.2" filter="url(#glow)"/>

    <!-- Subtle Grid Lines -->
    <g opacity="0.08" stroke="#ffffff" stroke-width="1">
      <path d="M 0,100 L 1200,100 M 0,200 L 1200,200 M 0,300 L 1200,300 M 0,400 L 1200,400 M 0,500 L 1200,500" />
      <path d="M 200,0 L 200,630 M 400,0 L 400,630 M 600,0 L 600,630 M 800,0 L 800,630 M 1000,0 L 1000,630" />
    </g>

    <!-- Main Card Container -->
    <rect x="70" y="60" width="1060" height="510" rx="24" fill="url(#cardGrad)" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>

    <!-- Top Accent Bar -->
    <rect x="70" y="60" width="1060" height="6" rx="3" fill="url(#accentGlow)"/>

    <!-- Brand Badge -->
    <g transform="translate(120, 115)">
      <rect width="210" height="42" rx="21" fill="#6366f1" opacity="0.25" stroke="#818cf8" stroke-width="1.5"/>
      <circle cx="24" cy="21" r="8" fill="#38bdf8"/>
      <text x="44" y="26" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="15" fill="#38bdf8" letter-spacing="1.5">TECH DIRECTORY</text>
    </g>

    <!-- Main Title -->
    <text x="120" y="235" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="64" fill="url(#textGrad)" letter-spacing="-1">
      gadgetsprohub
    </text>

    <!-- Subtitle / Tagline -->
    <text x="120" y="300" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="28" fill="#cbd5e1" letter-spacing="-0.5">
      Premium Electronics, Smart Gear &amp; Tech Accessory Directory
    </text>

    <!-- Description -->
    <text x="120" y="360" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="20" fill="#94a3b8" width="850">
      Discover curated specs, hands-on expert reviews, price comparisons, and verified deals.
    </text>

    <!-- Pill Badges at Bottom -->
    <g transform="translate(120, 440)">
      <!-- Pill 1 -->
      <g>
        <rect width="210" height="48" rx="12" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1"/>
        <text x="24" y="30" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" fill="#e2e8f0">⚡ Smart Gear Specs</text>
      </g>
      <!-- Pill 2 -->
      <g transform="translate(230, 0)">
        <rect width="220" height="48" rx="12" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1"/>
        <text x="24" y="30" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" fill="#e2e8f0">🔍 Verified Tech Deals</text>
      </g>
      <!-- Pill 3 -->
      <g transform="translate(470, 0)">
        <rect width="220" height="48" rx="12" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1"/>
        <text x="24" y="30" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" fill="#e2e8f0">📱 In-Depth Reviews</text>
      </g>
    </g>

    <!-- Domain Watermark in Bottom Right -->
    <text x="1080" y="525" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="22" fill="#38bdf8" opacity="0.9">
      gadgetsprohub.onrender.com
    </text>
  </svg>
  `;

  const outputPublicPath = path.join(process.cwd(), 'public', 'og-banner.png');
  const outputDistPath = path.join(process.cwd(), 'dist', 'og-banner.png');

  const buffer = await sharp(Buffer.from(svgBanner))
    .png({ quality: 95 })
    .toBuffer();

  fs.writeFileSync(outputPublicPath, buffer);
  console.log('Successfully generated public/og-banner.png');

  if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
    fs.writeFileSync(outputDistPath, buffer);
    console.log('Successfully copied og-banner.png to dist/');
  }
}

createOgBanner().catch(console.error);
