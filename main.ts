import fs from 'node:fs';
import zlib from 'node:zlib';

const W = 800;
const H = 800;
const px = new Uint8Array(W * H * 4);

type RGB = [number, number, number];

function clamp(v: number) { return v < 0 ? 0 : v > 255 ? 255 : v; }
function rgba(c: RGB, a = 255) { return [c[0], c[1], c[2], a] as const; }
function blend(x: number, y: number, c: RGB, a = 255) {
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const i = (y * W + x) * 4;
  if (a >= 255) { px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255; return; }
  const q = a / 255;
  px[i] = clamp(c[0] * q + px[i] * (1 - q));
  px[i + 1] = clamp(c[1] * q + px[i + 1] * (1 - q));
  px[i + 2] = clamp(c[2] * q + px[i + 2] * (1 - q));
  px[i + 3] = 255;
}
function mix(a: RGB, b: RGB, t: number): RGB {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}
function insideRound(x: number, y: number, x0: number, y0: number, x1: number, y1: number, r: number) {
  if (x < x0 || y < y0 || x >= x1 || y >= y1) return false;
  const cx = x < x0 + r ? x0 + r : x >= x1 - r ? x1 - r - 1 : x;
  const cy = y < y0 + r ? y0 + r : y >= y1 - r ? y1 - r - 1 : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
function roundRect(x0: number, y0: number, x1: number, y1: number, r: number, c: RGB, a = 255) {
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) if (insideRound(x, y, x0, y0, x1, y1, r)) blend(x, y, c, a);
}
function gradientRound(x0: number, y0: number, x1: number, y1: number, r: number, top: RGB, bottom: RGB, a = 255) {
  const den = Math.max(1, y1 - y0 - 1);
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    const c = mix(top, bottom, (y - y0) / den);
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) if (insideRound(x, y, x0, y0, x1, y1, r)) blend(x, y, c, a);
  }
}
function ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB, a = 255) {
  const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx), y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) blend(x, y, c, a);
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, width = 1, a = 255) {
  const d = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= d; i++) {
    const x = x0 + (x1 - x0) * i / Math.max(1, d), y = y0 + (y1 - y0) * i / Math.max(1, d);
    ellipse(x, y, width / 2, width / 2, c, a);
  }
}
function poly(points: number[][], c: RGB, a = 255) {
  let minY = H, maxY = 0;
  for (const p of points) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i], [xj, yj] = points[j];
      if ((yi > y) !== (yj > y)) xs.push(xi + (y - yi) * (xj - xi) / (yj - yi));
    }
    xs.sort((u, v) => u - v);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) blend(x, y, c, a);
  }
}
function shadow(x: number, y: number, rx: number, ry: number, a = 100) { ellipse(x, y, rx, ry, [24, 31, 35], a); }

const FONT: Record<string, string[]> = {
  'A':['01110','10001','10001','11111','10001','10001','10001'],'B':['11110','10001','10001','11110','10001','10001','11110'],'C':['01111','10000','10000','10000','10000','10000','01111'],'D':['11110','10001','10001','10001','10001','10001','11110'],'E':['11111','10000','10000','11110','10000','10000','11111'],'F':['11111','10000','10000','11110','10000','10000','10000'],'G':['01111','10000','10000','10111','10001','10001','01111'],'H':['10001','10001','10001','11111','10001','10001','10001'],'I':['11111','00100','00100','00100','00100','00100','11111'],'J':['00111','00010','00010','00010','10010','10010','01100'],'K':['10001','10010','10100','11000','10100','10010','10001'],'L':['10000','10000','10000','10000','10000','10000','11111'],'M':['10001','11011','10101','10101','10001','10001','10001'],'N':['10001','11001','10101','10011','10001','10001','10001'],'O':['01110','10001','10001','10001','10001','10001','01110'],'P':['11110','10001','10001','11110','10000','10000','10000'],'Q':['01110','10001','10001','10001','10101','10010','01101'],'R':['11110','10001','10001','11110','10100','10010','10001'],'S':['01111','10000','10000','01110','00001','00001','11110'],'T':['11111','00100','00100','00100','00100','00100','00100'],'U':['10001','10001','10001','10001','10001','10001','01110'],'V':['10001','10001','10001','10001','10001','01010','00100'],'W':['10001','10001','10001','10101','10101','11011','10001'],'X':['10001','10001','01010','00100','01010','10001','10001'],'Y':['10001','10001','01010','00100','00100','00100','00100'],'Z':['11111','00001','00010','00100','01000','10000','11111'],
  '0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],
  '-':['00000','00000','00000','11111','00000','00000','00000'], '.':['00000','00000','00000','00000','00000','00110','00110'], ':':['00000','00110','00110','00000','00110','00110','00000'], '%':['11001','11010','00010','00100','01000','01011','10011'], '/':['00001','00010','00100','01000','10000','00000','00000'], ' ':['00000','00000','00000','00000','00000','00000','00000']
};
function text(s: string, x: number, y: number, scale: number, c: RGB, a = 255, spacing = 1) {
  let xx = x;
  for (const ch of s.toUpperCase()) {
    const glyph = FONT[ch] || FONT[' '];
    for (let gy = 0; gy < glyph.length; gy++) for (let gx = 0; gx < glyph[gy].length; gx++) if (glyph[gy][gx] === '1') roundRect(xx + gx * scale, y + gy * scale, xx + (gx + 1) * scale, y + (gy + 1) * scale, Math.max(0, scale / 5), c, a);
    xx += 6 * scale + spacing;
  }
}
function screw(x: number, y: number) {
  ellipse(x + 2, y + 3, 9, 9, [13, 19, 22], 170);
  ellipse(x, y, 8, 8, [191, 202, 205]);
  ellipse(x - 1, y - 1, 5, 5, [90, 105, 109]);
  line(x - 4, y - 4, x + 4, y + 4, [222, 229, 229], 1);
  line(x + 4, y - 4, x - 4, y + 4, [62, 71, 73], 1);
}
function metalCapsule(x0: number, y0: number, x1: number, y1: number) {
  roundRect(x0 + 4, y0 + 5, x1 + 4, y1 + 5, (y1 - y0) / 2, [5, 10, 12], 170);
  gradientRound(x0, y0, x1, y1, (y1 - y0) / 2, [236, 242, 241], [91, 108, 111]);
  line(x0 + 13, y0 + 5, x1 - 13, y0 + 5, [255, 255, 255], 3, 190);
  line(x0 + 12, y1 - 5, x1 - 12, y1 - 5, [42, 54, 57], 2, 180);
}

