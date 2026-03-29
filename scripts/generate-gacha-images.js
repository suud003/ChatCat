/**
 * Generate Gacha Item Images — uses Gemini Imagen API to batch-generate all gacha item images.
 *
 * Usage:
 *   npm install @google/genai
 *   node scripts/generate-gacha-images.js
 *
 * Env:
 *   GEMINI_API_KEY  — your Gemini API key (or uses the hardcoded fallback)
 *
 * Outputs:
 *   src/gacha-items/{item.id}.png   — 125 item images (1:1, pixel art style)
 *   src/icons/tab-gacha.png         — Gacha tab icon
 *   src/illustrations/gacha-header.png  — Header illustration
 *   src/illustrations/gacha-empty.png   — Empty collection illustration
 */

const fs = require('fs');
const path = require('path');

// ── Inline item data (mirrors gacha-items.js, avoids ESM import issues) ──
const GACHA_ITEMS = [];

// Helper to push items
function addItems(items) { GACHA_ITEMS.push(...items); }

// N items (50)
addItems([
  { id: 'g-n-ribbon-red', name: '红色蝴蝶结', rarity: 'N', desc: 'a cute red ribbon bow' },
  { id: 'g-n-ribbon-pink', name: '粉色蝴蝶结', rarity: 'N', desc: 'a cute pink ribbon bow' },
  { id: 'g-n-ribbon-blue', name: '蓝色蝴蝶结', rarity: 'N', desc: 'a cute blue ribbon bow' },
  { id: 'g-n-ribbon-yellow', name: '黄色蝴蝶结', rarity: 'N', desc: 'a cute yellow ribbon bow' },
  { id: 'g-n-ribbon-purple', name: '紫色蝴蝶结', rarity: 'N', desc: 'a cute purple ribbon bow' },
  { id: 'g-n-bell-gold', name: '金色铃铛', rarity: 'N', desc: 'a golden jingle bell' },
  { id: 'g-n-bell-silver', name: '银色铃铛', rarity: 'N', desc: 'a silver jingle bell' },
  { id: 'g-n-bell-bronze', name: '铜色铃铛', rarity: 'N', desc: 'a bronze jingle bell' },
  { id: 'g-n-bell-crystal', name: '水晶铃铛', rarity: 'N', desc: 'a crystal clear bell' },
  { id: 'g-n-bell-rainbow', name: '彩虹铃铛', rarity: 'N', desc: 'a rainbow colored bell' },
  { id: 'g-n-scarf-red', name: '红色围巾', rarity: 'N', desc: 'a warm red scarf' },
  { id: 'g-n-scarf-blue', name: '蓝色围巾', rarity: 'N', desc: 'a cool blue scarf' },
  { id: 'g-n-scarf-green', name: '绿色围巾', rarity: 'N', desc: 'a green scarf' },
  { id: 'g-n-scarf-white', name: '白色围巾', rarity: 'N', desc: 'a white scarf' },
  { id: 'g-n-scarf-striped', name: '条纹围巾', rarity: 'N', desc: 'a striped scarf' },
  { id: 'g-n-hairpin-star', name: '星星发卡', rarity: 'N', desc: 'a star shaped hair clip' },
  { id: 'g-n-hairpin-heart', name: '爱心发卡', rarity: 'N', desc: 'a heart shaped hair clip' },
  { id: 'g-n-hairpin-moon', name: '月亮发卡', rarity: 'N', desc: 'a crescent moon hair clip' },
  { id: 'g-n-hairpin-flower', name: '花朵发卡', rarity: 'N', desc: 'a flower hair clip' },
  { id: 'g-n-hairpin-crown', name: '皇冠发卡', rarity: 'N', desc: 'a mini crown hair clip' },
  { id: 'g-n-glove-white', name: '白色手套', rarity: 'N', desc: 'white gloves' },
  { id: 'g-n-glove-pink', name: '粉色手套', rarity: 'N', desc: 'pink gloves' },
  { id: 'g-n-glove-black', name: '黑色手套', rarity: 'N', desc: 'black gloves' },
  { id: 'g-n-glove-striped', name: '条纹手套', rarity: 'N', desc: 'striped gloves' },
  { id: 'g-n-glove-knit', name: '针织手套', rarity: 'N', desc: 'knitted mittens' },
  { id: 'g-n-sock-white', name: '白色袜子', rarity: 'N', desc: 'white socks' },
  { id: 'g-n-sock-striped', name: '条纹袜子', rarity: 'N', desc: 'striped socks' },
  { id: 'g-n-sock-polka', name: '波点袜子', rarity: 'N', desc: 'polka dot socks' },
  { id: 'g-n-sock-paw', name: '猫爪袜子', rarity: 'N', desc: 'socks with cat paw prints' },
  { id: 'g-n-sock-rainbow', name: '彩虹袜子', rarity: 'N', desc: 'rainbow socks' },
  { id: 'g-n-necklace-pearl', name: '珍珠项链', rarity: 'N', desc: 'a pearl necklace' },
  { id: 'g-n-necklace-shell', name: '贝壳项链', rarity: 'N', desc: 'a seashell necklace' },
  { id: 'g-n-necklace-heart', name: '爱心吊坠', rarity: 'N', desc: 'a heart pendant necklace' },
  { id: 'g-n-necklace-star', name: '星星吊坠', rarity: 'N', desc: 'a star pendant necklace' },
  { id: 'g-n-necklace-fish', name: '小鱼吊坠', rarity: 'N', desc: 'a fish pendant necklace' },
  { id: 'g-n-badge-paw', name: '猫爪徽章', rarity: 'N', desc: 'a cat paw badge pin' },
  { id: 'g-n-badge-fish', name: '小鱼徽章', rarity: 'N', desc: 'a fish badge pin' },
  { id: 'g-n-badge-star', name: '星星徽章', rarity: 'N', desc: 'a star badge pin' },
  { id: 'g-n-badge-heart', name: '爱心徽章', rarity: 'N', desc: 'a heart badge pin' },
  { id: 'g-n-badge-music', name: '音符徽章', rarity: 'N', desc: 'a music note badge pin' },
  { id: 'g-n-sticker-smile', name: '笑脸贴纸', rarity: 'N', desc: 'a smiley face sticker' },
  { id: 'g-n-sticker-cat', name: '猫脸贴纸', rarity: 'N', desc: 'a cat face sticker' },
  { id: 'g-n-sticker-sparkle', name: '亮晶晶贴纸', rarity: 'N', desc: 'a sparkle sticker' },
  { id: 'g-n-sticker-cloud', name: '云朵贴纸', rarity: 'N', desc: 'a cloud sticker' },
  { id: 'g-n-sticker-flame', name: '火焰贴纸', rarity: 'N', desc: 'a flame sticker' },
  { id: 'g-n-flower-sakura', name: '樱花', rarity: 'N', desc: 'cherry blossom flower' },
  { id: 'g-n-flower-rose', name: '玫瑰', rarity: 'N', desc: 'a red rose' },
  { id: 'g-n-flower-daisy', name: '雏菊', rarity: 'N', desc: 'a white daisy' },
  { id: 'g-n-flower-tulip', name: '郁金香', rarity: 'N', desc: 'a tulip flower' },
  { id: 'g-n-flower-sunflower', name: '向日葵', rarity: 'N', desc: 'a sunflower' },
]);

