# GTA 6 Cover Art Maker — make.fun gta6-cover-art-01

An offline web app that turns your photos and a caption into GTA 6-style
multi-panel cover art, exported as a PNG. The app lives in `app/` (static
files, no build step, no network); `main.ts` hands it in by copying `app/`
and `screenshots/` to the output directory and writing `dossier.json`.

Repository prepared with the competition kit's starter; the app itself is
built in a recorded agent session.