// Cool studio sweep and a soft floor shadow.
for (let y = 0; y < H; y++) {
  const t = y / H;
  const c: RGB = [Math.round(239 - t * 23), Math.round(244 - t * 24), Math.round(244 - t * 22)];
  for (let x = 0; x < W; x++) {
    const edge = Math.max(0, Math.hypot(x - 400, y - 320) / 620 - 0.35) * 18;
    blend(x, y, [clamp(c[0] - edge), clamp(c[1] - edge), clamp(c[2] - edge)], 255);
  }
}
ellipse(420, 695, 330, 48, [36, 47, 51], 38);
ellipse(422, 686, 270, 29, [47, 58, 62], 45);

// The single potato chip being fed through the machine: wrinkled on the left,
// implausibly flat on the right.
poly([[67,354],[111,323],[160,330],[201,348],[239,365],[270,376],[267,435],[221,443],[177,426],[135,448],[95,425],[71,394]], [225, 157, 35]);
poly([[67,354],[111,323],[160,330],[201,348],[239,365],[270,376],[267,397],[214,385],[169,369],[119,371],[78,382]], [250, 193, 57]);
poly([[548,354],[614,347],[675,351],[731,367],[747,389],[730,413],[665,423],[603,420],[548,429]], [246, 189, 49]);
poly([[548,354],[614,347],[675,351],[731,367],[747,389],[730,395],[666,402],[604,398],[548,406]], [255, 212, 83]);
for (const [x, y, r] of [[111,358,11],[144,391,9],[184,360,8],[211,407,7],[95,393,6],[240,390,8],[612,375,4],[666,381,4],[706,384,5]]) ellipse(x, y, r, r / 2, [171, 113, 24], 125);
line(86,372,146,345,[255,221,109],4,170); line(601,365,719,382,[255,225,116],4,160);

// Main molded appliance shell and brushed front face.
shadow(420, 677, 250, 33, 80);
roundRect(157, 122, 662, 688, 48, [25, 38, 43], 170);
gradientRound(145, 105, 655, 690, 46, [67, 105, 111], [21, 43, 49]);
roundRect(168, 124, 643, 680, 40, [34, 58, 64]);
gradientRound(187, 151, 626, 673, 30, [229, 235, 232], [142, 157, 158]);
roundRect(198, 162, 617, 662, 25, [174, 188, 188]);
gradientRound(203, 166, 613, 656, 23, [242, 244, 238], [183, 194, 190]);
// polished top cap and side rim
gradientRound(169, 106, 638, 169, 28, [245, 248, 244], [80, 102, 105]);
roundRect(177, 116, 630, 145, 15, [55, 71, 74]);
line(198, 122, 611, 122, [255, 255, 255], 4, 210);
line(186, 151, 622, 151, [26, 42, 45], 3, 190);

// Glass pressing chamber.
roundRect(250, 239, 579, 505, 29, [29, 44, 47], 220);
roundRect(260, 248, 569, 494, 23, [82, 100, 100]);
gradientRound(269, 257, 560, 485, 16, [40, 76, 80], [12, 31, 35]);
// glass reflections and measurement marks
poly([[286,266],[335,266],[293,472],[276,472]], [175, 221, 218], 30);
line(290, 475, 540, 475, [204, 231, 226], 2, 90);
for (let y = 284; y < 470; y += 20) line(278, y, 288, y, [171, 206, 201], 1, 110);