// R items (40)
addItems([
  { id: 'g-r-hat-beret', name: '贝雷帽', rarity: 'R', desc: 'a french beret hat' },
  { id: 'g-r-hat-tophat', name: '礼帽', rarity: 'R', desc: 'a gentleman top hat' },
  { id: 'g-r-hat-witch', name: '女巫帽', rarity: 'R', desc: 'a witch hat with stars' },
  { id: 'g-r-hat-santa', name: '圣诞帽', rarity: 'R', desc: 'a red santa hat' },
  { id: 'g-r-hat-crown', name: '小皇冠', rarity: 'R', desc: 'a small golden crown' },
  { id: 'g-r-hat-sailor', name: '水手帽', rarity: 'R', desc: 'a sailor hat' },
  { id: 'g-r-hat-chef', name: '厨师帽', rarity: 'R', desc: 'a chef toque hat' },
  { id: 'g-r-hat-detective', name: '侦探帽', rarity: 'R', desc: 'a sherlock holmes deerstalker hat' },
  { id: 'g-r-glasses-round', name: '圆框眼镜', rarity: 'R', desc: 'round frame glasses' },
  { id: 'g-r-glasses-heart', name: '爱心眼镜', rarity: 'R', desc: 'heart shaped glasses' },
  { id: 'g-r-glasses-star', name: '星星眼镜', rarity: 'R', desc: 'star shaped glasses' },
  { id: 'g-r-glasses-monocle', name: '单片眼镜', rarity: 'R', desc: 'a gentleman monocle' },
  { id: 'g-r-glasses-sun', name: '太阳眼镜', rarity: 'R', desc: 'cool sunglasses' },
  { id: 'g-r-glasses-pixel', name: '像素眼镜', rarity: 'R', desc: 'pixel art thug life glasses' },
  { id: 'g-r-cape-red', name: '红色披风', rarity: 'R', desc: 'a red superhero cape' },
  { id: 'g-r-cape-royal', name: '皇家披风', rarity: 'R', desc: 'a royal purple cape with fur trim' },
  { id: 'g-r-cape-magic', name: '魔法斗篷', rarity: 'R', desc: 'a magic wizard cloak with stars' },
  { id: 'g-r-cape-night', name: '夜幕披风', rarity: 'R', desc: 'a dark night sky cape with stars' },
  { id: 'g-r-cape-flower', name: '花瓣披风', rarity: 'R', desc: 'a cape made of flower petals' },
  { id: 'g-r-cape-frost', name: '霜之披风', rarity: 'R', desc: 'an icy frost cape' },
  { id: 'g-r-wing-angel', name: '天使翅膀', rarity: 'R', desc: 'white angel wings' },
  { id: 'g-r-wing-bat', name: '蝙蝠翅膀', rarity: 'R', desc: 'dark bat wings' },
  { id: 'g-r-wing-butterfly', name: '蝴蝶翅膀', rarity: 'R', desc: 'colorful butterfly wings' },
  { id: 'g-r-wing-fairy', name: '精灵翅膀', rarity: 'R', desc: 'translucent fairy wings' },
  { id: 'g-r-wing-dragon', name: '龙翼', rarity: 'R', desc: 'small dragon wings' },
  { id: 'g-r-weapon-sword', name: '小木剑', rarity: 'R', desc: 'a small wooden sword' },
  { id: 'g-r-weapon-wand', name: '魔法棒', rarity: 'R', desc: 'a sparkling magic wand' },
  { id: 'g-r-weapon-shield', name: '迷你盾', rarity: 'R', desc: 'a mini shield' },
  { id: 'g-r-weapon-bow', name: '小弓箭', rarity: 'R', desc: 'a small bow and arrow' },
  { id: 'g-r-weapon-staff', name: '法杖', rarity: 'R', desc: 'a magical staff with glowing orb' },
  { id: 'g-r-boot-leather', name: '皮靴', rarity: 'R', desc: 'leather boots' },
  { id: 'g-r-boot-rain', name: '雨靴', rarity: 'R', desc: 'rubber rain boots' },
  { id: 'g-r-boot-knight', name: '骑士靴', rarity: 'R', desc: 'knight armor boots' },
  { id: 'g-r-boot-fluffy', name: '毛毛靴', rarity: 'R', desc: 'fluffy fur boots' },
  { id: 'g-r-boot-sneaker', name: '运动鞋', rarity: 'R', desc: 'colorful sneakers' },
  { id: 'g-r-tail-fox', name: '狐狸尾巴', rarity: 'R', desc: 'a fluffy fox tail' },
  { id: 'g-r-tail-devil', name: '恶魔尾巴', rarity: 'R', desc: 'a pointed devil tail' },
  { id: 'g-r-tail-bunny', name: '兔尾巴', rarity: 'R', desc: 'a round fluffy bunny tail' },
  { id: 'g-r-tail-fish', name: '美人鱼尾', rarity: 'R', desc: 'a shimmering mermaid tail' },
  { id: 'g-r-tail-phoenix', name: '凤尾羽', rarity: 'R', desc: 'a phoenix feather tail' },
]);

