// The cover renderer for Neon Coast Cover Studio.
// One pure drawing routine paints the whole poster onto any 2D context at any
// size, so the on-screen preview and the exported PNG are the same picture:
// white-guttered panels filled with graded photos, a film-grain and vignette
// finish, and the title block lettered over the foot of the poster.
import { gradedCanvas } from './grade.js';
import { layoutById } from './layouts.js';

export const TITLE_FONT = '"AntonLocal", "Arial Black", "Helvetica Neue", sans-serif';
export const SCRIPT_FONT = '"PacificoLocal", "Segoe Script", cursive';

/**
 * Draws one photo into a panel rectangle with cover-fit cropping.
 * `view` carries the per-panel framing: zoom (1 = plain cover fit) and
 * panX/panY in -1..1, sliding the crop window across the spare room.
 */
function paintPanelPhoto(ctx, img, gradeId, view, rect) {
  const graded = gradedCanvas(img, gradeId);
  const fit = Math.max(rect.w / graded.width, rect.h / graded.height) * (view?.zoom ?? 1);
  const drawnW = graded.width * fit;
  const drawnH = graded.height * fit;
  const spareX = Math.max(0, drawnW - rect.w);
  const spareY = Math.max(0, drawnH - rect.h);
  const dx = rect.x - spareX * (0.5 + 0.5 * (view?.panX ?? 0));
  const dy = rect.y - spareY * (0.5 + 0.5 * (view?.panY ?? 0));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(graded, dx, dy, drawnW, drawnH);
  ctx.restore();
}

/** A placeholder panel for slots with no photo yet: dusk gradient and palms. */
function paintEmptyPanel(ctx, rect, seed) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, '#3a86a8');
  grad.addColorStop(0.55, '#e86a92');
  grad.addColorStop(1, '#f7a54d');
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = 'rgba(20, 8, 28, 0.85)';
  const baseY = rect.y + rect.h;
  const palmCount = 3;
  for (let i = 0; i < palmCount; i += 1) {
    const px = rect.x + rect.w * (0.18 + 0.3 * i) + (seed % 7) * 3;
    const ph = rect.h * (0.34 + 0.08 * ((seed + i) % 3));
    ctx.fillRect(px, baseY - ph, Math.max(3, rect.w * 0.012), ph);
    for (let frond = 0; frond < 5; frond += 1) {
      const angle = Math.PI * (0.08 + 0.21 * frond);
      ctx.beginPath();
      ctx.ellipse(
        px + Math.cos(angle) * rect.w * 0.055,
        baseY - ph - Math.sin(angle) * rect.h * 0.045,
        rect.w * 0.06,
        rect.h * 0.016,
        -angle * 0.4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.arc(rect.x + rect.w * 0.72, rect.y + rect.h * 0.3, rect.w * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 214, 140, 0.9)';
  ctx.fill();
  ctx.restore();
}

/** Deterministic speckle grain so preview and export agree pixel for pixel. */
function paintGrain(ctx, w, h, amount) {
  if (amount <= 0) return;
  const step = Math.max(2, Math.round(w / 640));
  let state = 987654321;
  const next = () => {
    // SplitMix-style step: decorrelates neighbouring cells so the grain reads
    // as film speckle instead of a woven grid.
    state = (state + 0x9e3779b9) | 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
  };
  ctx.save();
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const v = next();
      if (v < 0.45) continue;
      ctx.fillStyle = v > 0.72 ? `rgba(255,255,255,${amount * 0.05})` : `rgba(0,0,0,${amount * 0.05})`;
      ctx.fillRect(x, y, step, step);
    }
  }
  ctx.restore();
}

function paintVignette(ctx, w, h, strength) {
  if (strength <= 0) return;
  const radius = Math.hypot(w, h) * 0.62;
  const grad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.45, w / 2, h / 2, radius);
  grad.addColorStop(0, 'rgba(8, 2, 16, 0)');
  grad.addColorStop(1, `rgba(8, 2, 16, ${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/** Fits one title line to a target width by shrinking its font size. */
function fitTitleLine(ctx, text, baseSize, maxWidth) {
  let size = baseSize;
  ctx.font = `${size}px ${TITLE_FONT}`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${TITLE_FONT}`;
  }
  return size;
}

