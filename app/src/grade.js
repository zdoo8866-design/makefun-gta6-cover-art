// Colour grades for Neon Coast Cover Studio.
// A grade is a gradient map: each pixel's luminance picks a colour along a
// sunset or neon ramp, and that mapped colour is blended back over the photo
// together with a saturation and contrast push. Grading runs once per photo
// per grade onto an offscreen canvas (capped in size so big phone photos stay
// fast); the cover renderer then just draws the graded copy into each panel.

const GRADE_DEFS = {
  sunset: {
    name: 'Sunset Boulevard',
    stops: [
      [0.0, [26, 10, 46]],
      [0.28, [94, 24, 84]],
      [0.52, [206, 62, 92]],
      [0.74, [250, 128, 62]],
      [1.0, [255, 224, 168]],
    ],
    mapAmount: 0.42,
    saturation: 1.28,
    contrast: 1.1,
  },
  neon: {
    name: 'Neon Nights',
    stops: [
      [0.0, [4, 22, 38]],
      [0.3, [16, 66, 96]],
      [0.55, [150, 30, 128]],
      [0.78, [240, 62, 150]],
      [1.0, [168, 244, 255]],
    ],
    mapAmount: 0.48,
    saturation: 1.42,
    contrast: 1.14,
  },
  golden: {
    name: 'Golden Hour',
    stops: [
      [0.0, [30, 18, 10]],
      [0.35, [110, 58, 26]],
      [0.62, [216, 128, 52]],
      [0.85, [252, 190, 96]],
      [1.0, [255, 240, 205]],
    ],
    mapAmount: 0.3,
    saturation: 1.18,
    contrast: 1.06,
  },
  clean: {
    name: 'Clean Pop',
    stops: [
      [0.0, [12, 12, 18]],
      [0.5, [128, 128, 134]],
      [1.0, [255, 255, 255]],
    ],
    mapAmount: 0.08,
    saturation: 1.22,
    contrast: 1.12,
  },
};

export const GRADE_IDS = Object.keys(GRADE_DEFS);

/** The display name of a grade id. */
export function gradeName(id) {
  return (GRADE_DEFS[id] ?? GRADE_DEFS.sunset).name;
}

/** Builds the 256-entry lookup table for one grade's gradient ramp. */
function buildRamp(def) {
  const ramp = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i += 1) {
    const t = i / 255;
    let a = def.stops[0];
    let b = def.stops[def.stops.length - 1];
    for (let s = 0; s < def.stops.length - 1; s += 1) {
      if (t >= def.stops[s][0] && t <= def.stops[s + 1][0]) {
        a = def.stops[s];
        b = def.stops[s + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const f = (t - a[0]) / span;
    for (let ch = 0; ch < 3; ch += 1) {
      ramp[i * 3 + ch] = Math.round(a[1][ch] + (b[1][ch] - a[1][ch]) * f);
    }
  }
  return ramp;
}

const rampCache = new Map();

function rampFor(id) {
  if (!rampCache.has(id)) rampCache.set(id, buildRamp(GRADE_DEFS[id] ?? GRADE_DEFS.sunset));
  return rampCache.get(id);
}

const MAX_GRADE_EDGE = 1600;

/**
 * Returns a canvas holding `img` with grade `gradeId` baked in.
 * Results are cached per image element so switching panels stays instant.
 */
const gradedCache = new WeakMap();

export function gradedCanvas(img, gradeId) {
  let perImage = gradedCache.get(img);
  if (!perImage) {
    perImage = new Map();
    gradedCache.set(img, perImage);
  }
  if (perImage.has(gradeId)) return perImage.get(gradeId);

  const def = GRADE_DEFS[gradeId] ?? GRADE_DEFS.sunset;
  const scale = Math.min(1, MAX_GRADE_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const ramp = rampFor(gradeId);
  const keep = 1 - def.mapAmount;
  const sat = def.saturation;
  const con = def.contrast;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const lum = Math.max(0, Math.min(255, Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)));
    const li = lum * 3;
    let nr = r * keep + ramp[li] * def.mapAmount;
    let ng = g * keep + ramp[li + 1] * def.mapAmount;
    let nb = b * keep + ramp[li + 2] * def.mapAmount;
    const grey = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
    nr = grey + (nr - grey) * sat;
    ng = grey + (ng - grey) * sat;
    nb = grey + (nb - grey) * sat;
    px[i] = (nr - 128) * con + 128;
    px[i + 1] = (ng - 128) * con + 128;
    px[i + 2] = (nb - 128) * con + 128;
  }
  ctx.putImageData(data, 0, 0);
  perImage.set(gradeId, canvas);
  return canvas;
}
