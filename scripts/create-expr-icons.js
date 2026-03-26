#!/usr/bin/env node
/**
 * Programmatically generate 10 pixel-art expression icons (64x64, transparent PNG)
 * using sharp raw pixel buffers. No AI API needed — pure hand-crafted pixel art.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SIZE = 64;
const OUT = path.join(__dirname, '..', 'src', 'icons');

// Helper: create a blank RGBA buffer
function createBuffer() {
  return Buffer.alloc(SIZE * SIZE * 4, 0); // all transparent
}

// Helper: set pixel with bounds check
function setPixel(buf, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a;
}

// Helper: draw a filled rectangle
function fillRect(buf, x0, y0, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(buf, x0 + dx, y0 + dy, r, g, b, a);
}

// Helper: draw outline rectangle
function strokeRect(buf, x0, y0, w, h, r, g, b, a = 255) {
  for (let dx = 0; dx < w; dx++) {
    setPixel(buf, x0 + dx, y0, r, g, b, a);
    setPixel(buf, x0 + dx, y0 + h - 1, r, g, b, a);
  }
  for (let dy = 0; dy < h; dy++) {
    setPixel(buf, x0, y0 + dy, r, g, b, a);
    setPixel(buf, x0 + w - 1, y0 + dy, r, g, b, a);
  }
}

// Helper: draw a filled circle (Bresenham midpoint)
function fillCircle(buf, cx, cy, radius, r, g, b, a = 255) {
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++)
      if (dx * dx + dy * dy <= radius * radius)
        setPixel(buf, cx + dx, cy + dy, r, g, b, a);
}

// Helper: draw from a pixel map (array of strings, each char maps to a color)
function drawPixelMap(buf, map, palette, offsetX = 0, offsetY = 0, scale = 1) {
  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      const ch = map[row][col];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      const [r, g, b, a = 255] = color;
      for (let sy = 0; sy < scale; sy++)
        for (let sx = 0; sx < scale; sx++)
          setPixel(buf, offsetX + col * scale + sx, offsetY + row * scale + sy, r, g, b, a);
    }
  }
}

async function saveIcon(name, buf) {
  const outPath = path.join(OUT, name);
  await sharp(buf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .png()
    .toFile(outPath);
  const stat = fs.statSync(outPath);
  console.log(`[OK] ${name} (${stat.size} bytes)`);
}

// ============================================================
// Icon Definitions — each drawn at 2x pixel scale (32 logical pixels → 64 actual)
// ============================================================

function genCurious() {
  const buf = createBuffer();
  // Question mark — blue-purple pixel art
  const map = [
    '..XXXX..',
    '.X....X.',
    'X......X',
    'XX....XX',
    '.....XX.',
    '....XX..',
    '...XX...',
    '...XX...',
    '........',
    '...XX...',
    '...XX...',
  ];
  const P = { X: [140, 120, 220] }; // blue-purple
  drawPixelMap(buf, map, P, 12, 6, 5);

  // Glow outline
  const mapGlow = [
    '.XXXXXX.',
    'X......X',
    'X......X',
    'XX....XX',
    'X....XX.',
    '....XX..',
    '...XX...',
    '...XX...',
    '........',
    '...XX...',
    '...XX...',
  ];
  // subtle lighter outline
  const G = { X: [180, 160, 255, 80] };
  drawPixelMap(buf, mapGlow, G, 10, 4, 5);

  // Re-draw main on top
  drawPixelMap(buf, map, P, 12, 6, 5);
  return buf;
}

function genWorking() {
  const buf = createBuffer();
  // Lightning bolt — golden yellow
  const map = [
    '....XX.',
    '...XX..',
    '..XX...',
    '.XX....',
    'XXXXXX.',
    '...XX..',
    '..XX...',
    '.XX....',
    'XX.....',
  ];
  const P = { X: [255, 210, 50] }; // golden yellow
  drawPixelMap(buf, map, P, 10, 4, 6);

  // Bright center highlight
  const mapH = [
    '....X..',
    '...X...',
    '..X....',
    '.X.....',
    '..XXX..',
    '...X...',
    '..X....',
    '.X.....',
    'X......',
  ];
  const H = { X: [255, 245, 160] }; // light yellow highlight
  drawPixelMap(buf, mapH, H, 13, 7, 6);
  return buf;
}

function genProud() {
  const buf = createBuffer();
  // 4-pointed sparkle/star burst — gold & pink
  const map = [
    '.......X.......',
    '......XXX......',
    '.......X.......',
    '.......X.......',
    '..X....X....X..',
    '...XX.X.X.XX...',
    '....XXXXX.X....',
    'XXXXXXXXXXXXXXX',
    '....XXXXX.X....',
    '...XX.X.X.XX...',
    '..X....X....X..',
    '.......X.......',
    '.......X.......',
    '......XXX......',
    '.......X.......',
  ];
  const P = { X: [255, 200, 80] }; // gold
  drawPixelMap(buf, map, P, 2, 2, 4);

  // Pink sparkle dots
  fillRect(buf, 8, 8, 4, 4, 255, 150, 180);     // top-left sparkle
  fillRect(buf, 50, 10, 4, 4, 255, 150, 180);    // top-right
  fillRect(buf, 10, 48, 4, 4, 255, 150, 180);    // bottom-left
  fillRect(buf, 48, 50, 4, 4, 255, 150, 180);    // bottom-right
  return buf;
}

function genSleepy() {
  const buf = createBuffer();
  // Zzz — cascading, getting larger — blue
  // Small z
  const z1 = [
    'XXX',
    '..X',
    '.X.',
    'X..',
    'XXX',
  ];
  // Medium z
  const z2 = [
    'XXXX',
    '...X',
    '..X.',
    '.X..',
    'XXXX',
  ];
  // Large Z
  const z3 = [
    'XXXXX',
    '....X',
    '...X.',
    '..X..',
    '.X...',
    'XXXXX',
  ];
  const P1 = { X: [130, 170, 255, 160] }; // light blue, semi-transparent
  const P2 = { X: [100, 150, 240] };       // medium blue
  const P3 = { X: [70, 120, 220] };        // deeper blue

  drawPixelMap(buf, z1, P1, 38, 6, 4);   // small top-right
  drawPixelMap(buf, z2, P2, 20, 18, 4);  // medium middle
  drawPixelMap(buf, z3, P3, 4, 32, 4);   // large bottom-left
  return buf;
}

function genAlert() {
  const buf = createBuffer();
  // Exclamation mark — bold red
  const map = [
    '..XX..',
    '..XX..',
    '.XXXX.',
    '.XXXX.',
    '.XXXX.',
    '.XXXX.',
    '..XX..',
    '..XX..',
    '......',
    '..XX..',
    '..XX..',
  ];
  const P = { X: [230, 50, 50] }; // red
  drawPixelMap(buf, map, P, 8, 4, 6);

  // Bright highlight on the bar
  fillRect(buf, 22, 12, 6, 6, 255, 100, 100); // lighter red highlight top
  return buf;
}

function genStar() {
  const buf = createBuffer();
  // 5-pointed star — golden
  const map = [
    '......XX......',
    '......XX......',
    '.....XXXX.....',
    '.....XXXX.....',
    '....XXXXXX....',
    'XXXXXXXXXXXXXX',
    '.XXXXXXXXXXXX.',
    '..XXXXXXXXXX..',
    '..XXXXXXXXXX..',
    '...XXXXXXXX...',
    '...XXX..XXX...',
    '..XX......XX..',
    '..X........X..',
  ];
  const P = { X: [255, 210, 50] }; // gold
  drawPixelMap(buf, map, P, 4, 4, 4);

  // Center highlight
  const mapH = [
    '......',
    '..XX..',
    '.XXXX.',
    '.XXXX.',
    '..XX..',
    '......',
  ];
  const H = { X: [255, 245, 150] }; // bright gold center
  drawPixelMap(buf, mapH, H, 16, 20, 4);
  return buf;
}

function genHeart() {
  const buf = createBuffer();
  // Classic pixel heart — pink-red
  const map = [
    '..XX....XX..',
    '.XXXX..XXXX.',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    '.XXXXXXXXXX.',
    '..XXXXXXXX..',
    '...XXXXXX...',
    '....XXXX....',
    '.....XX.....',
  ];
  const P = { X: [240, 70, 100] }; // pink-red
  drawPixelMap(buf, map, P, 4, 8, 5);

  // Highlight top-left
  const mapH = [
    '.......',
    '.XX....',
    'XXX....',
    'XX.....',
  ];
  const H = { X: [255, 140, 160] }; // lighter pink highlight
  drawPixelMap(buf, mapH, H, 6, 12, 5);
  return buf;
}

function genAnger() {
  const buf = createBuffer();
  // Manga-style cross anger mark — red
  // Two crossed lines, thicker in the center
  const map = [
    'XX......XX',
    'XXX....XXX',
    '.XXX..XXX.',
    '..XXXXXX..',
    '...XXXX...',
    '...XXXX...',
    '..XXXXXX..',
    '.XXX..XXX.',
    'XXX....XXX',
    'XX......XX',
  ];
  const P = { X: [220, 40, 40] }; // red
  drawPixelMap(buf, map, P, 6, 6, 5);

  // Brighter center
  fillRect(buf, 24, 24, 16, 16, 240, 70, 70); // brighter red center
  return buf;
}

function genNote() {
  const buf = createBuffer();
  // Eighth note (♪) — teal/blue-green
  const map = [
    '.....XXXXX',
    '.....XXXXX',
    '.....X...X',
    '.....X..XX',
    '.....X.XX.',
    '.....XXX..',
    '.....XX...',
    '.....X....',
    '.....X....',
    '.....X....',
    '.....X....',
    '..XXXX....',
    '.XXXXXX...',
    '.XXXXXX...',
    '..XXXX....',
  ];
  const P = { X: [50, 200, 180] }; // teal
  drawPixelMap(buf, map, P, 6, 2, 4);

  // Highlight on the note head
  fillRect(buf, 16, 50, 6, 4, 100, 230, 210); // lighter teal
  return buf;
}

function genSweat() {
  const buf = createBuffer();
  // Anime-style sweat drop — blue
  const map = [
    '....XX....',
    '....XX....',
    '...XXXX...',
    '...XXXX...',
    '..XXXXXX..',
    '..XXXXXX..',
    '.XXXXXXXX.',
    '.XXXXXXXX.',
    '.XXXXXXXX.',
    '.XXXXXXXX.',
    '..XXXXXX..',
    '...XXXX...',
    '....XX....',
  ];
  const P = { X: [100, 170, 240] }; // blue
  drawPixelMap(buf, map, P, 8, 4, 4);

  // White/light highlight
  const mapH = [
    '.......',
    '.X.....',
    '.XX....',
    '.XX....',
    '.X.....',
  ];
  const H = { X: [180, 220, 255] }; // light blue highlight
  drawPixelMap(buf, mapH, H, 14, 16, 4);
  return buf;
}

// ============================================================

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const icons = [
    ['expr-curious.png', genCurious],
    ['expr-working.png', genWorking],
    ['expr-proud.png',   genProud],
    ['expr-sleepy.png',  genSleepy],
    ['expr-alert.png',   genAlert],
    ['expr-star.png',    genStar],
    ['expr-heart.png',   genHeart],
    ['expr-anger.png',   genAnger],
    ['expr-note.png',    genNote],
    ['expr-sweat.png',   genSweat],
  ];

  for (const [name, genFn] of icons) {
    const buf = genFn();
    await saveIcon(name, buf);
  }

  console.log(`\nDone! ${icons.length} expression icons generated in ${OUT}`);
}

main().catch(console.error);
