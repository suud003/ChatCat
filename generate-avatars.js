/**
 * 使用 Gemini Nano Banana 2 为每个角色预设生成像素风头像
 * Usage: node generate-avatars.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyAzPhZXNsH87Sfg15-Zvx2Pwc3D8YNHnRg';
const MODEL = 'gemini-3.1-flash-image-preview';
const OUTPUT_DIR = path.join(__dirname, 'src', 'avatars');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// 角色列表 — 对应 live2d-character.js 的 CHARACTER_PRESETS
const avatars = [
  // Color skins
  { id: 'hachiware', color: '白蓝相间', instrument: '无', desc: '来自吉伊卡哇的哈奇猫' },
  { id: 'bongo-classic', color: '白灰色', instrument: '键盘', desc: '原版经典邦戈猫' },
  { id: 'bongo-orange',  color: '橘黄色', instrument: '键盘', desc: '温暖的橘色猫' },
  { id: 'bongo-pink',    color: '粉红色', instrument: '键盘', desc: '可爱粉色猫' },
  { id: 'bongo-blue',    color: '天蓝色', instrument: '键盘', desc: '清凉蓝色猫' },
  { id: 'bongo-green',   color: '抹茶绿', instrument: '键盘', desc: '抹茶绿色猫' },
  { id: 'bongo-purple',  color: '紫罗兰', instrument: '键盘', desc: '高贵紫色猫' },
  { id: 'bongo-golden',  color: '金黄色', instrument: '键盘', desc: '闪亮金色猫' },
  { id: 'bongo-dark',    color: '深灰黑', instrument: '键盘', desc: '暗影色猫' },
  { id: 'bongo-invert',  color: '黑色配粉耳朵', instrument: '键盘', desc: '反色猫' },
  { id: 'bongo-cyber',   color: '霓虹蓝绿紫', instrument: '键盘', desc: '赛博朋克猫' },
  { id: 'bongo-sunset',  color: '橙红渐变', instrument: '键盘', desc: '夕阳猫' },
  { id: 'bongo-ice',     color: '冰蓝浅白', instrument: '键盘', desc: '冰晶猫' },
  { id: 'bongo-cherry',  color: '樱花粉红', instrument: '键盘', desc: '樱花猫' },
  { id: 'bongo-mint',    color: '薄荷绿配浅粉', instrument: '键盘', desc: '薄荷清风猫' },
  { id: 'bongo-coral',   color: '珊瑚粉', instrument: '键盘', desc: '珊瑚粉猫' },
  { id: 'bongo-lemon',   color: '柠檬黄', instrument: '键盘', desc: '柠檬黄猫' },
  { id: 'bongo-ghost',   color: '苍白半透明', instrument: '键盘', desc: '幽灵猫' },
  // Instruments
  { id: 'bongo-drum',       color: '暖橙红', instrument: '邦戈鼓(两个圆鼓)', desc: '邦戈鼓猫' },
  { id: 'bongo-cymbal',     color: '金黄色', instrument: '一对金色圆镲', desc: '镲猫' },
  { id: 'bongo-tambourine', color: '橙黄色', instrument: '圆形铃鼓', desc: '铃鼓猫' },
  { id: 'bongo-marimba',    color: '翡翠绿', instrument: '木质马林巴琴', desc: '马林巴猫' },
  { id: 'bongo-cowbell',    color: '银灰色', instrument: '金属牛铃', desc: '牛铃猫' },
  // Combos
  { id: 'bongo-drum-pink',     color: '粉红色', instrument: '邦戈鼓', desc: '粉色鼓手' },
  { id: 'bongo-drum-blue',     color: '天蓝色', instrument: '邦戈鼓', desc: '蓝色鼓手' },
  { id: 'bongo-cymbal-gold',   color: '金黄色', instrument: '镲', desc: '金色镲手' },
  { id: 'bongo-marimba-green', color: '翡翠绿', instrument: '马林巴', desc: '绿色马林巴手' },
  // Animated
  { id: 'animated-default', color: '粉紫色配闪光', instrument: null, desc: '动画猫' },
  { id: 'animated-pink',    color: '粉色配闪光',   instrument: null, desc: '粉色动画猫' },
  { id: 'animated-blue',    color: '蓝色配闪光',   instrument: null, desc: '蓝色动画猫' },
];

const STYLE = `Cute kawaii pixel art avatar, 64x64 pixel style, chibi bongo cat (the famous meme cat that plays instruments with its paws on a table), round simple body, big cute eyes, tiny ears, no text no words, clean white background, game-style icon,`;

function buildPrompt(av) {
  let p = `${STYLE} ${av.color} colored cat`;
  if (av.instrument) {
    p += `, sitting at a table with a ${av.instrument} in front, paws on the ${av.instrument}`;
  } else {
    p += `, with sparkle/magic effects, animated feel`;
  }
  p += `, adorable expression, 128x128 output`;
  return p;
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
  console.log(`🐱 开始生成 ${avatars.length} 个像素风角色头像...`);
  console.log(`📁 输出: ${OUTPUT_DIR}\n`);

  let success = 0, fail = 0;
  const maxRetries = 2;

  for (let i = 0; i < avatars.length; i++) {
    const av = avatars[i];
    const outFile = path.join(OUTPUT_DIR, `${av.id}.png`);

    if (fs.existsSync(outFile)) {
      console.log(`⏭  [${i+1}/${avatars.length}] ${av.id} — 已存在`);
      success++;
      continue;
    }

    console.log(`🎨 [${i+1}/${avatars.length}] ${av.id} — ${av.desc} (${av.color})`);

    let done = false;
    for (let retry = 0; retry <= maxRetries && !done; retry++) {
      try {
        if (retry > 0) {
          console.log(`   ↻ 重试 ${retry}/${maxRetries}...`);
          await sleep(8000);
        }
        const result = await generateImage(buildPrompt(av));
        const ext = result.mimeType.includes('png') ? 'png' : result.mimeType.includes('webp') ? 'webp' : 'png';
        fs.writeFileSync(path.join(OUTPUT_DIR, `${av.id}.${ext}`), Buffer.from(result.data, 'base64'));
        console.log(`   ✅ ${av.id}.${ext}`);
        success++;
        done = true;
      } catch (err) {
        if (retry === maxRetries) {
          console.log(`   ❌ ${err.message}`);
          fail++;
        }
      }
    }

    if (i < avatars.length - 1) await sleep(4000);
  }

  console.log(`\n══════════════════════════════════`);
  console.log(`🎉 完成! 成功: ${success}, 失败: ${fail}`);
  console.log(`══════════════════════════════════`);
}

main().catch(console.error);
