/**
 * Generate Expression Icons — uses Gemini Imagen API to generate pixel-art
 * expression icons for the cat's floating emoji replacement.
 *
 * Usage:
 *   node scripts/generate-expr-icons.js
 *
 * Env:
 *   GEMINI_API_KEY  — your Gemini API key
 *
 * Outputs:
 *   src/icons/expr-*.png  — 10 pixel-art expression icons (64x64, transparent bg)
 */

const fs = require('fs');
const path = require('path');

const ICONS = [
  {
    filename: 'expr-curious.png',
    prompt: 'pixel art question mark inside a small speech bubble, blue-purple color, 64x64, transparent background, kawaii style, clean edges, game UI icon style',
  },
  {
    filename: 'expr-working.png',
    prompt: 'pixel art lightning bolt, golden yellow glowing, 64x64, transparent background, kawaii style, clean edges, game UI icon style',
  },
  {
    filename: 'expr-proud.png',
    prompt: 'pixel art sparkling star burst, gold and pink sparkles, 64x64, transparent background, kawaii style, clean edges, game UI icon style',
  },
  {
    filename: 'expr-sleepy.png',
    prompt: 'pixel art Zzz sleep symbol, blue color, floating letters, 64x64, transparent background, kawaii style, clean edges, game UI icon style',
  },
  {
    filename: 'expr-alert.png',
    prompt: 'pixel art exclamation mark, bold red color, 64x64, transparent background, kawaii style, clean edges, game UI icon style',
  },
  {
    filename: 'expr-star.png',
    prompt: 'pixel art five-pointed star, golden yellow, shiny, 64x64, transparent background, kawaii style, clean edges, game UI icon style',
  },
  {
    filename: 'expr-heart.png',
    prompt: 'pixel art heart, pink red color, cute, 64x64, transparent background, kawaii style, clean edges, game UI icon style',
  },
  {
    filename: 'expr-anger.png',
    prompt: 'pixel art anger cross symbol, red color, manga style anger mark, 64x64, transparent background, kawaii style, clean edges, game UI icon style',
  },
  {
    filename: 'expr-note.png',
    prompt: 'pixel art music note, teal blue-green color, single eighth note, 64x64, transparent background, kawaii style, clean edges, game UI icon style',
  },
  {
    filename: 'expr-sweat.png',
    prompt: 'pixel art sweat drop, blue color, anime style sweat bead, 64x64, transparent background, kawaii style, clean edges, game UI icon style',
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

  let generated = 0;
  let skipped = 0;

  for (const icon of ICONS) {
    const outputPath = path.join(OUTPUT_DIR, icon.filename);

    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`[Skip] ${icon.filename} already exists`);
      skipped++;
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
        generated++;
      } else {
        console.warn(`[Warn] No image generated for ${icon.filename}`);
      }
    } catch (err) {
      console.error(`[Error] ${icon.filename}: ${err.message}`);
    }

    // Rate limit pause
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\nDone! Generated: ${generated}, Skipped: ${skipped}, Total: ${ICONS.length}`);
}

main().catch(console.error);
