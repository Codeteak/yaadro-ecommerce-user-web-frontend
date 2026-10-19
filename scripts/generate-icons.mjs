import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const table = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  table[n] = c;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = table[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function icon(size) {
  const rowSize = size * 4 + 1;
  const raw = Buffer.alloc(rowSize * size);
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;

  for (let y = 0; y < size; y += 1) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < size; x += 1) {
      const index = y * rowSize + 1 + x * 4;
      let red = 31;
      let green = 122;
      let blue = 58;
      const dx = (x - cx) / (size * 0.22);
      const dy = (y - cy) / (size * 0.28);
      const leaf = dx * dx + (dy + 0.15) * (dy + 0.15) < 1 && dy < 0.72;
      const stem = Math.abs(x - cx) < size * 0.018 && y > cy && y < cy + size * 0.22;
      if (leaf || stem) {
        red = 255;
        green = 252;
        blue = 247;
      }
      raw[index] = red;
      raw[index + 1] = green;
      raw[index + 2] = blue;
      raw[index + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", icon(192));
writeFileSync("public/icons/icon-512.png", icon(512));
writeFileSync("public/icons/apple-touch-icon.png", icon(180));