// SR items (20)
addItems([
  { id: 'g-sr-skin-starcat', name: '星空猫', rarity: 'SR', desc: 'a cute cat in a starry night sky costume' },
  { id: 'g-sr-skin-sakuracat', name: '樱花猫', rarity: 'SR', desc: 'a cute cat in cherry blossom kimono' },
  { id: 'g-sr-skin-piratecat', name: '海盗猫', rarity: 'SR', desc: 'a cute cat in pirate costume with eyepatch' },
  { id: 'g-sr-skin-magicgirl', name: '魔法少女猫', rarity: 'SR', desc: 'a cute cat as a magical girl with wand' },
  { id: 'g-sr-skin-ninjacat', name: '忍者猫', rarity: 'SR', desc: 'a cute cat in ninja outfit' },
  { id: 'g-sr-skin-chefcat', name: '厨师猫', rarity: 'SR', desc: 'a cute cat in chef uniform with chef hat' },
  { id: 'g-sr-skin-detectivecat', name: '侦探猫', rarity: 'SR', desc: 'a cute cat as detective with magnifying glass' },
  { id: 'g-sr-skin-elfcat', name: '精灵猫', rarity: 'SR', desc: 'a cute cat as forest elf with pointed ears' },
  { id: 'g-sr-skin-vampirecat', name: '吸血鬼猫', rarity: 'SR', desc: 'a cute cat as vampire with fangs and cape' },
  { id: 'g-sr-skin-mechacat', name: '机甲猫', rarity: 'SR', desc: 'a cute cat in robot mecha armor' },
  { id: 'g-sr-skin-astronaut', name: '宇航员猫', rarity: 'SR', desc: 'a cute cat in astronaut spacesuit' },
  { id: 'g-sr-skin-samurai', name: '武士猫', rarity: 'SR', desc: 'a cute cat in samurai armor with katana' },
  { id: 'g-sr-skin-idol', name: '偶像猫', rarity: 'SR', desc: 'a cute cat as idol singer with microphone' },
  { id: 'g-sr-skin-scientist', name: '科学家猫', rarity: 'SR', desc: 'a cute cat as scientist with lab coat' },
  { id: 'g-sr-skin-knight', name: '骑士猫', rarity: 'SR', desc: 'a cute cat as holy knight with shield' },
  { id: 'g-sr-skin-mermaid', name: '人鱼猫', rarity: 'SR', desc: 'a cute cat as mermaid princess' },
  { id: 'g-sr-skin-steampunk', name: '蒸汽朋克猫', rarity: 'SR', desc: 'a cute cat in steampunk gear with goggles' },
  { id: 'g-sr-skin-painter', name: '画家猫', rarity: 'SR', desc: 'a cute cat as painter with palette and brush' },
  { id: 'g-sr-skin-rockstar', name: '摇滚猫', rarity: 'SR', desc: 'a cute cat as rock star with guitar' },
  { id: 'g-sr-skin-pharaoh', name: '法老猫', rarity: 'SR', desc: 'a cute cat as egyptian pharaoh' },
]);

