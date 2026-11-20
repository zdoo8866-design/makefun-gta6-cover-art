// Fixed scenes for screenshots, written for Neon Coast Cover Studio.
// A `?shot=` query asks the editor to set itself up in one known state so a
// screenshot always shows the same thing:
//   ?shot=editor  the full editor with the sample photos loaded
//   ?shot=cover   only the cover, filling the window, at an export size
// Extra parameters pick the scene: layout, grade, size (WxH), title words.
// When the scene is painted, window.__shotReady flips true and the cover is
// also offered as a real exported PNG data URL on window.__coverStudio,
// exactly the bytes the Export button would download.

/** Reads the shot scene out of the page URL, or returns null for normal use. */
export function readShotScene() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  const sizeText = params.get('size') ?? '1080x1080';
  const sizeMatch = /^(\d+)x(\d+)$/.exec(sizeText);
  return {
    kind: shot,
    layoutId: params.get('layout') ?? 'hero',
    gradeId: params.get('grade') ?? 'sunset',
    width: sizeMatch ? Number(sizeMatch[1]) : 1080,
    height: sizeMatch ? Number(sizeMatch[2]) : 1080,
    titleLine1: params.get('t1') ?? 'NEON',
    titleLine2: params.get('t2') ?? 'COAST',
    subtitle: params.get('sub') ?? 'welcome to neon coast',
  };
}

/** True when the URL asks for the one-click demo state (?demo=1). */
export function wantsDemo() {
  return new URLSearchParams(location.search).has('demo');
}

/** Flags the finished scene for whatever is taking the screenshot. */
export function markShotReady() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
