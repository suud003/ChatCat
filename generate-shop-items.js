/**
 * 使用 Gemini Nano Banana 2 为每个商店物品生成可爱像素风图标
 * Usage: node generate-shop-items.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const MODEL = 'gemini-3.1-flash-image-preview';
const OUTPUT_DIR = path.join(__dirname, 'src', 'shop-items');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// 所有商店物品 — 对应 pet-base-items.js
const items = [
  // ── Common ──
  { id: 'yarn-ball',    name: '毛线球',     desc: 'a colorful ball of yarn with loose threads, pink and purple colors' },
  { id: 'cat-bowl',     name: '猫粮碗',     desc: 'a cute ceramic cat food bowl with fish-shaped kibble, warm orange' },
  { id: 'fish-toy',     name: '小鱼干',     desc: 'a small dried fish snack, golden brown, with sparkle effects' },
  { id: 'scratching',   name: '猫抓板',     desc: 'a cardboard cat scratching pad with claw marks, beige and brown' },
  { id: 'cat-bed',      name: '猫窝',       desc: 'a soft round cat bed with cushion, pastel pink, cozy and fluffy' },
  { id: 'cat-bell',     name: '铃铛项圈',   desc: 'a cute red collar with a golden jingle bell, shiny and sparkly' },
  { id: 'feather-wand', name: '逗猫棒',     desc: 'a cat teaser wand toy with colorful feathers on a string, purple and teal' },
  { id: 'cat-grass',    name: '猫草盆栽',   desc: 'a small green pot with fresh cat grass sprouting, terracotta pot, green leaves' },
  { id: 'milk-bowl',    name: '牛奶碗',     desc: 'a white bowl full of milk with a tiny heart-shaped splash, white and blue' },
  { id: 'cat-cushion',  name: '猫咪坐垫',   desc: 'a soft fluffy cushion shaped like a cat face, pastel purple, kawaii' },

  // ── Rare ──
  { id: 'cat-tree',     name: '猫爬架',     desc: 'a tall cat climbing tree tower with platforms and sisal posts, brown and green' },
  { id: 'laser-toy',    name: '激光笔',     desc: 'a laser pointer pen emitting a bright red dot beam, sleek silver body' },
  { id: 'cat-tunnel',   name: '猫隧道',     desc: 'a crinkly play tunnel for cats, colorful blue fabric with peek holes' },
  { id: 'fish-tank',    name: '观赏鱼缸',   desc: 'a small aquarium with cute tropical fish and seaweed, blue water, glass bowl' },
  { id: 'cat-hammock',  name: '猫吊床',     desc: 'a cozy hanging cat hammock attached to window, pastel yellow fabric, sunny' },
  { id: 'auto-feeder',  name: '自动喂食器', desc: 'an automatic cat food dispenser machine, white and teal, futuristic cute' },
  { id: 'cat-fountain', name: '猫咪饮水机', desc: 'a flower-shaped cat water fountain with flowing water, blue and white, fresh' },
  { id: 'cat-tv',       name: '猫咪电视',   desc: 'a tiny retro TV screen showing fish swimming, pink frame, pixel fish on screen' },

  // ── Epic ──
  { id: 'cat-villa',    name: '猫咪别墅',   desc: 'a luxurious miniature cat mansion house, pink roof, white walls, garden, fairy-tale style' },
  { id: 'cat-garden',   name: '猫薄荷花园', desc: 'a magical catnip herb garden with glowing purple plants and butterflies, enchanted' },
  { id: 'cat-cafe',     name: '猫咖啡厅',   desc: 'a tiny cute cat-themed coffee shop with tables and cups, warm brown and cream' },
  { id: 'cat-spa',      name: '猫猫水疗',   desc: 'a spa with a cat relaxing in hot springs, steam, candles, zen garden, peaceful' },
  { id: 'cat-library',  name: '猫猫图书馆', desc: 'a cozy library with bookshelves and a cat reading, warm light, wooden shelves' },
  { id: 'cat-gym',      name: '猫猫健身房', desc: 'a cute gym with tiny dumbbells and a cat exercising, energetic, blue and orange' },
  { id: 'cat-theater',  name: '猫猫剧场',   desc: 'a tiny theater with red curtains and stage spotlight, dramatic, golden and red' },
  { id: 'cat-lab',      name: '猫猫实验室', desc: 'a science lab with bubbling potions and beakers, a cat scientist, green glow' },

  // ── Legendary ──
  { id: 'cat-kingdom',  name: '猫猫王国',   desc: 'a majestic castle kingdom with towers and flags, golden crown, royal purple and gold' },
  { id: 'cat-spaceship',name: '猫猫飞船',   desc: 'a cute rocket spaceship with a cat astronaut window, stars, silver and blue, cosmic' },
  { id: 'cat-dimension',name: '喵次元',     desc: 'a swirling portal to another dimension with neon colors, magical vortex, purple and cyan' },
  { id: 'cat-universe', name: '猫猫宇宙',   desc: 'a galaxy with stars and planets shaped like cat paws, cosmic sparkles, deep blue and gold' },
  { id: 'cat-timeloop', name: '时空猫环',   desc: 'a glowing time loop ring with clock hands and hourglasses, gold and blue, temporal energy' },
  { id: 'cat-dragon',   name: '猫猫龙骑',   desc: 'a cat riding a cute baby dragon, wings spread, fire breath, red and gold, epic fantasy' },
  { id: 'cat-paradise', name: '猫猫乐园',   desc: 'an amusement park with ferris wheel and roller coaster, colorful, joyful, rainbow' },
  { id: 'cat-multiverse',name:'猫猫多元宇宙',desc:'multiple floating cat worlds connected by rainbow bridges, cosmic, multicolored galaxies' },

  // ── Prestige Materials ──
  { id: 'rebirth-stone-1', name: '转生石·初', desc: 'a small glowing crystal orb, purple aura, mystical, tier 1 rebirth stone' },
  { id: 'rebirth-stone-2', name: '转生石·承', desc: 'a brilliant diamond gem with blue sparkles, faceted, tier 2 rebirth stone' },
  { id: 'rebirth-stone-3', name: '转生石·转', desc: 'a radiant golden star crystal with light rays, tier 3 rebirth stone, holy glow' },
  { id: 'rebirth-stone-4', name: '转生石·合', desc: 'a blazing star-shaped gem with rainbow prism effects, tier 4 rebirth stone, powerful' },
  { id: 'rebirth-stone-5', name: '转生石·极', desc: 'an ultimate cosmic gem with galaxy inside, shooting stars, tier 5 rebirth stone, divine' },
];

const STYLE = `Cute kawaii pixel art game item icon, 64x64 pixel style, clean white background, no text no words, adorable game-style collectible,`;

function buildPrompt(item) {
  return `${STYLE} ${item.desc}, 128x128 output`;
}

function generateImage(prompt) {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"], temperature: 1.0 }
    });

    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          for (const c of (json.candidates || [])) {
            for (const p of (c.content?.parts || [])) {
              if (p.inlineData) {
                resolve({ data: p.inlineData.data, mimeType: p.inlineData.mimeType || 'image/png' });
                return;
              }
            }
          }
          reject(new Error('No image in response'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`🛍️  开始生成 ${items.length} 个商店物品图标...`);
  console.log(`📁 输出: ${OUTPUT_DIR}\n`);

  let success = 0, fail = 0;
  const maxRetries = 2;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const outFile = path.join(OUTPUT_DIR, `${item.id}.png`);

    if (fs.existsSync(outFile)) {
      console.log(`⏭  [${i+1}/${items.length}] ${item.id} — 已存在`);
      success++;
      continue;
    }

    console.log(`🎨 [${i+1}/${items.length}] ${item.id} — ${item.name}`);

    let done = false;
    for (let retry = 0; retry <= maxRetries && !done; retry++) {
      try {
        if (retry > 0) {
          console.log(`   ↻ 重试 ${retry}/${maxRetries}...`);
          await sleep(8000);
        }
        const result = await generateImage(buildPrompt(item));
        const ext = result.mimeType.includes('png') ? 'png' : result.mimeType.includes('webp') ? 'webp' : 'png';
        fs.writeFileSync(path.join(OUTPUT_DIR, `${item.id}.${ext}`), Buffer.from(result.data, 'base64'));
        console.log(`   ✅ ${item.id}.${ext}`);
        success++;
        done = true;
      } catch (err) {
        if (retry === maxRetries) {
          console.log(`   ❌ ${err.message}`);
          fail++;
        }
      }
    }

    if (i < items.length - 1) await sleep(4000);
  }

  console.log(`\n══════════════════════════════════`);
  console.log(`🎉 完成! 成功: ${success}, 失败: ${fail}`);
  console.log(`══════════════════════════════════`);
}

main().catch(console.error);
