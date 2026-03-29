/**
 * Generate Missing Icons — uses Gemini Imagen API to generate missing icon files.
 *
 * Usage:
 *   node scripts/generate-missing-icons.js
 *
 * Env:
 *   GEMINI_API_KEY  — your Gemini API key
 *
 * Outputs:
 *   src/icons/tab-accessory.png  — Accessories tab icon
 *   src/icons/stat-gem.png       — Heart gem icon
 */

const fs = require('fs');
const path = require('path');

const ICONS = [
  {
    filename: 'tab-accessory.png',
    prompt: 'A cute pixel art icon of a cat wearing a small crown accessory, 64x64, transparent background, game UI icon style, clean edges, kawaii style',
  },
  {
    filename: 'stat-gem.png',
    prompt: 'A cute pixel art heart-shaped gemstone icon, pink and purple gradient, sparkling, 64x64, transparent background, game UI icon style, clean edges',
  },
];

const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'icons');

async function main() {
  // Dynamic import for @google/genai
  let GoogleGenAI;
  try {
    const mod = require('@google/genai');
    GoogleGenAI = mod.GoogleGenAI;
  } catch (e) {
    console.error('Please install @google/genai: npm install @google/genai');
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyC3dFkMULgvXaooBG-49_53dUabTRbWq58';
  if (!apiKey) {
    console.error('Set GEMINI_API_KEY environment variable');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const icon of ICONS) {
    const outputPath = path.join(OUTPUT_DIR, icon.filename);

    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`[Skip] ${icon.filename} already exists`);
      continue;
    }

    console.log(`[Generate] ${icon.filename} ...`);

    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-fast-generate-001',
        prompt: icon.prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const imageBytes = response.generatedImages[0].image.imageBytes;
        const buffer = Buffer.from(imageBytes, 'base64');
        fs.writeFileSync(outputPath, buffer);
        console.log(`[OK] ${icon.filename} (${buffer.length} bytes)`);
      } else {
        console.warn(`[Warn] No image generated for ${icon.filename}`);
      }
    } catch (err) {
      console.error(`[Error] ${icon.filename}: ${err.message}`);
    }

    // Rate limit pause
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\nDone! Missing icons generated.');
}

main().catch(console.error);