// SSR items (10)
addItems([
  { id: 'g-ssr-skin-dragonknight', name: '龙骑士猫', rarity: 'SSR', desc: 'a majestic cat as dragon knight riding a dragon' },
  { id: 'g-ssr-skin-cosmiccat', name: '宇宙猫', rarity: 'SSR', desc: 'a cosmic cat walking among galaxies and stars' },
  { id: 'g-ssr-skin-phoenixcat', name: '凤凰猫', rarity: 'SSR', desc: 'a cat reborn as phoenix with blazing fire wings' },
  { id: 'g-ssr-skin-icequeen', name: '冰霜女王', rarity: 'SSR', desc: 'a majestic ice queen cat with frost crown' },
  { id: 'g-ssr-skin-shadowcat', name: '暗影刺客', rarity: 'SSR', desc: 'a shadow assassin cat with dual daggers' },
  { id: 'g-ssr-skin-angelcat', name: '天使猫', rarity: 'SSR', desc: 'a divine angel cat with golden halo and wings' },
  { id: 'g-ssr-skin-demoncat', name: '恶魔猫', rarity: 'SSR', desc: 'a demon lord cat with horns and dark aura' },
  { id: 'g-ssr-skin-thundercat', name: '雷神猫', rarity: 'SSR', desc: 'a thunder god cat with lightning bolts' },
  { id: 'g-ssr-skin-seacat', name: '海神猫', rarity: 'SSR', desc: 'a sea god cat controlling ocean waves with trident' },
  { id: 'g-ssr-skin-valkyrie', name: '樱花女武神', rarity: 'SSR', desc: 'a valkyrie cat warrior among cherry blossoms' },
]);

