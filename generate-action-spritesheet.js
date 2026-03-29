const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const API_KEY = 'AIzaSyC3dFkMULgvXaooBG-49_53dUabTRbWq58';
const MODEL = 'gemini-3.1-flash-image-preview';

// Reference image containing the Hachiware style
const REF_IMAGE_PATH = path.join(__dirname, 'reference', '第5帧.png');

async function removeGreenBackground(inputPath, outputPath) {
  try {
    const { data, info } = await sharp(inputPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Iterate through pixels and set alpha to 0 for green pixels
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Simple chroma key for bright green: High green, low red/blue
      if (g > 150 && r < 120 && b < 120) {
        data[i + 3] = 0; // alpha = 0
      }
    }

    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .png()
    .toFile(outputPath);
    
    return true;
  } catch (err) {
    console.error(`扣除绿幕失败: ${err.message}`);
    return false;
  }
}

function generateActionSpritesheet(actionName, outputFilename) {
  return new Promise((resolve, reject) => {
    console.log(`\n⏳ 正在生成 "${actionName}" 的序列帧底图...`);
    
    // Read reference image as base64
    let refImageBase64 = '';
    try {
      refImageBase64 = fs.readFileSync(REF_IMAGE_PATH).toString('base64');
    } catch (e) {
      return reject(new Error(`无法读取参考图: ${e.message}`));
    }

    const prompt = `Create a 2D game spritesheet for a cute chibi cartoon cat character performing the action: "${actionName}".
The character MUST strictly follow the exact visual style, colors, and design of the character in the provided reference image (Hachiware from Chiikawa): 
- A white round body
- A blue "V" shaped pattern on the top of its head (resembling hair or cat ears)
- Big cute dot-like eyes with white highlights
- A simple small "w" shaped mouth
- Pink oval blush on the cheeks
- Simple thick brown/black hand-drawn style outlines.

Requirements for game asset:
1. Generate multiple sequential frames of the "${actionName}" animation all arranged in a single image (a grid or a single row).
2. The background MUST BE PURE SOLID NEON GREEN (#00FF00). Do NOT use a white or transparent background, it MUST be bright green for chroma-keying.
3. Maintain exact character consistency (Hachiware style: white body, blue head pattern) across all frames.
4. Minimalist, flat color, thick outline style like the reference.
This is explicitly for use as an animated spritesheet in a 2D game.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    
    const body = JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: refImageBase64
            }
          }
        ]
      }],
      generationConfig: { 
        responseModalities: ['IMAGE'], 
        temperature: 0.8
      }
    });

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
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`API Error: ${json.error.message}`));
            return;
          }
          
          let foundImage = false;
          for (const c of (json.candidates || [])) {
            for (const p of (c.content?.parts || [])) {
              if (p.inlineData) {
                const imgBuf = Buffer.from(p.inlineData.data, 'base64');
                fs.writeFileSync(outputFilename, imgBuf);
                resolve({ 
                  size: imgBuf.length, 
                  mimeType: p.inlineData.mimeType,
                  file: outputFilename
                });
                foundImage = true;
                return;
              }
            }
          }
          
          if (!foundImage) {
            reject(new Error(`No image in response. Raw response: ${data.slice(0, 300)}`));
          }
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}. Raw: ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  try {
    // Generate typing spritesheet
    const typingFile = path.join(__dirname, 'spritesheet-typing-hachiware.png');
    const typingRes = await generateActionSpritesheet('typing rapidly on a keyboard', typingFile);
    console.log(`✅ 成功！打字序列帧已保存至: ${typingRes.file} (${(typingRes.size/1024).toFixed(1)}KB)`);
    
    console.log('⏳ 正在进行绿幕抠图...');
    const typingTransFile = typingFile.replace('.png', '-transparent.png');
    await removeGreenBackground(typingFile, typingTransFile);
    console.log(`✅ 成功！打字透明序列帧已保存至: ${typingTransFile}`);

    // Wait a bit to avoid rate limits
    await new Promise(r => setTimeout(r, 4000));
    
    // Generate yawning spritesheet
    const yawningFile = path.join(__dirname, 'spritesheet-yawning-hachiware.png');
    const yawningRes = await generateActionSpritesheet('yawning widely and stretching', yawningFile);
    console.log(`✅ 成功！打哈欠序列帧已保存至: ${yawningRes.file} (${(yawningRes.size/1024).toFixed(1)}KB)`);
    
    console.log('⏳ 正在进行绿幕抠图...');
    const yawningTransFile = yawningFile.replace('.png', '-transparent.png');
    await removeGreenBackground(yawningFile, yawningTransFile);
    console.log(`✅ 成功！打哈欠透明序列帧已保存至: ${yawningTransFile}`);
    
  } catch (err) {
    console.error('\n❌ 生成失败:', err.message);
  }
}

main();