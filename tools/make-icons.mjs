// Génère les icônes PNG sans dépendance externe (encodeur PNG minimal).
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filtre "none"
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
      raw[o++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Dégradé indigo -> violet avec un « B » blanc stylisé.
function makePixel(reach) {
  return (x, y, size) => {
    const u = x / (size - 1);
    const v = y / (size - 1);
    const r = Math.round(lerp(79, 139, (u + v) / 2));
    const g = Math.round(lerp(70, 92, (u + v) / 2));
    const b = Math.round(lerp(229, 246, (u + v) / 2));

    // Fond arrondi pour la version maskable : on garde plein, safe zone respectée.
    const cx = (u - 0.5) * (size / size);
    const cy = (v - 0.5) * (size / size);
    const dist = Math.hypot(cx, cy);
    if (!reach && dist > 0.5) return [r, g, b, 0];

    const s = size / 512;
    const px = x / s;
    const py = y / s;

    // « B » : deux boucles dessinées avec des cercles évidés.
    const stroke = 26;
    const inRect = px > 150 && px < 210 && py > 130 && py < 382;
    const upper =
      Math.hypot(px - 250, py - 200) < 70 && Math.hypot(px - 250, py - 200) > 70 - stroke;
    const lower =
      Math.hypot(px - 255, py - 310) < 80 && Math.hypot(px - 255, py - 310) > 80 - stroke;
    const rightUpper = px > 250 && px < 330 && py > 138 && py < 200;
    const rightLower = px > 255 && px < 340 && py > 272 && py < 330;

    if (inRect || upper || lower || rightUpper || rightLower) {
      const t = clamp01(1 - dist * 0.6);
      return [
        Math.round(lerp(255, 224, t)),
        Math.round(lerp(255, 231, t)),
        Math.round(lerp(255, 255, t)),
        255,
      ];
    }

    return [r, g, b, 255];
  };
}

const outDir = join(root, "icons");
mkdirSync(outDir, { recursive: true });

const targets = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
];

for (const [name, size, reach] of targets) {
  writeFileSync(join(outDir, name), png(size, makePixel(reach)));
  console.log(`icons/${name} (${size}x${size})`);
}