// SSSR items (5)
addItems([
  { id: 'g-sssr-mythic-creator', name: '创世猫神', rarity: 'SSSR', desc: 'a divine creator cat god creating the world with cosmic power' },
  { id: 'g-sssr-mythic-spacetime', name: '时空裂隙猫', rarity: 'SSSR', desc: 'a cat tearing through space-time with reality-warping portals' },
  { id: 'g-sssr-mythic-nyancat', name: '彩虹猫', rarity: 'SSSR', desc: 'the legendary nyan cat flying with rainbow trail and pop-tart body' },
  { id: 'g-sssr-mythic-chaos', name: '混沌猫', rarity: 'SSSR', desc: 'a chaos entity cat surrounded by swirling dark and light energy' },
  { id: 'g-sssr-mythic-eternal', name: '永恒猫', rarity: 'SSSR', desc: 'an eternal cat transcending time with golden infinity symbols' },
]);

// ── UI images ──
const UI_IMAGES = [
  {
    id: 'tab-gacha',
    outPath: 'src/icons/tab-gacha.png',
    prompt: 'Cute kawaii pixel art icon of a capsule toy gashapon machine, tiny icon, simple clean design, white background, 64x64 sprite',
  },
  {
    id: 'gacha-header',
    outPath: 'src/illustrations/gacha-header.png',
    prompt: 'Kawaii illustration of a cute cat standing next to a colorful gashapon capsule toy machine, soft pastel colors, pink and purple gradient background, cute chibi style, game UI illustration',
  },
  {
    id: 'gacha-empty',
    outPath: 'src/illustrations/gacha-empty.png',
    prompt: 'Kawaii illustration of a cute sad cat with empty collection book, soft pastel colors, gentle expression, question marks floating around, clean simple design',
  },
];

// ── Prompt templates per rarity ──
const RARITY_PROMPT = {
  N: 'Pixel art style game item icon, cute kawaii, white background, single object centered, simple clean pixel art,',
  R: 'Pixel art style game item icon, cute kawaii, white background, single object centered, refined detailed pixel art with subtle glow effect,',
  SR: 'Pixel art style game character icon, cute kawaii, white background, centered, gorgeous pixel art with sparkle and particle effects,',
  SSR: 'Pixel art style game character icon, cute kawaii, white background, centered, epic pixel art with intense golden glow and dramatic lighting,',
  SSSR: 'Pixel art style game character icon, cute kawaii, white background, centered, mythical legendary pixel art with golden rainbow aura and extreme detail,',
};

// ── Main ──
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyC3dFkMULgvXaooBG-49_53dUabTRbWq58';
// Imagen API free tier: 10 requests per minute → 1 request every 10 seconds to stay safe
const REQUEST_DELAY_MS = 10000;
const MAX_RETRIES = 5;

