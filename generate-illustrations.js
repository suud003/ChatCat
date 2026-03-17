/**
 * 使用 Gemini Nano Banana 2 (gemini-3.1-flash-image-preview) 批量生成可爱插画
 * Usage: node generate-illustrations.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyAzPhZXNsH87Sfg15-Zvx2Pwc3D8YNHnRg';
const MODEL = 'gemini-3.1-flash-image-preview';
const OUTPUT_DIR = path.join(__dirname, 'src', 'illustrations');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════
//  图片需求清单 — 每张都是可爱猫猫主题的扁平插画
// ═══════════════════════════════════════════════════════

const STYLE_PREFIX = 'Cute kawaii flat illustration, soft pastel colors, rounded shapes, no text, no words, no letters, transparent-friendly white background, simple clean design, chibi cat character,';

const illustrations = [
  // ── 空状态插画 (Empty States) ──
  {
    name: 'empty-memory',
    prompt: `${STYLE_PREFIX} a small chibi white cat sitting on a fluffy cloud, looking up at floating thought bubbles that are empty, dreamy atmosphere, soft pink and blue tones, 256x256 pixel art style`,
    desc: '记忆为空 — 猫猫坐在云上思考'
  },
  {
    name: 'empty-clipboard',
    prompt: `${STYLE_PREFIX} a small chibi white cat holding a big empty clipboard notepad, looking curious with tilted head, sparkles around, soft yellow and mint tones, 256x256`,
    desc: '剪贴板为空 — 猫猫拿空白板'
  },
  {
    name: 'empty-todo',
    prompt: `${STYLE_PREFIX} a happy chibi white cat lying on its back relaxing, surrounded by tiny stars and flowers, a small completed checklist floating nearby, soft green and lavender tones, 256x256`,
    desc: '待办为空 — 猫猫悠闲躺平'
  },
  {
    name: 'empty-inventory',
    prompt: `${STYLE_PREFIX} a chibi white cat peeking into a big open empty treasure chest with sparkle eyes, looking excited and curious, soft gold and pink tones, 256x256`,
    desc: '背包为空 — 猫猫看空宝箱'
  },
  {
    name: 'empty-leaderboard',
    prompt: `${STYLE_PREFIX} a chibi white cat standing next to an empty trophy podium, holding a small flag, looking determined and hopeful, soft blue and gold tones, 256x256`,
    desc: '排行榜为空 — 猫猫和空奖台'
  },
  {
    name: 'empty-chat',
    prompt: `${STYLE_PREFIX} a chibi white cat waving hello with one paw, a big speech bubble with a heart inside floating above, welcoming and friendly, soft pink and white tones, 256x256`,
    desc: '聊天为空 — 猫猫打招呼'
  },

  // ── 功能插画 (Feature Illustrations) ──
  {
    name: 'pomodoro-focus',
    prompt: `${STYLE_PREFIX} a chibi white cat wearing tiny glasses sitting at a small desk with a book, a big red tomato timer beside it, concentrated face, soft red and warm tones, 256x256`,
    desc: '番茄钟专注 — 猫猫认真学习'
  },
  {
    name: 'pomodoro-break',
    prompt: `${STYLE_PREFIX} a chibi white cat stretching happily with arms up, tiny coffee cup nearby, small flowers blooming around, relaxed happy expression, soft green and yellow tones, 256x256`,
    desc: '番茄钟休息 — 猫猫伸懒腰'
  },
  {
    name: 'recorder-idle',
    prompt: `${STYLE_PREFIX} a chibi white cat sitting next to a cute mechanical keyboard, paws ready to type, small music notes floating, soft purple and blue tones, 256x256`,
    desc: '记录器待机 — 猫猫准备打字'
  },
  {
    name: 'system-info',
    prompt: `${STYLE_PREFIX} a chibi white cat wearing a tiny hard hat looking at a cute cartoon computer monitor showing colorful bar charts, tech-savvy look, soft teal and orange tones, 256x256`,
    desc: '系统信息 — 猫猫看监控'
  },

  // ── 登录/欢迎 (Login/Welcome) ──
  {
    name: 'welcome-hero',
    prompt: `${STYLE_PREFIX} a chibi white cat sitting on a crescent moon surrounded by tiny stars and planets, wearing a small crown, magical and dreamy, one paw waving hello, soft purple pink and gold tones, 300x300`,
    desc: '欢迎页 — 猫猫坐月亮上'
  },
  {
    name: 'login-multiplayer',
    prompt: `${STYLE_PREFIX} three small chibi cats of different colors (white pink blue) huddled together happily, tiny wifi signal icon above, friendship theme, soft rainbow pastel tones, 256x256`,
    desc: '联机登录 — 三只猫猫联机'
  },

  // ── 宠物状态 (Pet Status) ──
  {
    name: 'pet-happy',
    prompt: `${STYLE_PREFIX} a chibi white cat with sparkly eyes and rosy cheeks, surrounded by floating hearts and stars, super happy expression, bouncing, soft pink tones, 200x200`,
    desc: '宠物开心 — 猫猫超开心'
  },
  {
    name: 'pet-neutral',
    prompt: `${STYLE_PREFIX} a chibi white cat sitting calmly with a neutral relaxed expression, small flower on head, peaceful, soft beige and grey tones, 200x200`,
    desc: '宠物普通 — 猫猫平静'
  },
  {
    name: 'pet-bored',
    prompt: `${STYLE_PREFIX} a chibi white cat lying flat on floor looking bored with half-closed sleepy eyes, tiny zzz floating, soft grey and blue tones, 200x200`,
    desc: '宠物无聊 — 猫猫躺平打瞌睡'
  },

  // ── 商店 (Shop) ──
  {
    name: 'shop-header',
    prompt: `${STYLE_PREFIX} a chibi white cat as a cute shopkeeper behind a tiny market stall decorated with a banner, small items on display, welcoming smile, soft warm tones with pink and orange, 256x128`,
    desc: '商店头图 — 猫猫店主'
  },
  {
    name: 'shop-empty',
    prompt: `${STYLE_PREFIX} a chibi white cat sweeping the floor of an empty shop with a broom, a small "be back soon" sign, cozy atmosphere, soft warm amber tones, 256x256`,
    desc: '商店补货中 — 猫猫打扫'
  },

  // ── 成就/升级 (Achievement) ──
  {
    name: 'level-up',
    prompt: `${STYLE_PREFIX} a chibi white cat jumping up with joy, big sparkle explosion behind, tiny confetti and stars everywhere, celebratory, dynamic pose, soft gold and rainbow tones, 256x256`,
    desc: '升级 — 猫猫庆祝'
  },
  {
    name: 'prestige',
    prompt: `${STYLE_PREFIX} a majestic chibi white cat wearing a tiny sparkling cape and tiara, standing on a glowing star pedestal, ethereal glow, soft gold purple and pink gradient tones, 256x256`,
    desc: '转生 — 猫猫加冕'
  },
];

// ═══════════════════════════════════════════════════════
//  API 调用
// ═══════════════════════════════════════════════════════

function generateImage(prompt) {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    const body = JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
        temperature: 1.0,
      }
    });

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`API Error: ${json.error.message}`));
            return;
          }
          // 查找图片数据
          const candidates = json.candidates || [];
          for (const c of candidates) {
            const parts = c.content?.parts || [];
            for (const p of parts) {
              if (p.inlineData) {
                resolve({
                  data: p.inlineData.data,
                  mimeType: p.inlineData.mimeType || 'image/png'
                });
                return;
              }
            }
          }
          reject(new Error('No image in response: ' + JSON.stringify(json).slice(0, 500)));
        } catch (e) {
          reject(new Error('Parse error: ' + e.message + ' | ' + data.slice(0, 300)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log(`🎨 开始生成 ${illustrations.length} 张可爱插画...`);
  console.log(`📁 输出目录: ${OUTPUT_DIR}`);
  console.log(`🤖 模型: ${MODEL} (Nano Banana 2)\n`);

  let success = 0;
  let fail = 0;

  for (let i = 0; i < illustrations.length; i++) {
    const ill = illustrations[i];
    const outFile = path.join(OUTPUT_DIR, `${ill.name}.png`);

    // 如果已生成则跳过
    if (fs.existsSync(outFile)) {
      console.log(`⏭  [${i+1}/${illustrations.length}] ${ill.name} — 已存在，跳过`);
      success++;
      continue;
    }

    console.log(`🖌  [${i+1}/${illustrations.length}] ${ill.name} — ${ill.desc}`);

    try {
      const result = await generateImage(ill.prompt);
      const ext = result.mimeType.includes('png') ? 'png' :
                  result.mimeType.includes('webp') ? 'webp' :
                  result.mimeType.includes('jpeg') ? 'jpg' : 'png';
      const finalFile = path.join(OUTPUT_DIR, `${ill.name}.${ext}`);
      fs.writeFileSync(finalFile, Buffer.from(result.data, 'base64'));
      console.log(`   ✅ 已保存: ${ill.name}.${ext}`);
      success++;
    } catch (err) {
      console.log(`   ❌ 失败: ${err.message}`);
      fail++;
    }

    // 限速：每张间隔 2 秒，避免触发 API 限制
    if (i < illustrations.length - 1) {
      await sleep(2000);
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`🎉 完成! 成功: ${success}, 失败: ${fail}`);
  console.log(`📁 图片保存在: ${OUTPUT_DIR}`);
  console.log(`═══════════════════════════════════════`);
}

main().catch(console.error);
