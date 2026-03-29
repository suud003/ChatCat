/**
 * ChatCat Spritesheet 生成器
 * 使用 Gemini Nano Banana 2 (gemini-3.1-flash-image-preview) 生成所有动画帧
 * 最终合成 src/pet/spritesheets/default/sheet.png
 *
 * Usage: node generate-spritesheet.js
 * 需要 sharp: npm install sharp (已在 devDependencies)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static');
} catch {
  console.log('⚠️  ffmpeg-static 未安装，尝试安装...');
  execSync('npm install ffmpeg-static --save-dev', { stdio: 'inherit', cwd: __dirname });
  ffmpegPath = require('ffmpeg-static');
}

// sharp 是按需引入的，为了抠图我们需要提前引入
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.log('⚠️  sharp 未安装，尝试安装...');
  execSync('npm install sharp --save-dev', { stdio: 'inherit', cwd: __dirname });
  sharp = require('sharp');
}

const API_KEY = 'AIzaSyC3dFkMULgvXaooBG-49_53dUabTRbWq58';
const MODEL = 'gemini-3.1-flash-image-preview';

const FRAME_SIZE = 300;   // 每帧 300×300px（与 sheet.json 一致）
const OUTPUT_DIR = path.join(__dirname, 'src', 'pet', 'spritesheets', 'default');
const FRAMES_DIR = path.join(OUTPUT_DIR, 'frames');  // 临时帧存储
const SHEET_OUT  = path.join(OUTPUT_DIR, 'sheet.png');

if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// 动画状态定义（与 sheet.json 完全对应）
// 每个 state 需要生成 frames 帧，每帧保存为 frames/{state}-{frameIdx}.png
// ─────────────────────────────────────────────────────────────────────────────
const STATES = [
  // ── 现有 8 个基础状态 ──
  {
    name: 'idle',
    row: 0, frames: 30, frameDuration: 200, loop: true,
    desc: [
      'sitting upright, ears perked, eyes open, calm breathing pose, frame 1 of 6',
      'sitting upright, ears perked, eyes open, body very slightly shifted up, frame 2 of 6',
      'sitting upright, ears perked, eyes half-closed relaxed, body neutral, frame 3 of 6',
      'sitting upright, ears perked, eyes open, body very slightly shifted down, frame 4 of 6',
      'sitting upright, ears perked, eyes open, calm, frame 5 of 6',
      'sitting upright, ears relaxed, eyes softly open, body neutral idle, frame 6 of 6',
    ],
  },
  {
    name: 'idle-blink',
    row: 1, frames: 30, frameDuration: 80, loop: false,
    desc: [
      'sitting, eyes starting to close halfway, blinking, frame 1 of 3',
      'sitting, eyes fully closed, blink peak, frame 2 of 3',
      'sitting, eyes opening back up, blink recovery, frame 3 of 3',
    ],
  },
  {
    name: 'typing-left',
    row: 2, frames: 30, frameDuration: 60, loop: false,
    desc: [
      'cat raising left paw up ready to strike downwards, right paw resting, frame 1 of 3',
      'cat left paw pressing down firmly, right paw resting, frame 2 of 3',
      'cat left paw bouncing back up, right paw resting, frame 3 of 3',
    ],
  },
  {
    name: 'typing-right',
    row: 3, frames: 30, frameDuration: 60, loop: false,
    desc: [
      'cat raising right paw up ready to strike downwards, left paw resting, frame 1 of 3',
      'cat right paw pressing down firmly, left paw resting, frame 2 of 3',
      'cat right paw bouncing back up, left paw resting, frame 3 of 3',
    ],
  },
  {
    name: 'click-react',
    row: 4, frames: 30, frameDuration: 120, loop: false,
    desc: [
      'cat both paws raising up in surprise, eyes wide, frame 1 of 4',
      'cat both paws raised high, mouth open surprised expression, frame 2 of 4',
      'cat paws slightly lowering, surprised expression fading, frame 3 of 4',
      'cat paws returning to rest, expression normalizing, frame 4 of 4',
    ],
  },
  {
    name: 'happy',
    row: 5, frames: 30, frameDuration: 180, loop: true,
    desc: [
      'cat happy, body swaying left, big smile, curved happy eyes, frame 1 of 4',
      'cat happy, body centered, big smile, eyes curved upward, frame 2 of 4',
      'cat happy, body swaying right, big smile, curved happy eyes, frame 3 of 4',
      'cat happy, body centered returning, big smile, frame 4 of 4',
    ],
  },
  {
    name: 'sleep',
    row: 6, frames: 30, frameDuration: 500, loop: true,
    desc: [
      'cat curled up sleeping, eyes closed, small Zzz floating above, peaceful, frame 1 of 4',
      'cat curled sleeping, ZzZ floating, body slightly puffed, frame 2 of 4',
      'cat curled sleeping, zZZ floating larger, frame 3 of 4',
      'cat curled sleeping, Zzz returning small, breathing slowly, frame 4 of 4',
    ],
  },
  {
    name: 'wake-up',
    row: 7, frames: 30, frameDuration: 150, loop: false, next: 'idle',
    desc: [
      'cat startled awake, bolting upright from sleeping curl, eyes snapping open, fur slightly puffed, frame 1 of 3',
      'cat standing alert, ears straight up, eyes wide, fur still puffed, frame 2 of 3',
      'cat settling down, ears relaxed, fur smoothing, returning to normal pose, frame 3 of 3',
    ],
  },

  // ── P0 新增状态（14项核心动画）──
  {
    name: 'chat-ai-thinking',
    row: 8, frames: 30, frameDuration: 100, loop: true,
    desc: [
      'cat rapidly moving paws up and down as if typing, focused expression, small "..." speech bubble above head, frame 1 of 4',
      'cat moving paws fast, left paw down, "..." bubble, focused look, frame 2 of 4',
      'cat moving paws fast, right paw down, "..." bubble, slightly leaning forward, frame 3 of 4',
      'cat moving paws fast, both paws moving, "..." bubble with dots pulsing, frame 4 of 4',
    ],
  },
  {
    name: 'chat-ai-done',
    row: 9, frames: 30, frameDuration: 200, loop: false,
    desc: [
      'cat stopping paw movement, paws lifting up into the air, smug proud expression appearing, frame 1 of 3',
      'cat sitting proud, chest puffed out, smug smile, star sparkle near face, frame 2 of 3',
      'cat swaying proudly, big satisfied smirk, body rocking with pride, frame 3 of 3',
    ],
  },
  {
    name: 'mood-frustrated',
    row: 10, frames: 30, frameDuration: 150, loop: false,
    desc: [
      'cat showing worried expression, ears drooping slightly downward, frame 1 of 4',
      'cat with drooping ears, hunched body, slightly worried eyes with sweat drop, frame 2 of 4',
      'cat with ears down, body shrunken/curled slightly, concerned frown, frame 3 of 4',
      'cat with lowered ears, small nervous expression, body slightly contracted, frame 4 of 4',
    ],
  },
  {
    name: 'mood-rushing',
    row: 11, frames: 30, frameDuration: 100, loop: false,
    desc: [
      'cat with alert expression, ears perking straight up suddenly, body slightly forward-leaning, frame 1 of 3',
      'cat fully alert, ears erect, body leaning forward, widened alert eyes, motion lines, frame 2 of 3',
      'cat alert leaning forward, ears very erect, determined expression, body tense, frame 3 of 3',
    ],
  },
  {
    name: 'greeting-morning',
    row: 12, frames: 30, frameDuration: 150, loop: false,
    desc: [
      'cat waking up cheerfully, stretching paws upward, happy eyes, morning sunbeam, frame 1 of 6',
      'cat stretching one paw up waving hello, bright happy expression, frame 2 of 6',
      'cat waving paw enthusiastically, big smile, body swaying happy, frame 3 of 6',
      'cat waving with excitement, cheerful eyes, sparkle near head, frame 4 of 6',
      'cat doing a little jump of joy, paws spread, big grin, frame 5 of 6',
      'cat landing from jump, settling into happy upright pose, waving, frame 6 of 6',
    ],
  },
  {
    name: 'daily-greeting',
    row: 13, frames: 30, frameDuration: 180, loop: false,
    desc: [
      'cat waving one paw in a welcoming hello gesture, happy expression, frame 1 of 4',
      'cat waving higher, bright happy face, slight lean toward viewer, frame 2 of 4',
      'cat doing a small hop/jump of welcome, paws spread, big smile, frame 3 of 4',
      'cat landing, settling into happy pose, paw still slightly raised, smiling, frame 4 of 4',
    ],
  },
  {
    name: 'skill-start',
    row: 14, frames: 30, frameDuration: 120, loop: false,
    desc: [
      'cat looking focused, magnifying glass icon floating above head, leaning forward, frame 1 of 4',
      'cat moving paws intently, small tool icon above head (magnifier/pen), determined expression, frame 2 of 4',
      'cat in full concentration mode, moving paws fast, skill icon floating and glowing above, frame 3 of 4',
      'cat deeply focused moving paws, skill icon settled above head, intense working expression, frame 4 of 4',
    ],
  },
  {
    name: 'skill-done',
    row: 15, frames: 30, frameDuration: 180, loop: false,
    desc: [
      'cat stopping work, lifting one paw in victory, smug proud face, frame 1 of 4',
      'cat raising paw making OK gesture, proud smiling face, small sparkle, frame 2 of 4',
      'cat holding up paw in clear OK/thumbs-up gesture, very proud expression, frame 3 of 4',
      'cat with OK paw raised, chest puffed with pride, satisfied smirk, star sparkle, frame 4 of 4',
    ],
  },
  {
    name: 'pomo-focus-start',
    row: 16, frames: 30, frameDuration: 150, loop: false,
    desc: [
      'cat putting on small headphones/earphones, reaching up to head, focused expression, frame 1 of 5',
      'cat headphones settling on ears, expression becoming serious and focused, frame 2 of 5',
      'cat with headphones on, sitting upright in focused posture, serious determined face, frame 3 of 5',
      'cat fully in focus mode with headphones, body straight, very concentrated expression, frame 4 of 5',
      'cat in full focus pose with headphones, hands ready to strike downwards, game face on, frame 5 of 5',
    ],
  },
  {
    name: 'pomo-focus-done',
    row: 17, frames: 30, frameDuration: 150, loop: false,
    desc: [
      'cat removing headphones excitedly, paws going up in celebration, frame 1 of 6',
      'cat throwing both paws up in victory cheer, headphones flying off, frame 2 of 6',
      'cat with both paws raised high celebrating, stars and sparkles exploding around head, frame 3 of 6',
      'cat cheering with arms up, proud victorious face, stars raining down, frame 4 of 6',
      'cat doing victory pose, big ecstatic smile, star confetti falling, frame 5 of 6',
      'cat settling into proud pose, satisfied big smile, few stars still floating, frame 6 of 6',
    ],
  },
  {
    name: 'todo-check',
    row: 18, frames: 30, frameDuration: 150, loop: false,
    desc: [
      'cat raising one paw in the air, beginning to draw a checkmark gesture, frame 1 of 4',
      'cat paw drawing a checkmark ✓ in the air, focused happy expression, frame 2 of 4',
      'cat completing the checkmark gesture, brief flash of happy expression, frame 3 of 4',
      'cat paw settling back down, small satisfied smile, tiny checkmark sparkle, frame 4 of 4',
    ],
  },
  {
    name: 'level-up',
    row: 19, frames: 30, frameDuration: 120, loop: false,
    desc: [
      'cat beginning to glow with golden light all over body, surprised expression, frame 1 of 6',
      'cat glowing brighter, body shimmering gold, excited face, frame 2 of 6',
      'cat jumping upward in joy, golden glow at peak, stars bursting around head, frame 3 of 6',
      'cat at apex of jump, full golden glow, massive star explosion all around, frame 4 of 6',
      'cat landing from jump, golden sparkles raining down, triumphant expression, frame 5 of 6',
      'cat settled, radiating golden afterglow, huge proud smile, stars fading, frame 6 of 6',
    ],
  },
];

// 临时修改：为了让你能先看这2个动作是否正确透明、是否符合要求
const _STATES = STATES.filter(s => ['idle', 'typing-left', 'typing-right'].includes(s.name));
STATES.splice(0, STATES.length, ..._STATES);

// ─────────────────────────────────────────────────────────────────────────────
// 角色基础风格描述（全身小猫，参考 bongo.cat + petclaw 风格）
// ─────────────────────────────────────────────────────────────────────────────
const BASE_STYLE = `
Hachiware cat character from Chiikawa. Small, chubby, mostly white body with a light blue "V" shape mask on the top of its head resembling parted bangs. 
Small rounded blue ears matching the mask color.
Big, shiny, dark expressive round eyes with white highlights.
Tiny "Y" shaped nose and mouth, pink blush marks on cheeks.
Short stubby arms and legs, small blue tail.
DO NOT DRAW ANY KEYBOARD, DESK, OR PROPS. The character should be doing the actions in mid-air.
Black outlines, clean crisp cute flat cartoon manga art style.
THE BACKGROUND MUST BE PURE SOLID WHITE (#FFFFFF) for chroma keying.
Centered in frame, game sprite style, consistent character design.
`.trim().replace(/\n/g, ' ');

// ─────────────────────────────────────────────────────────────────────────────
// 绿幕抠图处理
// ─────────────────────────────────────────────────────────────────────────────
async function removeWhiteBackground(inputPath, outputPath) {
  try {
    const { data, info } = await sharp(inputPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Check for pure or near-pure white background
      // Also apply a small feathering/anti-alias hack based on luminance if needed
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luma > 240) {
        data[i + 3] = 0; // alpha = 0 completely
      } else if (luma > 200) {
        // smooth edge slightly
        data[i + 3] = Math.max(0, 255 - (luma - 200) * 4.6); 
      }
    }

    await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 }
    })
    .png()
    .toFile(outputPath);
    return true;
  } catch (err) {
    console.error(`扣除绿幕失败: ${err.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API 调用 (生成视频)
// ─────────────────────────────────────────────────────────────────────────────
function requestPost(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function requestGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function downloadBinary(urlStr) {
  return new Promise((resolve, reject) => {
    https.get(urlStr, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Handle redirect
        https.get(res.headers.location, r => {
          const chunks = [];
          r.on('data', c => chunks.push(c));
          r.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
      } else if (res.statusCode === 200) {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      } else {
        reject(new Error(`Download failed with status code ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function generateFrameImage(prompt) {
  const startUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  
  // 读取参考图片并转换为 base64
  let imageBase64 = '';
  try {
    const refImagePath = path.join(__dirname, 'reference', '第5帧.png');
    if (fs.existsSync(refImagePath)) {
      imageBase64 = fs.readFileSync(refImagePath).toString('base64');
    }
  } catch (err) {}

  const parts = [{ text: prompt }];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: imageBase64
      }
    });
  }

  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: { 
      responseModalities: ['IMAGE'], 
      temperature: 0.1
    }
  });

  const res = await requestPost(startUrl, body);
  if (res.error) {
    throw new Error(`API Error: ${res.error.message}`);
  }

  let foundImage = false;
  for (const c of (res.candidates || [])) {
    for (const p of (c.content?.parts || [])) {
      if (p.inlineData) {
        return Buffer.from(p.inlineData.data, 'base64');
      }
    }
  }
  
  throw new Error(`No image in response. Raw response: ${JSON.stringify(res).slice(0, 300)}`);
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
// 主流程：按动作生成视频 -> ffmpeg提取序列帧 -> 去除绿幕
// ─────────────────────────────────────────────────────────────────────────────
async function generateAllFrames() {
  const totalFrames = STATES.reduce((sum, s) => sum + s.frames, 0);
  console.log(`\n🐱 ChatCat Spritesheet 生成器 (先生成整图再拆分管线)`);
  console.log(`📊 ${STATES.length} 个动画状态，共 ${totalFrames} 帧`);
  console.log(`📐 每帧 ${FRAME_SIZE}×${FRAME_SIZE}px`);
  console.log(`📁 帧缓存: ${FRAMES_DIR}`);
  console.log(`🎯 输出: ${SHEET_OUT}\n`);

  let done = 0, skip = 0, fail = 0;

  for (const state of STATES) {
    console.log(`\n▶ [行${state.row}] ${state.name} (${state.frames}帧)`);

    // 检查是否所有帧都已经存在
    let allFramesExist = true;
    for (let fi = 0; fi < state.frames; fi++) {
      if (!fs.existsSync(path.join(FRAMES_DIR, `${state.name}-${fi}.png`))) {
        allFramesExist = false;
        break;
      }
    }

    if (allFramesExist) {
      console.log(`   ⏭  ${state.name} 序列帧 — 全部已存在`);
      skip += state.frames;
      continue;
    }

    const actionDesc = state.desc[0];
    const cols = 6;
    const rows = Math.ceil(state.frames / cols);
    const prompt = `${BASE_STYLE} Generate a full 2D game spritesheet. The character is performing: ${actionDesc}. 
CRITICAL REQUIREMENTS:
1. The spritesheet MUST contain exactly ${state.frames} sequential frames of the animation.
2. The frames MUST be arranged in a perfect grid with exactly ${cols} columns and ${rows} rows.
3. You MUST leave thick empty white padding between every column and row. No parts of the character should overlap into adjacent grid cells.
4. Ensure consistent character positioning perfectly centered in each imaginary grid cell.
5. Do NOT include any background, lines, grids, or borders other than pure solid white (#FFFFFF) for chroma keying.`;

    const sheetFile = path.join(FRAMES_DIR, `${state.name}_generated_sheet.png`);
    let success = false;

    for (let retry = 0; retry <= 2; retry++) {
      try {
        if (retry > 0) {
          console.log(`   ↻ 重新请求整图 ${retry}/2...`);
          await sleep(5000);
        }
        
        if (!fs.existsSync(sheetFile)) {
          console.log(`   ⏳ 正在请求生成动作整图 (${cols}列x${rows}行) ...`);
          const imgBuf = await generateFrameImage(prompt);
          fs.writeFileSync(sheetFile, imgBuf);
          console.log(`   ✅ 成功生成整图: ${sheetFile}`);
        } else {
          console.log(`   ⏭️ 整图已存在: ${sheetFile}`);
        }
        
        // 拆分图片
        console.log(`   🎬 拆分整图为序列帧...`);
        const metadata = await sharp(sheetFile).metadata();
        
        // Validation for missing or invalid grid image
        if (metadata.width < cols * 50 || metadata.height < rows * 50) {
          fs.unlinkSync(sheetFile); // Delete invalid image
          throw new Error("Generated image is too small to be a proper grid, deleted sheet to retry.");
        }
        const frameW = Math.floor(metadata.width / cols);
        const frameH = Math.floor(metadata.height / rows);
        
        for (let fi = 0; fi < state.frames; fi++) {
          const col = fi % cols;
          const row = Math.floor(fi / cols);
          
          const destFile = path.join(FRAMES_DIR, `${state.name}-${fi}.png`);
          const tempFile = path.join(FRAMES_DIR, `${state.name}-${fi}_temp.png`);
          
          // Ensure extract bounds don't exceed the image size due to rounding errors
          const safeLeft = col * frameW;
          const safeTop = row * frameH;
          const safeWidth = Math.min(frameW, metadata.width - safeLeft);
          const safeHeight = Math.min(frameH, metadata.height - safeTop);
          
          if (safeWidth <= 0 || safeHeight <= 0) {
            throw new Error(`Invalid extract area for frame ${fi}: ${safeLeft}, ${safeTop}, ${safeWidth}, ${safeHeight}`);
          }

          // Crop perfectly and center using sharp
          try {
            const tempBuf = await sharp(sheetFile)
              .extract({ left: safeLeft, top: safeTop, width: safeWidth, height: safeHeight })
              // Attempt to trim off the background to exactly find the subject bounding box.
              // We pass threshold 10 to clear slight artifacts
              .trim({ threshold: 10 })
              .toBuffer();

            // Resize with padding back to standard size, centering the character
            // We scale it down slightly to ensure it doesn't touch the edges
            await sharp(tempBuf)
              .resize(Math.floor(FRAME_SIZE * 0.9), Math.floor(FRAME_SIZE * 0.9), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
              .extend({
                top: Math.floor(FRAME_SIZE * 0.05),
                bottom: Math.ceil(FRAME_SIZE * 0.05),
                left: Math.floor(FRAME_SIZE * 0.05),
                right: Math.ceil(FRAME_SIZE * 0.05),
                background: { r: 255, g: 255, b: 255, alpha: 1 }
              })
              .toFile(tempFile);
          } catch (e) {
            console.log(`   ⚠️ 第 ${fi} 帧处理失败 (可能整张全白被 trim 报错), 降级普通裁剪: ${e.message}`);
            await sharp(sheetFile)
              .extract({ left: safeLeft, top: safeTop, width: safeWidth, height: safeHeight })
              .resize(FRAME_SIZE, FRAME_SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
              .toFile(tempFile);
          }
            
          await removeWhiteBackground(tempFile, destFile);
          fs.unlinkSync(tempFile);
        }
        
        console.log(`   ✅ 成功拆分并抠图 ${state.frames} 帧`);
        success = true;
        done += state.frames;
        break;
      } catch (err) {
        if (retry === 2) {
          console.error(`   ❌ 整图生成或拆分失败: ${err.message}`);
          console.error(err);
        }
      }
    }

    if (!success) {
      fail += state.frames;
    }
    
    // API 限速 (针对图片生成API，可能需要限速)
    await sleep(2000);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ 生成: ${done}  ⏭ 跳过: ${skip}  ❌ 失败: ${fail}`);
  console.log(`${'─'.repeat(50)}\n`);

  return fail;
}

// ─────────────────────────────────────────────────────────────────────────────
// Spritesheet 拼合（使用 sharp）
// ─────────────────────────────────────────────────────────────────────────────
async function compositeSheet() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('⚠️  sharp 未安装，尝试安装...');
    execSync('npm install sharp --save-dev', { stdio: 'inherit', cwd: __dirname });
    sharp = require('sharp');
  }

  const maxCols = Math.max(...STATES.map(s => s.frames));
  const totalRows = STATES.length;
  const sheetW = maxCols * FRAME_SIZE;
  const sheetH = totalRows * FRAME_SIZE;

  console.log(`🖼  合成 Spritesheet: ${sheetW}×${sheetH}px (${maxCols}列 × ${totalRows}行)`);

  const composites = [];
  let missing = 0;

  for (const state of STATES) {
    for (let fi = 0; fi < state.frames; fi++) {
      const frameFile = path.join(FRAMES_DIR, `${state.name}-${fi}.png`);
      if (!fs.existsSync(frameFile)) {
        console.log(`   ⚠️  缺少帧: ${state.name}-${fi}.png — 用占位符代替`);
        missing++;
        // 创建占位符（彩色方块）
        const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#FFB347','#87CEEB','#98FB98','#D8B4FE'];
        const color = colors[state.row % colors.length];
        await sharp({
          create: {
            width: FRAME_SIZE, height: FRAME_SIZE, channels: 4,
            background: { r: 200, g: 200, b: 200, alpha: 0.3 }
          }
        }).png().toFile(frameFile);
      }

      composites.push({
        input: frameFile,
        left: fi * FRAME_SIZE,
        top: state.row * FRAME_SIZE,
      });
    }
  }

  // 创建透明底板并合成
  await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite(composites)
  .png({ compressionLevel: 9 })
  .toFile(SHEET_OUT);

  console.log(`✅ Spritesheet 已保存: ${SHEET_OUT}`);
  if (missing > 0) {
    console.log(`⚠️  ${missing} 帧缺失，使用了占位符`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 更新 sheet.json（同步新增状态）
// ─────────────────────────────────────────────────────────────────────────────
function updateSheetJson() {
  const meta = {
    frameWidth: FRAME_SIZE,
    frameHeight: FRAME_SIZE,
    columns: Math.max(...STATES.map(s => s.frames)),
    tintable: true,
    states: {}
  };

  for (const s of STATES) {
    meta.states[s.name] = {
      row: s.row,
      frames: s.frames,
      frameDuration: s.frameDuration,
      loop: s.loop,
      ...(s.next ? { next: s.next } : {}),
    };
  }

  const jsonPath = path.join(OUTPUT_DIR, 'sheet.json');
  fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2));
  console.log(`✅ sheet.json 已更新 (${STATES.length} 个状态, ${meta.columns} 列)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 入口
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const onlyComposite = args.includes('--composite-only');
  const onlyJson = args.includes('--json-only');

  if (onlyJson) {
    updateSheetJson();
    return;
  }

  if (!onlyComposite) {
    const fails = await generateAllFrames();
    if (fails > 0) {
      console.log(`\n⚠️  有 ${fails} 帧生成失败，但仍继续拼合（失败帧会用占位符）`);
    }
  }

  console.log('\n🔨 开始拼合 Spritesheet...');
  await compositeSheet();

  console.log('\n📝 更新 sheet.json...');
  updateSheetJson();

  console.log('\n🎉 全部完成！');
  console.log(`   Sheet:     ${SHEET_OUT}`);
  console.log(`   Config:    ${path.join(OUTPUT_DIR, 'sheet.json')}`);
  console.log(`\n💡 选项:`);
  console.log(`   --composite-only   跳过生成，仅拼合已有帧`);
  console.log(`   --json-only        仅更新 sheet.json 配置`);
}

main().catch(err => {
  console.error('❌ 致命错误:', err);
  process.exit(1);
});
