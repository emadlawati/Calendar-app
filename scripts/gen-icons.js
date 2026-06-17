const fs = require("fs");
const zlib = require("zlib");

function crc(buf) {
  let c = 0xffffffff;
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c2 = n; for (let k = 0; k < 8; k++) c2 = (c2 & 1) ? (0xedb88320 ^ (c2 >>> 1)) : (c2 >>> 1); t[n] = c2; }
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc(Buffer.concat([Buffer.from(type), data])));
  return Buffer.concat([len, Buffer.from(type), data, crcBuf]);
}

function makeIcon(size) {
  // Draw a rounded square with a coffee-cup-like center design
  const pad = Math.floor(size * 0.18);
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  const inner = size - pad * 2;
  const radius = Math.floor(size * 0.22);

  const bgR = 107, bgG = 58, bgB = 31;     // Coffee brown
  const cupR = 252, cupG = 232, cupB = 200; // Cream
  const rimR = 255, rimG = 255, rimB = 255; // White rim
  const steamR = 252, steamG = 232, steamB = 200; // Steam

  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const off = y * stride + 1 + x * 4;

      // Rounded corners: check distance from each corner
      const inRounded =
        (x >= radius || y >= radius) && (x < size - radius || y >= radius) &&
        (x >= radius || y < size - radius) && (x < size - radius || y < size - radius) &&
        !(Math.hypot(x - radius, y - radius) > radius && x < radius && y < radius) &&
        !(Math.hypot(x - (size - radius), y - radius) > radius && x >= size - radius && y < radius) &&
        !(Math.hypot(x - radius, y - (size - radius)) > radius && x < radius && y >= size - radius) &&
        !(Math.hypot(x - (size - radius), y - (size - radius)) > radius && x >= size - radius && y >= size - radius);

      if (!inRounded) {
        raw[off] = 245; raw[off+1] = 237; raw[off+2] = 224; raw[off+3] = 255; // background
        continue;
      }

      raw[off] = bgR; raw[off+1] = bgG; raw[off+2] = bgB; raw[off+3] = 255;

      // Draw a stylized heart in the center
      const cx = size / 2, cy = size * 0.45;
      const relX = (x - cx) / size, relY = (y - cy) / size;
      const heartDist = Math.abs(relX);
      const heartScale = size * 0.12;

      // Simple heart shape: top two circles + bottom triangle
      const heartY = (y - (cy - heartScale * 0.3)) / heartScale;
      const heartX = Math.abs(x - cx) / heartScale;

      if (Math.hypot(x - (cx - heartScale * 0.45), y - (cy - heartScale * 1.0)) < heartScale * 0.45 ||
          Math.hypot(x - (cx + heartScale * 0.45), y - (cy - heartScale * 1.0)) < heartScale * 0.45) {
        raw[off] = cupR; raw[off+1] = cupG; raw[off+2] = cupB; raw[off+3] = 255;
      } else if (x >= cx - heartScale * 0.48 && x <= cx + heartScale * 0.48 && 
                 y >= cy - heartScale * 0.1 && y <= cy + heartScale * 0.8 &&
                 (y - (cy - heartScale * 0.1)) / (heartScale * 0.9) > Math.abs(x - cx) / (heartScale * 0.48) - 0.25) {
        raw[off] = cupR; raw[off+1] = cupG; raw[off+2] = cupB; raw[off+3] = 255;
      } else if (x >= cx - heartScale * 0.25 && x <= cx + heartScale * 0.25 &&
                 y >= cy + heartScale * 0.5 && y <= cy + heartScale * 0.85 &&
                 Math.abs(x - cx) / (heartScale * 0.25) + (y - (cy + heartScale * 0.5)) / (heartScale * 0.35) < 1) {
        raw[off] = cupR; raw[off+1] = cupG; raw[off+2] = cupB; raw[off+3] = 255;
      }
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

fs.writeFileSync("public/icons/icon-192.png", makeIcon(192));
fs.writeFileSync("public/icons/icon-512.png", makeIcon(512));
console.log("icons written with heart design");
