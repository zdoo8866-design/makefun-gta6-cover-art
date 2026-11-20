// Entry program for the gta6-cover-art-01 entry (Node 22, standard library only).
// The cover beside this file is the entry; the program copies it into the
// output directory and then checks the copy's size against the original —
// an incomplete copy would hand the judge a broken cover, so the run fails
// loudly instead of passing with a truncated file.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const source = new URL('./entry.png', import.meta.url);
const target = join(process.env.MAKEFUN_OUTPUT_DIR ?? '/output', 'entry.png');

copyFileSync(source, target);
// The copy is byte for byte, so every run writes identical output bytes.

const expected = statSync(source).size;
const written = statSync(target).size;
if (written !== expected) {
  throw new Error(`entry.png copy incomplete: wrote ${written} of ${expected} bytes`);
}
