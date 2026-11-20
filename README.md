# Neon Coast Cover Studio — make.fun gta6-cover-art-01 entry

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/zdoo8866-design/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/zdoo8866-design/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your own photos into GTA-style multi-panel
cover art: white-guttered poster panels, a Vice City sunset or neon colour
grade, heavy poster lettering with a script subtitle, and a PNG export
ready to post. It is an original design with an invented title ("Neon
Coast") — no Rockstar Games logo, artwork or fonts anywhere.

## The app (`app/`)

Static files, no build step, no network requests. Open `app/index.html`
in desktop Chrome (or serve `app/` with any static server, e.g.
`node serve.ts`) and it just works:

- **Photos stay home.** Pick files or drag them in; they are read with
  FileReader on your own machine and never uploaded. Several photos can
  be loaded at once.
- **Five multi-panel layouts** — Hero + Three, Four Panels, Six Panels,
  Hero + Two, Full Bleed. Each panel can hold any loaded photo (or one
  photo can fill them all).
- **Per-panel framing.** Click a panel to select it, drag on the poster
  to pan its crop, scroll or use the sliders to zoom, arrow keys to
  nudge. Every panel keeps its own crop.
- **Four colour grades** — Sunset Boulevard, Neon Nights, Golden Hour,
  Clean Pop — implemented as gradient maps with saturation and contrast
  pushes, baked per photo on a canvas. Optional film grain and vignette.
- **Poster lettering.** Two editable title lines in a vendored Anton
  (SIL Open Font License, `app/fonts/`) with a sunset-gradient fill,
  plus a Pacifico script subtitle. Both fonts ship inside `app/` with
  their OFL license texts.
- **Exports** at the three common post sizes: 1080 x 1080,
  1080 x 1350 and 1920 x 1080 PNG.
- **Built-in samples.** "Load sample photos" fills the panels with the
  seven bundled images — enough that every panel of every layout shows a
  different photo. They include an original generated scene of two leads
  seen from behind as rim-lit silhouettes on a sunset boulevard
  (`app/samples/neon-duo.jpg`) plus matching generated sunset scenes of
  a pink convertible, a neon art-deco hotel, flamingos on the beach and
  a helicopter over the sea, alongside two stock-style portraits.

Source layout: `app/src/layouts.js` (panel geometry), `app/src/grade.js`
(gradient-map colour grades), `app/src/render.js` (the one renderer used
for both preview and export), `app/src/main.js` (editor wiring),
`app/src/shots.js` (fixed `?shot=` scenes used to take the screenshots).

## Handing it in

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` with
the vendored `vendor/makefun-app.ts` library, unchanged from the kit:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Screenshots

`screenshots/` holds four captures made from this app: two covers it
exported itself (1920 x 1080 hero layout, 1080 x 1350 four-panel neon
layout, scaled down to the gate's limits) and two views of the editor
with the sample photos loaded.

Licensed under the MIT License (see `LICENSE`).