/**
 * Letters the title block: two heavy condensed lines with a sunset gradient
 * fill and a dark keyline, then the script subtitle in neon pink beneath.
 */
function paintTitleBlock(ctx, w, h, state) {
  const lines = [state.titleLine1, state.titleLine2]
    .map((line) => (line ?? '').trim().toUpperCase())
    .filter((line) => line.length > 0);
  const subtitle = (state.subtitle ?? '').trim();
  if (lines.length === 0 && !subtitle) return;

  const cx = w / 2;
  const baseSize = h * (lines.length > 1 ? 0.105 : 0.13);
  const sizes = lines.map((line) => fitTitleLine(ctx, line, baseSize, w * 0.92));
  const lineHeight = (size) => size * 1.04;
  const blockH = sizes.reduce((sum, s) => sum + lineHeight(s), 0) + (subtitle ? h * 0.055 : 0);
  let y = h - h * 0.045 - blockH;

  // Soft dark scrim so the lettering holds over bright panels.
  const scrim = ctx.createLinearGradient(0, y - h * 0.06, 0, h);
  scrim.addColorStop(0, 'rgba(10, 2, 20, 0)');
  scrim.addColorStop(0.45, 'rgba(10, 2, 20, 0.42)');
  scrim.addColorStop(1, 'rgba(10, 2, 20, 0.66)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, y - h * 0.06, w, h - y + h * 0.06);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, index) => {
    const size = sizes[index];
    y += lineHeight(size);
    ctx.font = `${size}px ${TITLE_FONT}`;
    const fill = ctx.createLinearGradient(0, y - size, 0, y);
    fill.addColorStop(0, '#fff6e0');
    fill.addColorStop(0.55, '#ffd166');
    fill.addColorStop(1, '#ff5e8a');
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = 'rgba(16, 4, 24, 0.92)';
    ctx.lineJoin = 'round';
    ctx.strokeText(line, cx, y);
    ctx.fillStyle = fill;
    ctx.fillText(line, cx, y);
  });

  if (subtitle) {
    const subSize = h * 0.042;
    ctx.font = `${subSize}px ${SCRIPT_FONT}`;
    y += h * 0.052;
    ctx.lineWidth = Math.max(1.5, subSize * 0.12);
    ctx.strokeStyle = 'rgba(16, 4, 24, 0.85)';
    ctx.lineJoin = 'round';
    ctx.strokeText(subtitle, cx, y);
    ctx.fillStyle = '#7df9ff';
    ctx.fillText(subtitle, cx, y);
  }
}

/**
 * Paints the full cover described by `state` onto `canvas` at the canvas's
 * own pixel size. State: layoutId, gradeId, photos (image elements),
 * panelViews (per-panel {photoIndex, panX, panY, zoom}), title lines,
 * subtitle, grain and vignette switches.
 */
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = layoutById(state.layoutId);
  const gutter = Math.max(4, Math.round(w * 0.009));

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((cell, index) => {
    const rect = {
      x: cell.x * w + gutter / 2,
      y: cell.y * h + gutter / 2,
      w: cell.w * w - gutter,
      h: cell.h * h - gutter,
    };
    const view = state.panelViews[index];
    const photo = view && view.photoIndex >= 0 ? state.photos[view.photoIndex] : null;
    if (photo) {
      paintPanelPhoto(ctx, photo, state.gradeId, view, rect);
    } else {
      paintEmptyPanel(ctx, rect, index + 1);
    }
  });

  paintVignette(ctx, w, h, state.vignette ? 0.32 : 0);
  paintGrain(ctx, w, h, state.grain ? 1 : 0);
  paintTitleBlock(ctx, w, h, state);
}

/** Draws a highlight frame around the selected panel on the preview only. */
export function renderSelectionFrame(canvas, layoutId, panelIndex) {
  const ctx = canvas.getContext('2d');
  const layout = layoutById(layoutId);
  const cell = layout.panels[panelIndex];
  if (!cell) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.save();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.setLineDash([w * 0.02, w * 0.012]);
  ctx.strokeRect(cell.x * w + 3, cell.y * h + 3, cell.w * w - 6, cell.h * h - 6);
  ctx.restore();
}
