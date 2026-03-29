const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 目标底图输出路径
const OUTPUT_SHEET_DIR = path.join(__dirname, 'src', 'pet', 'spritesheets', 'default');
const OUTPUT_SHEET_PNG = path.join(OUTPUT_SHEET_DIR, 'sheet.png');
const OUTPUT_SHEET_JSON = path.join(OUTPUT_SHEET_DIR, 'sheet.json');

// 单帧目标尺寸 (项目配置)
const FRAME_WIDTH = 300;
const FRAME_HEIGHT = 300;
const MAX_COLS = 6;

// 待处理的 AI 生成图
const SOURCES = [
  {
    file: 'spritesheet-typing-hachiware-transparent.png',
    gridCols: 3,
    gridRows: 3,
    totalFrames: 9,
    action: 'typing' // 我们将其映射到 typing-left / typing-right / chat-ai-thinking 等
  },
  {
    file: 'spritesheet-yawning-hachiware-transparent.png',
    gridCols: 3,
    gridRows: 3,
    totalFrames: 9,
    action: 'yawning' // 我们将其映射到 sleep 或 wake-up
  }
];

async function splitSpritesheet(sourceFile, gridCols, gridRows, totalFrames) {
  const frames = [];
  const sourcePath = path.join(__dirname, sourceFile);
  const metadata = await sharp(sourcePath).metadata();
  
  const cellWidth = Math.floor(metadata.width / gridCols);
  const cellHeight = Math.floor(metadata.height / gridRows);
  
  console.log(`正在切分 ${sourceFile}: 宽 ${metadata.width}, 高 ${metadata.height}`);
  console.log(`每个格子尺寸: ${cellWidth}x${cellHeight}`);

  let frameCount = 0;
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (frameCount >= totalFrames) break;
      
      const frameBuffer = await sharp(sourcePath)
        .extract({ left: c * cellWidth, top: r * cellHeight, width: cellWidth, height: cellHeight })
        .resize(FRAME_WIDTH, FRAME_HEIGHT, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();
        
      frames.push(frameBuffer);
      frameCount++;
    }
  }
  return frames;
}

async function main() {
  try {
    // 1. 读取原有的 sheet.json
    let sheetJson = { frameWidth: 300, frameHeight: 300, columns: 6, tintable: true, states: {} };
    if (fs.existsSync(OUTPUT_SHEET_JSON)) {
      sheetJson = JSON.parse(fs.readFileSync(OUTPUT_SHEET_JSON, 'utf8'));
    }

    // 计算当前有多少行（找出最大的 row 值）
    let maxRow = -1;
    for (const stateName in sheetJson.states) {
      if (sheetJson.states[stateName].row > maxRow) {
        maxRow = sheetJson.states[stateName].row;
      }
    }
    
    // 准备一个存放所有帧（旧的 + 新的）的结构
    // 为简单起见，如果我们要完全重构动画，这里直接重新生成比较好。
    // 但是考虑到我们要保留框架，我们把新的动作追加到后面。
    let newStatesRowStart = maxRow + 1;
    
    // 2. 切分图片
    console.log('切分图片...');
    const typingFrames = await splitSpritesheet(SOURCES[0].file, SOURCES[0].gridCols, SOURCES[0].gridRows, SOURCES[0].totalFrames);
    const yawningFrames = await splitSpritesheet(SOURCES[1].file, SOURCES[1].gridCols, SOURCES[1].gridRows, SOURCES[1].totalFrames);
    
    // 3. 将这些帧添加到现有的雪碧图配置中 (或者替换核心动作)
    // 为了让哈奇猫能直接跑起来，我们覆盖常用的状态行，并重新生成一张大图
    
    // 我们将:
    // typingFrames 的前 3 帧用于 idle (发呆)
    // typingFrames 的中间 3 帧用于 typing-left
    // typingFrames 的后 3 帧用于 typing-right
    // yawningFrames 的前 4 帧用于 sleep
    // yawningFrames 的后 3 帧用于 wake-up
    // yawningFrames 的中间几帧用于 happy / click-react
    
    // 重新定义 states 映射到我们新提取的帧集合
    const NEW_STATES = {
      "idle": { frames: [typingFrames[0], typingFrames[1], typingFrames[2], typingFrames[1]], frameDuration: 300, loop: true },
      "idle-blink": { frames: [typingFrames[0], typingFrames[1], typingFrames[0]], frameDuration: 100, loop: false },
      "typing-left": { frames: [typingFrames[3], typingFrames[4], typingFrames[5]], frameDuration: 80, loop: false },
      "typing-right": { frames: [typingFrames[6], typingFrames[7], typingFrames[8]], frameDuration: 80, loop: false },
      "click-react": { frames: [yawningFrames[4], yawningFrames[5], yawningFrames[6], yawningFrames[5]], frameDuration: 150, loop: false },
      "happy": { frames: [yawningFrames[4], yawningFrames[5], yawningFrames[4], yawningFrames[5]], frameDuration: 200, loop: true },
      "sleep": { frames: [yawningFrames[0], yawningFrames[1], yawningFrames[2], yawningFrames[3]], frameDuration: 400, loop: true },
      "wake-up": { frames: [yawningFrames[3], yawningFrames[2], yawningFrames[1], yawningFrames[0]], frameDuration: 150, loop: false, next: "idle" },
      "chat-ai-thinking": { frames: [typingFrames[3], typingFrames[4], typingFrames[5], typingFrames[6], typingFrames[7], typingFrames[8]], frameDuration: 100, loop: true },
      "chat-ai-done": { frames: [yawningFrames[4], yawningFrames[5], yawningFrames[6]], frameDuration: 200, loop: false },
      "mood-frustrated": { frames: [yawningFrames[6], yawningFrames[7], yawningFrames[8]], frameDuration: 150, loop: false },
      "mood-rushing": { frames: [typingFrames[4], typingFrames[5], typingFrames[7], typingFrames[8]], frameDuration: 80, loop: true }
    };

    // 4. 构建新的底图
    const totalRows = Object.keys(NEW_STATES).length;
    const finalImageWidth = MAX_COLS * FRAME_WIDTH;
    const finalImageHeight = totalRows * FRAME_HEIGHT;
    
    // 创建一个空白大图画布
    const canvas = sharp({
      create: {
        width: finalImageWidth,
        height: finalImageHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });

    const composites = [];
    const newSheetJson = {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
      columns: MAX_COLS,
      tintable: false, // 我们的哈奇猫是有颜色的，不应该被纯色覆盖
      states: {}
    };

    let currentRow = 0;
    for (const [stateName, config] of Object.entries(NEW_STATES)) {
      newSheetJson.states[stateName] = {
        row: currentRow,
        frames: config.frames.length,
        frameDuration: config.frameDuration,
        loop: config.loop
      };
      if (config.next) newSheetJson.states[stateName].next = config.next;

      // 放置帧
      for (let i = 0; i < config.frames.length; i++) {
        composites.push({
          input: config.frames[i],
          top: currentRow * FRAME_HEIGHT,
          left: i * FRAME_WIDTH
        });
      }
      currentRow++;
    }

    // 保存 PNG
    console.log(`生成新的雪碧底图... ${finalImageWidth}x${finalImageHeight}`);
    await canvas.composite(composites).png().toFile(OUTPUT_SHEET_PNG);
    
    // 保存 JSON
    fs.writeFileSync(OUTPUT_SHEET_JSON, JSON.stringify(newSheetJson, null, 2));
    console.log('✅ 成功生成新的 sheet.png 和 sheet.json！');
    
  } catch (e) {
    console.error('❌ 处理失败:', e);
  }
}

main();