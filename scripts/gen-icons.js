/**
 * Writes the app icons.
 *
 *   node scripts/gen-icons.js
 *
 * The mark is the shelf: three spines standing on a gold shelf edge, which is
 * the same image the app opens on. Deep green ground, Reading Room palette.
 *
 * PNG is encoded by hand (deflate + CRC) so this needs no image library, and
 * every shape is supersampled 4x4 — the previous icons aliased into square
 * notches where the rounded corners were meant to be.
 */
const fs = require("fs");
const zlib = require("zlib");

// ── Reading Room palette, from globals.css ──
const GREEN_DEEP = [0x3f, 0x51, 0x36];
const PAPER      = [0xf7, 0xf5, 0xec];
const SAGE_PALE  = [0xa9, 0xbc, 0x96];
const TERRACOTTA = [0xb4, 0x61, 0x4a];
const GOLD       = [0xc9, 0xa2, 0x27];

function crc(buf) {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const cr = Buffer.alloc(4);
  cr.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, cr]);
}

/**
 * The artwork, in unit coordinates (0..1 both axes).
 * Returns [r, g, b] or null for "nothing here".
 */
function art(u, v) {
  const within = (x0, y0, x1, y1) => u >= x0 && u <= x1 && v >= y0 && v <= y1;

  // The shelf edge the spines stand on.
  if (within(0.18, 0.735, 0.82, 0.78)) return GOLD;

  // Three spines of different heights, so it reads as books rather than bars.
  const spines = [
    { x0: 0.22, x1: 0.38, top: 0.35, colour: SAGE_PALE },
    { x0: 0.42, x1: 0.58, top: 0.27, colour: PAPER },
    { x0: 0.62, x1: 0.78, top: 0.38, colour: TERRACOTTA },
  ];
  for (const s of spines) {
    if (!within(s.x0, s.top, s.x1, 0.735)) continue;
    // Gold cap, echoing the shelf page's spines.
    return v <= s.top + 0.035 ? GOLD : s.colour;
  }

  return null;
}

function makeIcon(size, maskable = false) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);

  // Launcher masks crop to roughly the middle 80%, so the maskable variant
  // pulls the art inward and bleeds the background to the edges instead of
  // rounding it.
  const scale = maskable ? 0.78 : 1;
  const radius = maskable ? 0 : 0.22;
  const SS = 4; // supersampling grid per axis

  const roundedIn = (u, v) => {
    if (radius <= 0) return true;
    const r = radius;
    const cx = u < r ? r : u > 1 - r ? 1 - r : u;
    const cy = v < r ? r : v > 1 - r ? 1 - r : v;
    if (cx === u && cy === v) return true; // straight edge, not a corner
    return Math.hypot(u - cx, v - cy) <= r;
  };

  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // PNG filter byte: none
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          if (!roundedIn(u, v)) continue; // outside the rounded square

          // Sample the art from the centre outwards, scaled for maskable.
          const au = 0.5 + (u - 0.5) / scale;
          const av = 0.5 + (v - 0.5) / scale;
          const c = au >= 0 && au <= 1 && av >= 0 && av <= 1 ? art(au, av) : null;
          const px = c ?? GREEN_DEEP;

          r += px[0]; g += px[1]; b += px[2]; a += 255;
        }
      }

      const n = SS * SS;
      const off = y * stride + 1 + x * 4;
      if (a === 0) {
        raw[off] = raw[off + 1] = raw[off + 2] = raw[off + 3] = 0;
      } else {
        // Average over covered samples; alpha over all of them, so the
        // rounded edge fades instead of stepping.
        const cov = a / 255;
        raw[off] = Math.round(r / cov);
        raw[off + 1] = Math.round(g / cov);
        raw[off + 2] = Math.round(b / cov);
        raw[off + 3] = Math.round(a / n);
      }
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // truecolour with alpha
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const out = [
  ["public/icons/icon-192.png", 192, false],
  ["public/icons/icon-512.png", 512, false],
  ["public/icons/icon-192-maskable.png", 192, true],
  ["public/icons/icon-512-maskable.png", 512, true],
  // Apple ignores the manifest and reads this one directly; without it iOS
  // renders a screenshot of the page as the home-screen icon.
  ["public/icons/apple-touch-icon.png", 180, true],
];
for (const [path, size, maskable] of out) {
  fs.writeFileSync(path, makeIcon(size, maskable));
  console.log(`  ${path}  ${size}px${maskable ? " (maskable)" : ""}`);
}
console.log("icons written");