async function main() {
  // Dynamic import for ESM-only package
  const { GoogleGenAI } = await import('@google/genai');

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const projectRoot = path.join(__dirname, '..');
  const itemOutDir = path.join(projectRoot, 'src', 'gacha-items');

  // Ensure output directories exist
  if (!fs.existsSync(itemOutDir)) {
    fs.mkdirSync(itemOutDir, { recursive: true });
  }

  console.log(`\n=== Gacha Image Generator ===`);
  console.log(`Items: ${GACHA_ITEMS.length}, UI images: ${UI_IMAGES.length}`);
  console.log(`Rate limit: 1 request every ${REQUEST_DELAY_MS / 1000}s (~${Math.floor(60000 / REQUEST_DELAY_MS)}/min)`);
  const estMinutes = Math.ceil((GACHA_ITEMS.length + UI_IMAGES.length) * REQUEST_DELAY_MS / 60000);
  console.log(`Estimated time: ~${estMinutes} minutes (skipping existing files)\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  let total = 0;

  // ── Generate UI images first ──
  console.log('--- Generating UI images ---');
  for (const ui of UI_IMAGES) {
    const outPath = path.join(projectRoot, ui.outPath);
    if (fs.existsSync(outPath)) {
      console.log(`  [SKIP] ${ui.id} (already exists)`);
      skipped++;
      continue;
    }
    total++;
    const ok = await generateWithRetry(ai, ui.prompt, outPath, ui.id);
    if (ok) generated++; else failed++;
    await sleep(REQUEST_DELAY_MS);
  }

  // ── Generate item images sequentially ──
  console.log('\n--- Generating item images ---');
  for (let i = 0; i < GACHA_ITEMS.length; i++) {
    const item = GACHA_ITEMS[i];
    const outPath = path.join(itemOutDir, `${item.id}.png`);

    if (fs.existsSync(outPath)) {
      skipped++;
      // Only print skip for every 10th to reduce noise
      if (i % 10 === 0) console.log(`  [SKIP] ${item.id} and nearby... (already exist)`);
      continue;
    }

    total++;
    const rarityPrompt = RARITY_PROMPT[item.rarity] || RARITY_PROMPT.N;
    const fullPrompt = `${rarityPrompt} ${item.desc}, high quality game sprite`;

    const progress = `[${i + 1}/${GACHA_ITEMS.length}]`;
    const ok = await generateWithRetry(ai, fullPrompt, outPath, `${progress} ${item.id} (${item.rarity})`);
    if (ok) generated++; else failed++;

    // Delay between requests
    if (i < GACHA_ITEMS.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`);
  console.log(`Total items in catalog: ${GACHA_ITEMS.length + UI_IMAGES.length}`);
}

async function generateWithRetry(ai, prompt, outPath, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await generateImage(ai, prompt, outPath);
      console.log(`  [OK] ${label}`);
      return true;
    } catch (err) {
      const msg = err.message || String(err);
      // Parse retry delay from 429 errors
      const retryMatch = msg.match(/retryDelay.*?(\d+)s/);
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        const waitSec = retryMatch ? parseInt(retryMatch[1]) + 10 : 70;
        console.log(`  [RATE] ${label} — waiting ${waitSec}s (attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(waitSec * 1000);
        continue;
      }
      console.error(`  [FAIL] ${label}: ${msg.substring(0, 120)} (attempt ${attempt}/${MAX_RETRIES})`);
      if (attempt < MAX_RETRIES) {
        await sleep(5000);
      }
    }
  }
  return false;
}

async function generateImage(ai, prompt, outPath) {
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-fast-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: '1:1',
    },
  });

  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error('No image generated');
  }

  const imgBytes = response.generatedImages[0].image.imageBytes;
  const buffer = Buffer.from(imgBytes, 'base64');

  // Ensure parent directory exists
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outPath, buffer);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
