/**
 * Generate ChatCat app icon — a cute cat face on a gradient background.
 * Outputs: assets/icon.png (256x256) and assets/icon.icns-ready (for mac)
 *
 * Uses sharp to composite SVG → PNG.
 */
const sharp = require('sharp');
const path = require('path');

const SIZE = 512;

// SVG cat icon — cute cat face with big eyes
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
    <linearGradient id="catBody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD89B"/>
      <stop offset="100%" style="stop-color:#F5A623"/>
    </linearGradient>
  </defs>

  <!-- Rounded background -->
  <rect width="512" height="512" rx="100" ry="100" fill="url(#bg)"/>

  <!-- Cat ears -->
  <!-- Left ear outer -->
  <polygon points="120,200 160,80 230,185" fill="#F5A623"/>
  <!-- Left ear inner -->
  <polygon points="140,190 165,105 215,185" fill="#FFB6C1"/>
  <!-- Right ear outer -->
  <polygon points="392,200 352,80 282,185" fill="#F5A623"/>
  <!-- Right ear inner -->
  <polygon points="372,190 347,105 297,185" fill="#FFB6C1"/>

  <!-- Cat face -->
  <ellipse cx="256" cy="290" rx="150" ry="140" fill="url(#catBody)"/>

  <!-- Eyes -->
  <!-- Left eye white -->
  <ellipse cx="205" cy="265" rx="35" ry="38" fill="white"/>
  <!-- Left eye pupil -->
  <ellipse cx="210" cy="268" rx="20" ry="25" fill="#333"/>
  <!-- Left eye highlight -->
  <ellipse cx="218" cy="258" rx="8" ry="8" fill="white"/>

  <!-- Right eye white -->
  <ellipse cx="307" cy="265" rx="35" ry="38" fill="white"/>
  <!-- Right eye pupil -->
  <ellipse cx="312" cy="268" rx="20" ry="25" fill="#333"/>
  <!-- Right eye highlight -->
  <ellipse cx="320" cy="258" rx="8" ry="8" fill="white"/>

  <!-- Nose -->
  <polygon points="256,310 248,322 264,322" fill="#FF8A80"/>

  <!-- Mouth -->
  <path d="M248,322 Q240,340 230,335" stroke="#666" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M264,322 Q272,340 282,335" stroke="#666" stroke-width="2.5" fill="none" stroke-linecap="round"/>

  <!-- Whiskers -->
  <!-- Left -->
  <line x1="110" y1="290" x2="185" y2="305" stroke="#999" stroke-width="2" stroke-linecap="round"/>
  <line x1="108" y1="310" x2="185" y2="315" stroke="#999" stroke-width="2" stroke-linecap="round"/>
  <line x1="115" y1="330" x2="185" y2="325" stroke="#999" stroke-width="2" stroke-linecap="round"/>
  <!-- Right -->
  <line x1="327" y1="305" x2="402" y2="290" stroke="#999" stroke-width="2" stroke-linecap="round"/>
  <line x1="327" y1="315" x2="404" y2="310" stroke="#999" stroke-width="2" stroke-linecap="round"/>
  <line x1="327" y1="325" x2="397" y2="330" stroke="#999" stroke-width="2" stroke-linecap="round"/>

  <!-- Blush -->
  <ellipse cx="175" cy="310" rx="20" ry="12" fill="#FFB6C1" opacity="0.5"/>
  <ellipse cx="337" cy="310" rx="20" ry="12" fill="#FFB6C1" opacity="0.5"/>

  <!-- Chat bubble hint -->
  <ellipse cx="405" cy="130" rx="55" ry="40" fill="white" opacity="0.9"/>
  <polygon points="380,160 370,185 395,155" fill="white" opacity="0.9"/>
  <text x="405" y="138" font-family="Arial,sans-serif" font-size="32" font-weight="bold" fill="#764ba2" text-anchor="middle">Hi!</text>
</svg>`;

async function generate() {
  const outDir = path.join(__dirname, '..', 'assets');
  const pngPath = path.join(outDir, 'icon.png');

  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .png()
    .toFile(pngPath);

  console.log(`✅ Generated ${pngPath} (512x512)`);

  // Also generate 256x256 version for Windows
  const png256Path = path.join(outDir, 'icon-256.png');
  await sharp(Buffer.from(svg))
    .resize(256, 256)
    .png()
    .toFile(png256Path);

  console.log(`✅ Generated ${png256Path} (256x256)`);
}

generate().catch(err => {
  console.error('Failed to generate icon:', err);
  process.exit(1);
});
