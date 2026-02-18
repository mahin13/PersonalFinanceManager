const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a PNG file with RGBA pixel data
function createPNGFromPixels(width, height, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte (None)
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rawData.push(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return crc ^ 0xFFFFFFFF;
}

// Drawing helpers
function setPixel(pixels, width, height, x, y, r, g, b, a) {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && x < width && y >= 0 && y < height) {
    const idx = (y * width + x) * 4;
    // Alpha blending
    const srcA = a / 255;
    const dstA = pixels[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA > 0) {
      pixels[idx] = Math.round((r * srcA + pixels[idx] * dstA * (1 - srcA)) / outA);
      pixels[idx + 1] = Math.round((g * srcA + pixels[idx + 1] * dstA * (1 - srcA)) / outA);
      pixels[idx + 2] = Math.round((b * srcA + pixels[idx + 2] * dstA * (1 - srcA)) / outA);
      pixels[idx + 3] = Math.round(outA * 255);
    }
  }
}

function fillCircle(pixels, width, height, cx, cy, radius, r, g, b, a) {
  const r2 = radius * radius;
  for (let y = Math.max(0, Math.floor(cy - radius - 1)); y <= Math.min(height - 1, Math.ceil(cy + radius + 1)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius - 1)); x <= Math.min(width - 1, Math.ceil(cx + radius + 1)); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= r2) {
        // Anti-alias at the edge
        const dist = Math.sqrt(dist2);
        const edge = radius - dist;
        const alpha = edge < 1 ? Math.round(a * edge) : a;
        if (alpha > 0) setPixel(pixels, width, height, x, y, r, g, b, alpha);
      }
    }
  }
}

function fillRoundedRect(pixels, width, height, rx, ry, rw, rh, cornerRadius, r, g, b, a) {
  for (let y = Math.max(0, Math.floor(ry)); y <= Math.min(height - 1, Math.ceil(ry + rh)); y++) {
    for (let x = Math.max(0, Math.floor(rx)); x <= Math.min(width - 1, Math.ceil(rx + rw)); x++) {
      let inside = true;
      let edgeDist = 10;

      // Check corners
      const corners = [
        { cx: rx + cornerRadius, cy: ry + cornerRadius },
        { cx: rx + rw - cornerRadius, cy: ry + cornerRadius },
        { cx: rx + cornerRadius, cy: ry + rh - cornerRadius },
        { cx: rx + rw - cornerRadius, cy: ry + rh - cornerRadius },
      ];

      for (const corner of corners) {
        const inCornerRegion =
          (x < rx + cornerRadius && y < ry + cornerRadius) ||
          (x > rx + rw - cornerRadius && y < ry + cornerRadius) ||
          (x < rx + cornerRadius && y > ry + rh - cornerRadius) ||
          (x > rx + rw - cornerRadius && y > ry + rh - cornerRadius);

        if (inCornerRegion) {
          const dx = x - corner.cx;
          const dy = y - corner.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > cornerRadius) {
            inside = false;
            break;
          }
          edgeDist = Math.min(edgeDist, cornerRadius - dist);
        }
      }

      if (inside) {
        const alpha = edgeDist < 1 ? Math.round(a * edgeDist) : a;
        if (alpha > 0) setPixel(pixels, width, height, x, y, r, g, b, alpha);
      }
    }
  }
}

function fillRect(pixels, width, height, rx, ry, rw, rh, r, g, b, a) {
  for (let y = Math.max(0, Math.floor(ry)); y < Math.min(height, Math.ceil(ry + rh)); y++) {
    for (let x = Math.max(0, Math.floor(rx)); x < Math.min(width, Math.ceil(rx + rw)); x++) {
      setPixel(pixels, width, height, x, y, r, g, b, a);
    }
  }
}

// Draw a thick arc (ring segment)
function fillArc(pixels, width, height, cx, cy, outerR, innerR, startAngle, endAngle, r, g, b, a) {
  const outerR2 = outerR * outerR;
  const innerR2 = innerR * innerR;
  for (let y = Math.max(0, Math.floor(cy - outerR - 1)); y <= Math.min(height - 1, Math.ceil(cy + outerR + 1)); y++) {
    for (let x = Math.max(0, Math.floor(cx - outerR - 1)); x <= Math.min(width - 1, Math.ceil(cx + outerR + 1)); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= outerR2 && dist2 >= innerR2) {
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += Math.PI * 2;

        let inAngle = false;
        if (startAngle <= endAngle) {
          inAngle = angle >= startAngle && angle <= endAngle;
        } else {
          inAngle = angle >= startAngle || angle <= endAngle;
        }

        if (inAngle) {
          const dist = Math.sqrt(dist2);
          const outerEdge = outerR - dist;
          const innerEdge = dist - Math.sqrt(innerR2);
          const edge = Math.min(outerEdge, innerEdge);
          const alpha = edge < 1.5 ? Math.round(a * Math.min(1, edge / 1.5)) : a;
          if (alpha > 0) setPixel(pixels, width, height, x, y, r, g, b, alpha);
        }
      }
    }
  }
}

function createFinanceIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 1024;

  // Fill background - blue (#1E88E5)
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = 30;
    pixels[i * 4 + 1] = 136;
    pixels[i * 4 + 2] = 229;
    pixels[i * 4 + 3] = 255;
  }

  // Draw white circle background
  fillCircle(pixels, size, size, cx, cy, 380 * scale, 255, 255, 255, 255);

  // Draw dollar sign in blue
  const blue = { r: 25, g: 118, b: 210 }; // Slightly darker blue for the $

  // Vertical bar of the dollar sign
  const barWidth = 44 * scale;
  const barTop = cy - 260 * scale;
  const barBottom = cy + 260 * scale;
  fillRoundedRect(pixels, size, size,
    cx - barWidth / 2, barTop, barWidth, barBottom - barTop,
    barWidth / 2, blue.r, blue.g, blue.b, 255
  );

  // S-curve of the dollar sign - made of two arcs
  const arcRadius = 120 * scale;
  const thickness = 52 * scale;
  const outerR = arcRadius + thickness / 2;
  const innerR = arcRadius - thickness / 2;

  // Top arc - curves to the right (from top-left to center-right)
  // Center of top arc is above center
  const topArcCY = cy - arcRadius * 0.75;
  // This arc goes from ~180deg (left) counter-clockwise to ~350deg (top-right)
  fillArc(pixels, size, size, cx, topArcCY, outerR, innerR,
    Math.PI * 0.85, Math.PI * 1.95, blue.r, blue.g, blue.b, 255);

  // Bottom arc - curves to the left (from center-left to bottom-right)
  const botArcCY = cy + arcRadius * 0.75;
  // This arc goes from ~0deg (right) to ~180deg (left)
  fillArc(pixels, size, size, cx, botArcCY, outerR, innerR,
    Math.PI * 1.85, Math.PI * 0.95, blue.r, blue.g, blue.b, 255);

  // Add horizontal end caps for the S
  // Top of S - horizontal line extending left
  fillRoundedRect(pixels, size, size,
    cx - 140 * scale, topArcCY - arcRadius - thickness / 2,
    140 * scale, thickness,
    thickness / 2, blue.r, blue.g, blue.b, 255
  );

  // Bottom of S - horizontal line extending right
  fillRoundedRect(pixels, size, size,
    cx, botArcCY + arcRadius - thickness / 2,
    140 * scale, thickness,
    thickness / 2, blue.r, blue.g, blue.b, 255
  );

  return pixels;
}

function createSplashIcon(width, height) {
  const pixels = new Uint8Array(width * height * 4);

  // Fill background blue
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = 30;
    pixels[i * 4 + 1] = 136;
    pixels[i * 4 + 2] = 229;
    pixels[i * 4 + 3] = 255;
  }

  const cx = width / 2;
  const cy = height / 2;
  const iconSize = Math.min(width, height) * 0.3;
  const scale = iconSize / 1024;

  // White circle
  fillCircle(pixels, width, height, cx, cy, 380 * scale, 255, 255, 255, 255);

  // Dollar sign
  const blue = { r: 25, g: 118, b: 210 };
  const barWidth = 44 * scale;
  const barTop = cy - 260 * scale;
  const barBottom = cy + 260 * scale;
  fillRoundedRect(pixels, width, height,
    cx - barWidth / 2, barTop, barWidth, barBottom - barTop,
    barWidth / 2, blue.r, blue.g, blue.b, 255
  );

  const arcRadius = 120 * scale;
  const thickness = 52 * scale;
  const outerR = arcRadius + thickness / 2;
  const innerR = arcRadius - thickness / 2;

  const topArcCY = cy - arcRadius * 0.75;
  fillArc(pixels, width, height, cx, topArcCY, outerR, innerR,
    Math.PI * 0.85, Math.PI * 1.95, blue.r, blue.g, blue.b, 255);

  const botArcCY = cy + arcRadius * 0.75;
  fillArc(pixels, width, height, cx, botArcCY, outerR, innerR,
    Math.PI * 1.85, Math.PI * 0.95, blue.r, blue.g, blue.b, 255);

  fillRoundedRect(pixels, width, height,
    cx - 140 * scale, topArcCY - arcRadius - thickness / 2,
    140 * scale, thickness,
    thickness / 2, blue.r, blue.g, blue.b, 255
  );
  fillRoundedRect(pixels, width, height,
    cx, botArcCY + arcRadius - thickness / 2,
    140 * scale, thickness,
    thickness / 2, blue.r, blue.g, blue.b, 255
  );

  return pixels;
}

const assetsDir = path.join(__dirname, 'assets');

console.log('Creating app icons with finance/dollar design...\n');

// Main icon (1024x1024)
const iconPixels = createFinanceIcon(1024);
const iconPng = createPNGFromPixels(1024, 1024, iconPixels);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), iconPng);
console.log('Created: icon.png (1024x1024)');

// Adaptive icon (1024x1024) - same as main icon
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), iconPng);
console.log('Created: adaptive-icon.png (1024x1024)');

// Favicon (48x48)
const faviconPixels = createFinanceIcon(48);
const faviconPng = createPNGFromPixels(48, 48, faviconPixels);
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), faviconPng);
console.log('Created: favicon.png (48x48)');

// Notification icon (96x96)
const notifPixels = createFinanceIcon(96);
const notifPng = createPNGFromPixels(96, 96, notifPixels);
fs.writeFileSync(path.join(assetsDir, 'notification-icon.png'), notifPng);
console.log('Created: notification-icon.png (96x96)');

// Splash screen (1284x2778)
const splashPixels = createSplashIcon(1284, 2778);
const splashPng = createPNGFromPixels(1284, 2778, splashPixels);
fs.writeFileSync(path.join(assetsDir, 'splash.png'), splashPng);
console.log('Created: splash.png (1284x2778)');

console.log('\nAll icons created successfully with dollar sign design!');
