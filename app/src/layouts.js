// Panel layouts for the cover maker, written for Neon Coast Cover Studio.
// Every layout is a list of rectangles in unit space (0..1 on both axes), so the
// same arrangement works at any export size. The renderer insets each rectangle
// by the gutter, which is what leaves the white grid lines between panels.

/** Splits a unit rectangle into a rows x cols grid, row by row. */
function gridOf(rows, cols) {
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push({ x: c / cols, y: r / rows, w: 1 / cols, h: 1 / rows });
    }
  }
  return cells;
}

/** One tall hero panel on the left, a stack of smaller panels on the right. */
function heroAndStack(stackCount) {
  const cells = [{ x: 0, y: 0, w: 0.62, h: 1 }];
  for (let i = 0; i < stackCount; i += 1) {
    cells.push({ x: 0.62, y: i / stackCount, w: 0.38, h: 1 / stackCount });
  }
  return cells;
}

/** A wide hero panel across the top with a row of panels underneath. */
function heroOverRow(rowCount) {
  const cells = [{ x: 0, y: 0, w: 1, h: 0.58 }];
  for (let i = 0; i < rowCount; i += 1) {
    cells.push({ x: i / rowCount, y: 0.58, w: 1 / rowCount, h: 0.42 });
  }
  return cells;
}

export const LAYOUTS = [
  { id: 'hero', name: 'Hero + Three', panels: heroAndStack(3) },
  { id: 'quad', name: 'Four Panels', panels: gridOf(2, 2) },
  { id: 'six', name: 'Six Panels', panels: gridOf(2, 3) },
  { id: 'trio', name: 'Hero + Two', panels: heroOverRow(2) },
  { id: 'full', name: 'Full Bleed', panels: [{ x: 0, y: 0, w: 1, h: 1 }] },
];

/** Looks a layout up by id, falling back to the first one. */
export function layoutById(id) {
  return LAYOUTS.find((entry) => entry.id === id) ?? LAYOUTS[0];
}