// Chip visible behind the rollers inside the glass.
poly([[254,349],[289,339],[326,348],[359,341],[397,351],[442,343],[489,351],[528,345],[563,358],[558,419],[518,428],[474,419],[433,427],[391,418],[352,427],[313,417],[274,426],[255,412]], [239, 176, 42]);
poly([[258,351],[292,340],[326,350],[359,343],[398,353],[444,345],[489,353],[528,347],[558,359],[555,378],[510,372],[467,375],[423,366],[382,376],[336,368],[295,376],[260,369]], [255, 211, 78]);
for (const [x,y,rx] of [[290,390,10],[318,370,7],[349,399,9],[381,377,6],[415,399,8],[447,371,7],[481,395,7],[516,375,9],[539,400,5]]) ellipse(x,y,rx,rx/2,[174,112,20],120);
line(278,363,549,365,[255,229,120],3,150);

// Precision rollers press the chip flat.
metalCapsule(289, 302, 542, 353);
metalCapsule(289, 412, 542, 463);
for (const x of [307, 525]) { ellipse(x, 327, 15, 15, [39, 52, 54]); ellipse(x, 327, 8, 8, [222, 229, 225]); ellipse(x, 437, 15, 15, [39, 52, 54]); ellipse(x, 437, 8, 8, [222, 229, 225]); }
for (let x = 322; x <= 510; x += 24) { line(x, 305, x, 349, [255,255,255], 1, 90); line(x, 416, x, 459, [27,42,43], 1, 100); }
// tiny pressure gauges in the chamber
ellipse(294, 278, 13, 13, [17,25,27]); ellipse(294,278,9,9,[121,181,174]); line(294,278,300,272,[244,255,239],2);
ellipse(530, 278, 13, 13, [17,25,27]); ellipse(530,278,9,9,[121,181,174]); line(530,278,524,273,[244,255,239],2);

// Lower control fascia, display, and impossible product nomenclature.
roundRect(225, 525, 595, 642, 19, [99, 115, 114]);
gradientRound(231, 530, 589, 636, 15, [222, 228, 220], [153, 166, 161]);
text('CRISP PRESS', 250, 546, 4, [32, 47, 48]);
text('CHIP FLATTENING SYSTEM', 251, 577, 2, [67, 82, 81]);
roundRect(250, 598, 422, 628, 7, [22, 34, 34]);
roundRect(256, 602, 416, 624, 4, [31, 69, 63]);
text('99.8% FLAT', 270, 608, 2, [167, 255, 184]);
// status lamps and rotary setting
ellipse(455, 611, 13, 13, [24, 32, 31]); ellipse(455, 610, 8, 8, [105, 255, 157], 210); ellipse(453, 607, 3, 3, [231,255,228], 230);
text('READY', 472, 606, 2, [28, 74, 52]);
ellipse(561, 588, 24, 24, [41, 52, 53], 180); ellipse(559, 584, 22, 22, [216, 221, 216]); ellipse(559, 584, 16, 16, [118, 130, 128]);
for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(559 + Math.cos(a)*17, 584 + Math.sin(a)*17, 559 + Math.cos(a)*21, 584 + Math.sin(a)*21, [64,73,73], 2); }
line(559,584,566,573,[36,48,48],3);
text('PRESSURE', 529, 620, 1, [49,64,64]);

// Hardware details make the object feel assembled.
for (const [x,y] of [[190,178],[606,178],[190,629],[606,629],[213,251],[615,251],[213,650],[615,650]]) screw(x,y);
for (let x = 270; x < 340; x += 14) roundRect(x, 659, x + 7, 674, 3, [32,45,46]);
for (let x = 350; x < 420; x += 14) roundRect(x, 659, x + 7, 674, 3, [32,45,46]);
roundRect(257, 690, 369, 723, 8, [40, 54, 56]);
text('CP-3000  /  SNACK LAB', 272, 699, 2, [188, 201, 195]);
// feet
roundRect(192, 786, 270, 808, 6, [16,25,27]); roundRect(552,786,630,808,6,[16,25,27]);

// One accessory: shallow ceramic output tray holding the finished chip.
shadow(105, 734, 105, 19, 50);
ellipse(105, 718, 99, 28, [212, 218, 214]);
ellipse(105, 711, 92, 24, [248, 249, 244]);
poly([[50,709],[90,701],[151,703],[174,715],[160,739],[93,744],[56,730]], [238, 186, 54]);
poly([[57,709],[94,703],[150,706],[165,714],[148,723],[94,725],[61,719]], [255, 215, 91]);
line(80,713,146,713,[255,236,142],3,170);
text('OUTPUT', 68, 754, 2, [80, 91, 87]);

function crc32(buf: Uint8Array) {
  let c = 0xffffffff;
  for (const n of buf) { c ^= n; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array) {
  const t = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); t.copy(out, 4); Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(new Uint8Array(out.subarray(4, 8 + data.length))), 8 + data.length); return out;
}
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(px.buffer, px.byteOffset + y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array())]);
fs.mkdirSync('/output', { recursive: true });
fs.writeFileSync('/output/entry.png', png);
console.log(`wrote /output/entry.png (${png.length} bytes, ${W}x${H})`);
