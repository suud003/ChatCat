const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SPRITE_W = 800;
const SPRITE_H = 900;
const CROP_Y = 320;
const CROP_H = 530;
const DEFAULT_FRAME_PATTERN = 'frame_001.png ~ frame_999.png';
const DEFAULT_MAX_COLUMNS = 24;

function getFrameNumber(fileName) {
  const match = /^frame_(\d+)\.(png|webp)$/i.exec(fileName) || /^(\d+)\.(png|webp)$/i.exec(fileName);
  return match ? Number.parseInt(match[1], 10) : Number.NaN;
}

function formatFrameFileName(index) {
  return `frame_${String(index).padStart(3, '0')}.png`;
}

function getStateColumns(state, fallbackColumns = DEFAULT_MAX_COLUMNS) {
  const value = Number(state?.columns || fallbackColumns || 1);
  return Math.max(1, value);
}

function getStateRowCount(state, fallbackColumns = DEFAULT_MAX_COLUMNS) {
  const frames = Math.max(0, Number(state?.frames || 0));
  const columns = getStateColumns(state, fallbackColumns);
  return Math.max(1, Math.ceil(frames / Math.max(1, columns)));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getClassicCatOverlayWorkflow(stateName = 'drowsy') {
  const rootSourceDir = path.join(__dirname, 'animation-sources', 'classic-cat-overlay');
  const sourceDir = path.join(rootSourceDir, stateName);
  return {
    id: 'classic-cat-overlay',
    label: `经典猫 ${stateName}`,
    stateName,
    rootSourceDir,
    sourceDir,
    referenceDir: path.join(sourceDir, 'reference'),
    framesDir: path.join(sourceDir, 'frames'),
    referencePath: path.join(sourceDir, 'reference', 'base.png'),
    buildDir: path.join(__dirname, 'cat-overlays', 'default'),
    sheetPath: path.join(__dirname, 'cat-overlays', 'default', 'sheet.png'),
    configPath: path.join(__dirname, 'cat-overlays', 'default', 'sheet.json'),
    framePattern: DEFAULT_FRAME_PATTERN,
  };
}

function getSpriteSheetStateWorkflow(sheetId = 'default', stateName = 'idle') {
  const rootSourceDir = path.join(__dirname, 'animation-sources', 'spritesheets', sheetId);
  const sourceDir = path.join(rootSourceDir, stateName);
  return {
    id: `spritesheet-${sheetId}`,
    label: `SpriteSheet ${sheetId} ${stateName}`,
    sheetId,
    stateName,
    rootSourceDir,
    sourceDir,
    referenceDir: path.join(sourceDir, 'reference'),
    framesDir: path.join(sourceDir, 'frames'),
    referencePath: path.join(sourceDir, 'reference', 'base.png'),
    buildDir: path.join(__dirname, 'spritesheets', sheetId),
    sheetPath: path.join(__dirname, 'spritesheets', sheetId, 'sheet.png'),
    configPath: path.join(__dirname, 'spritesheets', sheetId, 'sheet.json'),
    framePattern: DEFAULT_FRAME_PATTERN,
  };
}

function resolveAnimationWorkflow(assetId, stateName) {
  if (assetId === 'classic-cat-overlay') {
    return getClassicCatOverlayWorkflow(stateName || 'drowsy');
  }
  if (/^spritesheet-/.test(assetId || '')) {
    const sheetId = String(assetId).replace(/^spritesheet-/, '') || 'default';
    return getSpriteSheetStateWorkflow(sheetId, stateName || 'idle');
  }
  throw new Error(`未知动画工作流: ${assetId}`);
}

function ensureWorkflowDirs(workflow) {
  ensureDir(workflow.sourceDir);
  ensureDir(workflow.referenceDir);
  ensureDir(workflow.framesDir);
  ensureDir(path.join(workflow.sourceDir, 'frames-black'));
  ensureDir(workflow.buildDir);
  return workflow;
}

async function exportClassicCatReference(workflow = getClassicCatOverlayWorkflow()) {
  ensureWorkflowDirs(workflow);
  const spriteDir = path.join(__dirname, 'sprites');
  const layerNames = ['cat', 'mouth', 'paw-left', 'paw-right'];
  let canvas = sharp({
    create: {
      width: SPRITE_W,
      height: SPRITE_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).png();

  for (const name of layerNames) {
    const layerPath = path.join(spriteDir, `${name}.png`);
    const input = await sharp(layerPath)
      .extract({ left: 0, top: 0, width: SPRITE_W, height: SPRITE_H })
      .png()
      .toBuffer();
    const nextBuffer = await canvas
      .composite([{ input, left: 0, top: 0 }])
      .png()
      .toBuffer();
    canvas = sharp(nextBuffer);
  }

  await canvas
    .extract({ left: 0, top: CROP_Y, width: SPRITE_W, height: CROP_H })
    .png()
    .toFile(workflow.referencePath);

  return {
    referencePath: workflow.referencePath,
    frameWidth: SPRITE_W,
    frameHeight: CROP_H,
  };
}

async function exportSheetStateReference(workflow) {
  ensureWorkflowDirs(workflow);
  if (!fs.existsSync(workflow.sheetPath) || !fs.existsSync(workflow.configPath)) {
    throw new Error('当前动画还没有可导出的 sheet.png / sheet.json');
  }
  const config = JSON.parse(fs.readFileSync(workflow.configPath, 'utf-8'));
  const state = config.states?.[workflow.stateName];
  if (!state) {
    throw new Error(`sheet.json 中不存在状态: ${workflow.stateName}`);
  }
  const frameWidth = Number(config.frameWidth || 0);
  const frameHeight = Number(config.frameHeight || 0);
  const row = Number(state.row || 0);
  if (!frameWidth || !frameHeight) {
    throw new Error('当前状态参考帧尺寸无效');
  }

  await sharp(workflow.sheetPath)
    .extract({
      left: 0,
      top: row * frameHeight,
      width: frameWidth,
      height: frameHeight,
    })
    .png()
    .toFile(workflow.referencePath);

  return {
    referencePath: workflow.referencePath,
    frameWidth,
    frameHeight,
  };
}

function listFrameFiles(framesDir) {
  if (!fs.existsSync(framesDir)) return [];
  return fs.readdirSync(framesDir)
    .filter((name) => Number.isFinite(getFrameNumber(name)))
    .sort((a, b) => getFrameNumber(a) - getFrameNumber(b));
}

async function bakeWorkflowSheet(workflow = getClassicCatOverlayWorkflow()) {
  ensureWorkflowDirs(workflow);
  const frameFiles = listFrameFiles(workflow.framesDir);
  if (frameFiles.length === 0) {
    throw new Error(`frames 目录为空，请先放入 ${workflow.framePattern} 命名的 PNG/WebP 帧图`);
  }

  let frameWidth = 0;
  let frameHeight = 0;
  const composites = [];

  for (let index = 0; index < frameFiles.length; index += 1) {
    const frameName = frameFiles[index];
    const framePath = path.join(workflow.framesDir, frameName);
    const image = sharp(framePath);
    const meta = await image.metadata();
    if (!meta.width || !meta.height) {
      throw new Error(`无法读取帧尺寸: ${frameName}`);
    }
    if (index === 0) {
      frameWidth = meta.width;
      frameHeight = meta.height;
    } else if (meta.width !== frameWidth || meta.height !== frameHeight) {
      throw new Error(`帧尺寸不一致: ${frameName} 是 ${meta.width}x${meta.height}，预期 ${frameWidth}x${frameHeight}`);
    }

    composites.push({
      input: await image.png().toBuffer(),
      left: index * frameWidth,
      top: 0,
    });
  }

  const existingConfig = fs.existsSync(workflow.configPath)
    ? JSON.parse(fs.readFileSync(workflow.configPath, 'utf-8'))
    : {};
  const existingState = existingConfig.states?.[workflow.stateName] || {};
  const row = Number(existingState.row || 0);
  const stateColumns = getStateColumns(existingState, Math.min(frameFiles.length, Number(existingConfig.columns || DEFAULT_MAX_COLUMNS)));
  const nextRowCount = getStateRowCount({ frames: frameFiles.length, columns: stateColumns }, stateColumns);
  const oldRowCount = getStateRowCount(existingState, Number(existingConfig.columns || stateColumns));
  const existingSheet = fs.existsSync(workflow.sheetPath) ? sharp(workflow.sheetPath) : null;
  const existingMeta = existingSheet ? await existingSheet.metadata() : null;
  const nextStates = {
    ...(existingConfig.states || {}),
    [workflow.stateName]: {
      ...(existingConfig.states?.[workflow.stateName] || {}),
      row,
      frames: frameFiles.length,
      columns: stateColumns,
      frameDuration: Number(existingState.frameDuration || 280),
      loop: existingState.loop === true,
      ...(existingState.next ? { next: existingState.next } : {}),
    },
  };
  const nextColumns = Math.max(
    1,
    ...Object.values(nextStates).map((state) => getStateColumns(state, Number(existingConfig.columns || DEFAULT_MAX_COLUMNS)))
  );
  const currentFrameWidth = Number(existingConfig.frameWidth || frameWidth);
  const currentFrameHeight = Number(existingConfig.frameHeight || frameHeight);
  const maxRow = Math.max(
    0,
    ...Object.values(nextStates).map((state) => Number(state?.row || 0) + getStateRowCount(state, nextColumns) - 1)
  );
  const outputWidth = Math.max(currentFrameWidth * nextColumns, frameWidth * stateColumns);
  const outputHeight = Math.max(currentFrameHeight * (maxRow + 1), frameHeight * (row + nextRowCount));

  let canvas = sharp({
    create: {
      width: outputWidth,
      height: outputHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).png();

  if (existingSheet) {
    const boundedWidth = Math.min(existingMeta?.width || outputWidth, outputWidth);
    const boundedHeight = Math.min(existingMeta?.height || outputHeight, outputHeight);
    const compositesToKeep = [];
    const rowTop = row * frameHeight;
    const rowBottom = rowTop + (Math.max(oldRowCount, nextRowCount) * frameHeight);

    if (rowTop > 0 && boundedHeight > 0) {
      compositesToKeep.push({
        input: await existingSheet
          .extract({
            left: 0,
            top: 0,
            width: boundedWidth,
            height: Math.min(rowTop, boundedHeight),
          })
          .png()
          .toBuffer(),
        left: 0,
        top: 0,
      });
    }

    if (boundedHeight > rowBottom) {
      compositesToKeep.push({
        input: await existingSheet
          .extract({
            left: 0,
            top: rowBottom,
            width: boundedWidth,
            height: boundedHeight - rowBottom,
          })
          .png()
          .toBuffer(),
        left: 0,
        top: rowBottom,
      });
    }

    if (compositesToKeep.length > 0) {
      canvas = sharp(await canvas.composite(compositesToKeep).png().toBuffer());
    }
  }

  const rowBuffers = [];
  for (let rowIndex = 0; rowIndex < nextRowCount; rowIndex += 1) {
    const start = rowIndex * stateColumns;
    const end = Math.min(start + stateColumns, frameFiles.length);
    const rowComposites = [];
    for (let index = start; index < end; index += 1) {
      rowComposites.push({
        input: composites[index].input,
        left: (index - start) * frameWidth,
        top: 0,
      });
    }
    const rowBuffer = await sharp({
      create: {
        width: frameWidth * stateColumns,
        height: frameHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite(rowComposites).png().toBuffer();
    rowBuffers.push({
      input: rowBuffer,
      left: 0,
      top: (row + rowIndex) * frameHeight,
    });
  }

  await canvas
    .composite(rowBuffers)
    .png()
    .toFile(workflow.sheetPath);

  const nextConfig = {
    ...existingConfig,
    frameWidth,
    frameHeight,
    columns: nextColumns,
    tintable: existingConfig.tintable !== false,
    states: nextStates,
  };
  fs.writeFileSync(workflow.configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf-8');

  return {
    frameFiles,
    frameWidth,
    frameHeight,
    stateName: workflow.stateName,
    sheetPath: workflow.sheetPath,
    configPath: workflow.configPath,
  };
}

function clearNumberedFrames(framesDir) {
  if (!fs.existsSync(framesDir)) return;
  for (const name of fs.readdirSync(framesDir)) {
    if (Number.isFinite(getFrameNumber(name))) {
      fs.unlinkSync(path.join(framesDir, name));
    }
  }
}

async function exportStateFrames(workflow = getClassicCatOverlayWorkflow(), options = {}) {
  ensureWorkflowDirs(workflow);
  if (!fs.existsSync(workflow.sheetPath) || !fs.existsSync(workflow.configPath)) {
    throw new Error('当前动画还没有可导出的 sheet.png / sheet.json');
  }
  const config = JSON.parse(fs.readFileSync(workflow.configPath, 'utf-8'));
  const state = config.states?.[workflow.stateName];
  if (!state) {
    throw new Error(`sheet.json 中不存在状态: ${workflow.stateName}`);
  }
  const frameWidth = Number(config.frameWidth || 0);
  const frameHeight = Number(config.frameHeight || 0);
  const row = Number(state.row || 0);
  const columns = getStateColumns(state, Number(config.columns || DEFAULT_MAX_COLUMNS));
  const frames = Number(state.frames || 0);
  if (!frameWidth || !frameHeight || !frames) {
    throw new Error('当前状态帧配置无效，无法导出');
  }

  const useBlackBackground = options?.blackBackground === true;
  const outputDir = useBlackBackground
    ? path.join(workflow.sourceDir, 'frames-black')
    : workflow.framesDir;

  clearNumberedFrames(outputDir);
  for (let index = 0; index < frames; index += 1) {
    const outputPath = path.join(outputDir, formatFrameFileName(index + 1));
    const col = index % columns;
    const rowOffset = Math.floor(index / columns);
    let frame = sharp(workflow.sheetPath)
      .extract({
        left: col * frameWidth,
        top: (row + rowOffset) * frameHeight,
        width: frameWidth,
        height: frameHeight,
      });
    if (useBlackBackground) {
      frame = frame.flatten({ background: { r: 0, g: 0, b: 0 } });
    }
    await frame.png().toFile(outputPath);
  }
  return {
    frames,
    framesDir: outputDir,
    stateName: workflow.stateName,
    blackBackground: useBlackBackground,
  };
}

async function importStateFrames(workflow = getClassicCatOverlayWorkflow(), filePaths = []) {
  ensureWorkflowDirs(workflow);
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    throw new Error('没有选择任何帧图');
  }
  clearNumberedFrames(workflow.framesDir);
  let index = 0;
  for (const filePath of filePaths) {
    index += 1;
    const outputPath = path.join(workflow.framesDir, formatFrameFileName(index));
    await sharp(filePath).png().toFile(outputPath);
  }
  return { count: filePaths.length, framesDir: workflow.framesDir, stateName: workflow.stateName };
}

module.exports = {
  getClassicCatOverlayWorkflow,
  getSpriteSheetStateWorkflow,
  resolveAnimationWorkflow,
  ensureWorkflowDirs,
  exportClassicCatReference,
  exportSheetStateReference,
  bakeWorkflowSheet,
  exportStateFrames,
  importStateFrames,
  listFrameFiles,
};
