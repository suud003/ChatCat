/**
 * 使用 Gemini (gemini-3.1-flash-image-preview) 批量生成可爱猫猫小图标
 * 这些图标替换 UI 中的 emoji，与 illustrations 保持相同的 kawaii 风格
 * Usage: node generate-icons.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyAzPhZXNsH87Sfg15-Zvx2Pwc3D8YNHnRg';
const MODEL = 'gemini-3.1-flash-image-preview';
const OUTPUT_DIR = path.join(__dirname, 'src', 'icons');
const ICON_SIZE = 64; // 最终尺寸 64x64

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════
//  图标需求清单 — 统一风格: kawaii 扁平 + chibi 白猫 + 128x128 生成后缩放
// ═══════════════════════════════════════════════════════

const STYLE_PREFIX = 'Cute kawaii flat icon, soft pastel colors, rounded shapes, no text, no words, no letters, transparent-friendly white background, simple clean design, chibi white cat character,';

const icons = [
  // ── 节奏状态 (Rhythm States) ──
  { name: 'rhythm-flow',     prompt: `${STYLE_PREFIX} in a deep focused "flow" state, small flames of energy around it, eyes sparkling with determination, typing rapidly on tiny keyboard. Warm orange and red tones. 128x128 game UI icon.`, desc: '心流状态' },
  { name: 'rhythm-stuck',    prompt: `${STYLE_PREFIX} looks confused and stuck, tiny sweat drops, scratching head with one paw, small question mark floating above. Soft purple and grey tones. 128x128 game UI icon.`, desc: '卡壳状态' },
  { name: 'rhythm-reading',  prompt: `${STYLE_PREFIX} reading a tiny book with round glasses, peaceful and thoughtful expression, small sparkle. Soft blue and green tones. 128x128 game UI icon.`, desc: '阅读思考' },
  { name: 'rhythm-chatting', prompt: `${STYLE_PREFIX} chatting happily with a tiny speech bubble, mouth open cheerfully, waving one paw. Soft pink and yellow tones. 128x128 game UI icon.`, desc: '沟通模式' },
  { name: 'rhythm-typing',   prompt: `${STYLE_PREFIX} typing on a tiny cute keyboard with rapid paw movements, small musical notes around. Soft teal and mint tones. 128x128 game UI icon.`, desc: '打字中' },
  { name: 'rhythm-away',     prompt: `${STYLE_PREFIX} sleeping peacefully curled up in a ball, tiny zzz floating above, eyes closed with peaceful smile. Soft grey and lavender tones. 128x128 game UI icon.`, desc: '离开' },
  { name: 'rhythm-idle',     prompt: `${STYLE_PREFIX} sitting idle doing nothing, yawning with a bored cute expression, a tiny hourglass nearby. Soft beige and light brown tones. 128x128 game UI icon.`, desc: '空闲' },

  // ── 节奏洞察 (Insights) ──
  { name: 'insight-flow',      prompt: `${STYLE_PREFIX} sparkly eyes and a tiny flame aura around it, powerful energetic determination. Warm orange red fire tones. 128x128 game UI icon.`, desc: '心流洞察' },
  { name: 'insight-lightbulb', prompt: `${STYLE_PREFIX} holding a tiny lightbulb that is glowing, looking smart and insightful. Soft yellow and gold tones. 128x128 game UI icon.`, desc: '最佳时段洞察' },
  { name: 'insight-trend',     prompt: `${STYLE_PREFIX} looking at a tiny upward trending chart with sparkly excited eyes, paws raised in celebration. Soft green and emerald tones. 128x128 game UI icon.`, desc: '趋势对比洞察' },

  // ── 工具栏按钮 (Toolbar) ──
  { name: 'toolbar-chat',  prompt: `${STYLE_PREFIX} waving hello with a big cute speech bubble and tiny heart, friendly chatting expression. Soft warm pink tones. 128x128 game UI icon.`, desc: '聊天按钮' },
  { name: 'toolbar-tools', prompt: `${STYLE_PREFIX} holding a tiny wrench and screwdriver, wearing a small tool belt, looking ready to help. Soft blue and orange tones. 128x128 game UI icon.`, desc: '工具按钮' },
  { name: 'toolbar-quick', prompt: `${STYLE_PREFIX} tiny lightning bolt sparkles around it, looking energetic and powerful, dynamic pose. Soft electric yellow and blue tones. 128x128 game UI icon.`, desc: '快捷AI按钮' },
  { name: 'toolbar-fun',   prompt: `${STYLE_PREFIX} wearing a tiny game controller headset, holding a small gamepad, playful and excited expression. Soft purple and magenta tones. 128x128 game UI icon.`, desc: '趣味按钮' },

  // ── Tools Tab 图标 ──
  { name: 'tab-pomodoro',  prompt: `${STYLE_PREFIX} sitting next to a big cute red tomato timer, one paw on the tomato, focused expression. Soft red and warm tones. 128x128 game UI icon.`, desc: '专注Tab' },
  { name: 'tab-todo',      prompt: `${STYLE_PREFIX} holding tiny checklist notepad with checkmarks, looking organized and proud. Soft green and mint tones. 128x128 game UI icon.`, desc: '待办Tab' },
  { name: 'tab-recorder',  prompt: `${STYLE_PREFIX} sitting at a tiny keyboard typing with both paws, wearing cute headphones, focused but happy. Soft purple and blue tones. 128x128 game UI icon.`, desc: '记录器Tab' },
  { name: 'tab-clipboard', prompt: `${STYLE_PREFIX} peeking into a clipboard/paste board with curious eyes, one paw reaching. Soft orange and yellow tones. 128x128 game UI icon.`, desc: '剪贴板Tab' },
  { name: 'tab-sysinfo',   prompt: `${STYLE_PREFIX} wearing a tiny hard hat looking at a small monitor showing colorful bar charts. Soft teal and cyan tones. 128x128 game UI icon.`, desc: '系统Tab' },
  { name: 'tab-rhythm',    prompt: `${STYLE_PREFIX} dancing and moving to music with tiny musical notes floating around, happy rhythmic expression. Soft pink and coral tones. 128x128 game UI icon.`, desc: '节奏Tab' },

  // ── Fun Tab 图标 ──
  { name: 'tab-character',   prompt: `${STYLE_PREFIX} looking at its reflection in a tiny mirror, trying different accessories. Soft pink and peach tones. 128x128 game UI icon.`, desc: '角色Tab' },
  { name: 'tab-status',     prompt: `${STYLE_PREFIX} sitting with a status health bar above its head, peaceful content expression. Soft blue pastel tones. 128x128 game UI icon.`, desc: '状态Tab' },
  { name: 'tab-shop',       prompt: `${STYLE_PREFIX} cute shopkeeper behind a tiny market stall, paw waving, welcoming smile. Soft warm orange tones. 128x128 game UI icon.`, desc: '商店Tab' },
  { name: 'tab-items',      prompt: `${STYLE_PREFIX} happily holding a tiny gift box/package, excited to open it, sparkle eyes. Soft brown and gold tones. 128x128 game UI icon.`, desc: '物品Tab' },
  { name: 'tab-connection', prompt: `two small chibi cats connected by a tiny wifi/globe symbol, waving at each other, friendship theme, kawaii flat icon, soft rainbow pastel tones, no text, white background. 128x128 game UI icon.`, desc: '联机Tab' },
  { name: 'tab-leaderboard', prompt: `${STYLE_PREFIX} standing on winner podium with tiny trophy, proud happy expression, confetti. Soft gold and blue tones. 128x128 game UI icon.`, desc: '排行Tab' },

  // ── Quick Panel 模式图标 ──
  { name: 'qp-ask',        prompt: `${STYLE_PREFIX} asking a question with a raised paw, tilted head, small question mark speech bubble. Soft sky blue tones. 128x128 game UI icon.`, desc: '问答模式' },
  { name: 'qp-polish',     prompt: `${STYLE_PREFIX} holding a tiny pen/brush, editing and polishing text with sparkles, perfectionist expression. Soft lavender and pink tones. 128x128 game UI icon.`, desc: '润色模式' },
  { name: 'qp-summarize',  prompt: `${STYLE_PREFIX} reading a long scroll and condensing it into a tiny note, smart expression with tiny glasses. Soft blue and teal tones. 128x128 game UI icon.`, desc: '总结模式' },
  { name: 'qp-explain',    prompt: `${STYLE_PREFIX} looking through a tiny magnifying glass with curious wide eyes, investigating. Soft amber and warm tones. 128x128 game UI icon.`, desc: '解释模式' },
  { name: 'qp-screenshot', prompt: `${STYLE_PREFIX} holding a tiny camera taking a photo, one eye closed looking through viewfinder. Soft violet and cyan tones. 128x128 game UI icon.`, desc: '识图模式' },

  // ── 宠物状态图标 (Stats) ──
  { name: 'stat-coin',      prompt: `${STYLE_PREFIX} holding a shiny golden coin happily, sparkle eyes, proud. Soft gold warm tones. 128x128 game UI icon.`, desc: '猫猫币' },
  { name: 'stat-heart',     prompt: `${STYLE_PREFIX} with big sparkly heart floating above, rosy cheeks, happy loving expression. Soft pink and red tones. 128x128 game UI icon.`, desc: '心情/好感' },
  { name: 'stat-streak',    prompt: `${STYLE_PREFIX} holding a tiny calendar with checkmarks, showing login streak days. Soft green and mint tones. 128x128 game UI icon.`, desc: '连续登录' },
  { name: 'stat-lightning', prompt: `${STYLE_PREFIX} tiny lightning bolt sparkles around it, energetic powerful dynamic pose. Soft electric yellow tones. 128x128 game UI icon.`, desc: '速度/总计' },
  { name: 'stat-sparkle',   prompt: `${STYLE_PREFIX} sparkle effect and tiny stars around it, magical transformation glow, wearing a tiny cape. Soft gold purple gradient. 128x128 game UI icon.`, desc: '转生/倍率' },
  { name: 'stat-target',    prompt: `${STYLE_PREFIX} with target bullseye aiming carefully, determined face, one paw pointing. Soft orange and coral tones. 128x128 game UI icon.`, desc: '道具/目标' },
];

// ═══════════════════════════════════════════════════════
//  API 调用 (与 generate-illustrations.js 相同)
// ═══════════════════════════════════════════════════════

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
          if (json.error) return reject(new Error(`API Error: ${json.error.message}`));
          for (const c of (json.candidates || [])) {
            for (const p of (c.content?.parts || [])) {
              if (p.inlineData) return resolve({ data: p.inlineData.data, mimeType: p.inlineData.mimeType || 'image/png' });
            }
          }
          reject(new Error('No image in response'));
        } catch (e) { reject(new Error('Parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log(`🐱 开始生成 ${icons.length} 个可爱猫猫图标...`);
  console.log(`📁 输出目录: ${OUTPUT_DIR}`);
  console.log(`📐 最终尺寸: ${ICON_SIZE}×${ICON_SIZE}\n`);

  let success = 0, fail = 0;

  for (let i = 0; i < icons.length; i++) {
    const icon = icons[i];
    const outFile = path.join(OUTPUT_DIR, `${icon.name}.png`);

    if (fs.existsSync(outFile)) {
      console.log(`⏭  [${i+1}/${icons.length}] ${icon.name} — 已存在，跳过`);
      success++;
      continue;
    }

    console.log(`🖌  [${i+1}/${icons.length}] ${icon.name} — ${icon.desc}`);

    let retries = 2;
    while (retries >= 0) {
      try {
        const result = await generateImage(icon.prompt);
        fs.writeFileSync(outFile, Buffer.from(result.data, 'base64'));
        // macOS sips 缩放到目标尺寸
        const { execSync } = require('child_process');
        try { execSync(`sips -z ${ICON_SIZE} ${ICON_SIZE} "${outFile}"`, { stdio: 'ignore' }); } catch {}
        console.log(`   ✅ 已保存: ${icon.name}.png (${ICON_SIZE}×${ICON_SIZE})`);
        success++;
        break;
      } catch (err) {
        if (retries > 0) {
          console.log(`   ⏳ 重试... (${err.message})`);
          await sleep(4000);
          retries--;
        } else {
          console.log(`   ❌ 失败: ${err.message}`);
          fail++;
          break;
        }
      }
    }

    if (i < icons.length - 1) await sleep(3000);
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`🎉 完成! 成功: ${success}, 失败: ${fail}`);
  console.log(`📁 图标保存在: ${OUTPUT_DIR}`);
  console.log(`═══════════════════════════════════════`);
}

main().catch(console.error);
