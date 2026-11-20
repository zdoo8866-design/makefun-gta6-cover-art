// Neon Coast Cover Studio: the editor wiring.
// Photos are read with FileReader straight off the visitor's own machine and
// are never uploaded anywhere; everything after that is local canvas work.
// The editor keeps one state object, repaints the preview from it on every
// change, and exports by painting the same state onto a fresh canvas at the
// chosen post size.
import { GRADE_IDS, gradeName } from './grade.js';
import { LAYOUTS, layoutById } from './layouts.js';
import { renderCover, renderSelectionFrame } from './render.js';
import { markShotReady, readShotScene, wantsDemo } from './shots.js';

const EXPORT_SIZES = [
  { id: 'square', label: 'Square 1080 x 1080', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait 1080 x 1350', width: 1080, height: 1350 },
  { id: 'wide', label: 'Wide 1920 x 1080', width: 1920, height: 1080 },
];

const SAMPLE_FILES = ['samples/neon-duo.jpg', 'samples/boulevard.jpg', 'samples/pier.jpg'];

const els = {
  canvas: document.getElementById('preview'),
  fileInput: document.getElementById('photo-input'),
  dropZone: document.getElementById('drop-zone'),
  sampleButton: document.getElementById('load-sample'),
  strip: document.getElementById('photo-strip'),
  layoutGroup: document.getElementById('layout-group'),
  gradeGroup: document.getElementById('grade-group'),
  panelLabel: document.getElementById('panel-label'),
  panelPhoto: document.getElementById('panel-photo'),
  panX: document.getElementById('pan-x'),
  panY: document.getElementById('pan-y'),
  zoom: document.getElementById('zoom'),
  fillAll: document.getElementById('fill-all'),
  title1: document.getElementById('title-1'),
  title2: document.getElementById('title-2'),
  subtitle: document.getElementById('subtitle'),
  grain: document.getElementById('opt-grain'),
  vignette: document.getElementById('opt-vignette'),
  sizeSelect: document.getElementById('size-select'),
  exportButton: document.getElementById('export-png'),
  status: document.getElementById('status'),
};

const state = {
  photos: [],
  photoNames: [],
  layoutId: 'hero',
  gradeId: 'sunset',
  panelViews: [],
  selectedPanel: 0,
  titleLine1: 'NEON',
  titleLine2: 'COAST',
  subtitle: 'welcome to neon coast',
  grain: true,
  vignette: true,
  sizeId: 'square',
};

/** The export size currently chosen in the size picker. */
function currentSize() {
  return EXPORT_SIZES.find((entry) => entry.id === state.sizeId) ?? EXPORT_SIZES[0];
}

/** A fresh, centred framing for one panel. */
function blankView(photoIndex) {
  return { photoIndex, panX: 0, panY: 0, zoom: 1 };
}

/**
 * Rebuilds the panel view list for the current layout, keeping the framing of
 * panels that survive a layout switch and dealing photos into new panels.
 */
function syncPanelViews() {
  const count = layoutById(state.layoutId).panels.length;
  const next = [];
  for (let i = 0; i < count; i += 1) {
    if (state.panelViews[i]) {
      next.push(state.panelViews[i]);
    } else {
      const dealt = state.photos.length > 0 ? i % state.photos.length : -1;
      next.push(blankView(dealt));
    }
  }
  state.panelViews = next;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

/** Loads an image element from any URL (object URL or app-relative path). */
function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

/** Reads local files through FileReader and adds them to the photo pool. */
async function addPhotoFiles(fileList) {
  const files = [...fileList].filter((file) => file.type.startsWith('image/'));
  if (files.length === 0) return;
  for (const file of files) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const img = await loadImageElement(dataUrl);
    state.photos.push(img);
    state.photoNames.push(file.name);
  }
  afterPhotosChanged(`Loaded ${files.length} photo${files.length > 1 ? 's' : ''} — they never left this machine.`);
}

/** Loads the bundled sample photos into the pool and deals them out. */
async function loadSamples() {
  for (const path of SAMPLE_FILES) {
    if (state.photoNames.includes(path)) continue;
    const img = await loadImageElement(path);
    state.photos.push(img);
    state.photoNames.push(path);
  }
  state.panelViews = layoutById(state.layoutId).panels.map((_, i) => blankView(i % state.photos.length));
  afterPhotosChanged('Sample photos loaded into the panels.');
}

function afterPhotosChanged(message) {
  syncPanelViews();
  buildStrip();
  buildPanelPhotoPicker();
  redraw();
  setStatus(message);
}

function setStatus(message) {
  els.status.textContent = message;
}

/** Repaints the preview canvas at the chosen export size, plus the panel frame. */
function redraw() {
  const size = currentSize();
  if (els.canvas.width !== size.width) els.canvas.width = size.width;
  if (els.canvas.height !== size.height) els.canvas.height = size.height;
  renderCover(els.canvas, state);
  if (!document.body.classList.contains('shot-cover')) {
    renderSelectionFrame(els.canvas, state.layoutId, state.selectedPanel);
  }
  syncPanelControls();
}

/** Renders the cover at an arbitrary size and hands back a PNG data URL. */
function exportDataUrl(width, height) {
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  renderCover(off, state);
  return off.toDataURL('image/png');
}

function doExport() {
  const size = currentSize();
  const off = document.createElement('canvas');
  off.width = size.width;
  off.height = size.height;
  renderCover(off, state);
  off.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `neon-coast-cover-${size.width}x${size.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    setStatus(`Saved neon-coast-cover-${size.width}x${size.height}.png`);
  }, 'image/png');
}

/** Thumbnail strip of the photo pool; clicking a thumb deals it to the panel. */
function buildStrip() {
  els.strip.replaceChildren();
  state.photos.forEach((img, index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.title = state.photoNames[index] ?? `photo ${index + 1}`;
    const picture = document.createElement('img');
    picture.src = img.src;
    picture.alt = '';
    thumb.append(picture);
    thumb.addEventListener('click', () => {
      const view = state.panelViews[state.selectedPanel];
      if (view) view.photoIndex = index;
      redraw();
      setStatus(`Panel ${state.selectedPanel + 1} now shows photo ${index + 1}.`);
    });
    els.strip.append(thumb);
  });
}

/** The per-panel photo picker: sample/pool entries plus an empty choice. */
function buildPanelPhotoPicker() {
  const view = state.panelViews[state.selectedPanel];
  els.panelPhoto.replaceChildren();
  const none = document.createElement('option');
  none.value = '-1';
  none.textContent = 'Sunset placeholder';
  els.panelPhoto.append(none);
  state.photos.forEach((_, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `Photo ${index + 1}`;
    els.panelPhoto.append(option);
  });
  els.panelPhoto.value = String(view ? view.photoIndex : -1);
}

function syncPanelControls() {
  const view = state.panelViews[state.selectedPanel];
  els.panelLabel.textContent = `Panel ${state.selectedPanel + 1} of ${state.panelViews.length}`;
  if (!view) return;
  if (document.activeElement !== els.panelPhoto) buildPanelPhotoPicker();
  els.panX.value = String(Math.round(view.panX * 100));
  els.panY.value = String(Math.round(view.panY * 100));
  els.zoom.value = String(Math.round(view.zoom * 100));
}

/** Builds a row of toggle buttons (layouts, grades) into a container. */
function buildButtonGroup(container, options, currentId, onPick) {
  container.replaceChildren();
  options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option.label;
    button.className = option.id === currentId ? 'chip is-active' : 'chip';
    button.addEventListener('click', () => onPick(option.id));
    container.append(button);
  });
}

function refreshGroups() {
  buildButtonGroup(
    els.layoutGroup,
    LAYOUTS.map((entry) => ({ id: entry.id, label: entry.name })),
    state.layoutId,
    (id) => {
      state.layoutId = id;
      syncPanelViews();
      refreshGroups();
      redraw();
    },
  );
  buildButtonGroup(
    els.gradeGroup,
    GRADE_IDS.map((id) => ({ id, label: gradeName(id) })),
    state.gradeId,
    (id) => {
      state.gradeId = id;
      refreshGroups();
      redraw();
    },
  );
}

/** Maps a pointer position on the preview to a panel index, or -1. */
function panelAtPointer(event) {
  const rect = els.canvas.getBoundingClientRect();
  const nx = (event.clientX - rect.left) / rect.width;
  const ny = (event.clientY - rect.top) / rect.height;
  const panels = layoutById(state.layoutId).panels;
  return panels.findIndex((cell) => nx >= cell.x && nx <= cell.x + cell.w && ny >= cell.y && ny <= cell.y + cell.h);
}

function wireEditor() {
  els.fileInput.addEventListener('change', () => {
    addPhotoFiles(els.fileInput.files ?? []);
    els.fileInput.value = '';
  });
  ['dragenter', 'dragover'].forEach((name) => {
    els.dropZone.addEventListener(name, (event) => {
      event.preventDefault();
      els.dropZone.classList.add('is-dragging');
    });
  });
  ['dragleave', 'drop'].forEach((name) => {
    els.dropZone.addEventListener(name, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove('is-dragging');
    });
  });
  els.dropZone.addEventListener('drop', (event) => {
    addPhotoFiles(event.dataTransfer?.files ?? []);
  });
  els.sampleButton.addEventListener('click', () => loadSamples());

  els.panelPhoto.addEventListener('change', () => {
    const view = state.panelViews[state.selectedPanel];
    if (view) view.photoIndex = Number(els.panelPhoto.value);
    redraw();
  });
  const bindSlider = (input, apply) => {
    input.addEventListener('input', () => {
      const view = state.panelViews[state.selectedPanel];
      if (!view) return;
      apply(view, Number(input.value) / 100);
      redraw();
    });
  };
  bindSlider(els.panX, (view, v) => { view.panX = v; });
  bindSlider(els.panY, (view, v) => { view.panY = v; });
  bindSlider(els.zoom, (view, v) => { view.zoom = Math.max(1, v); });
  els.fillAll.addEventListener('click', () => {
    const view = state.panelViews[state.selectedPanel];
    if (!view || view.photoIndex < 0) return;
    state.panelViews.forEach((entry) => { entry.photoIndex = view.photoIndex; });
    redraw();
    setStatus('Every panel now shows the selected photo.');
  });

  [els.title1, els.title2, els.subtitle].forEach((input) => {
    input.addEventListener('input', () => {
      state.titleLine1 = els.title1.value;
      state.titleLine2 = els.title2.value;
      state.subtitle = els.subtitle.value;
      redraw();
    });
  });
  els.grain.addEventListener('change', () => { state.grain = els.grain.checked; redraw(); });
  els.vignette.addEventListener('change', () => { state.vignette = els.vignette.checked; redraw(); });
  els.sizeSelect.addEventListener('change', () => { state.sizeId = els.sizeSelect.value; redraw(); });
  els.exportButton.addEventListener('click', doExport);

  let drag = null;
  els.canvas.addEventListener('pointerdown', (event) => {
    const index = panelAtPointer(event);
    if (index < 0) return;
    state.selectedPanel = index;
    drag = { x: event.clientX, y: event.clientY };
    els.canvas.setPointerCapture(event.pointerId);
    redraw();
  });
  els.canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const view = state.panelViews[state.selectedPanel];
    if (!view) return;
    const rect = els.canvas.getBoundingClientRect();
    const cell = layoutById(state.layoutId).panels[state.selectedPanel];
    view.panX = Math.max(-1, Math.min(1, view.panX - ((event.clientX - drag.x) / (rect.width * cell.w)) * 1.6));
    view.panY = Math.max(-1, Math.min(1, view.panY - ((event.clientY - drag.y) / (rect.height * cell.h)) * 1.6));
    drag = { x: event.clientX, y: event.clientY };
    redraw();
  });
  els.canvas.addEventListener('pointerup', () => { drag = null; });
  els.canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const view = state.panelViews[state.selectedPanel];
    if (!view) return;
    view.zoom = Math.max(1, Math.min(3, view.zoom * (event.deltaY < 0 ? 1.06 : 0.94)));
    redraw();
  }, { passive: false });

  // Keyboard framing: arrows nudge the selected panel's crop, [ and ] cycle
  // panels, + and - zoom. Ignored while typing in a text field.
  window.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const view = state.panelViews[state.selectedPanel];
    if (!view) return;
    const step = event.shiftKey ? 0.16 : 0.04;
    if (event.key === 'ArrowLeft') view.panX = Math.max(-1, view.panX - step);
    else if (event.key === 'ArrowRight') view.panX = Math.min(1, view.panX + step);
    else if (event.key === 'ArrowUp') view.panY = Math.max(-1, view.panY - step);
    else if (event.key === 'ArrowDown') view.panY = Math.min(1, view.panY + step);
    else if (event.key === '[') state.selectedPanel = (state.selectedPanel + state.panelViews.length - 1) % state.panelViews.length;
    else if (event.key === ']') state.selectedPanel = (state.selectedPanel + 1) % state.panelViews.length;
    else if (event.key === '+' || event.key === '=') view.zoom = Math.min(3, view.zoom * 1.08);
    else if (event.key === '-') view.zoom = Math.max(1, view.zoom * 0.92);
    else return;
    event.preventDefault();
    redraw();
  });
}

/** Waits for the vendored poster fonts so canvas lettering uses them. */
async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('90px "AntonLocal"'),
      document.fonts.load('40px "PacificoLocal"'),
    ]);
  } catch {
    // Canvas falls back to a heavy system sans; the app still works.
  }
}

/** Sets up one of the fixed screenshot scenes from shots.js. */
async function initShotScene(scene) {
  state.layoutId = scene.layoutId;
  state.gradeId = scene.gradeId;
  state.titleLine1 = scene.titleLine1;
  state.titleLine2 = scene.titleLine2;
  state.subtitle = scene.subtitle;
  const size = EXPORT_SIZES.find((entry) => entry.width === scene.width && entry.height === scene.height);
  if (size) state.sizeId = size.id;
  els.sizeSelect.value = state.sizeId;
  els.title1.value = state.titleLine1;
  els.title2.value = state.titleLine2;
  els.subtitle.value = state.subtitle;
  refreshGroups();
  await loadSamples();
  if (scene.kind === 'cover') {
    document.body.classList.add('shot-cover');
    els.canvas.width = scene.width;
    els.canvas.height = scene.height;
    renderCover(els.canvas, state);
  }
  window.__coverStudio = { exportDataUrl, state };
  markShotReady();
}

async function init() {
  EXPORT_SIZES.forEach((size) => {
    const option = document.createElement('option');
    option.value = size.id;
    option.textContent = size.label;
    els.sizeSelect.append(option);
  });
  els.sizeSelect.value = state.sizeId;
  els.title1.value = state.titleLine1;
  els.title2.value = state.titleLine2;
  els.subtitle.value = state.subtitle;
  wireEditor();
  refreshGroups();
  syncPanelViews();
  await ensureFonts();

  const scene = readShotScene();
  if (scene) {
    await initShotScene(scene);
    return;
  }
  if (wantsDemo()) {
    await loadSamples();
  }
  window.__coverStudio = { exportDataUrl, state };
  redraw();
}

init();
