# CrabCraft BlueMap Timelapse

Takes recurring clean screenshots from the live BlueMap web app so the images can be stitched into a timelapse later.

## Setup

```sh
bun install
bun x playwright install chromium
```

## Run

```sh
bun run capture -- --url "https://map.crabcraft.net/#world:0:0:0:700:0:0:0:1:flat" --minutes 15
```

Captures always use BlueMap's flat, top-down view. Use a full BlueMap camera URL for a repeatable center and zoom: open the map, move to the exact view you want, then copy the URL from the browser and pass it to `--url`.

Useful options:

```sh
bun run capture:once -- --url "https://map.crabcraft.net/#world:0:0:0:700:0:0:0:1:flat"
bun run capture -- --out captures --minutes 60 --width 1920 --height 1080 --delay-ms 10000
```

Images are written as timestamped PNGs in `captures/`. BlueMap marker overlays are hidden before each screenshot.

## GitHub Actions

`.github/workflows/capture.yml` captures the map at 00:00 and 12:00 UTC, commits the PNG under `captures/`, and updates `index.html`.

It also refreshes a closer, non-archived image every three hours at:

https://crabcraftmc.github.io/crabcraft-map-timelapse/map.png

The same view is available in a 5:4 aspect ratio for a 5-by-4 ImageFrame:

https://crabcraftmc.github.io/crabcraft-map-timelapse/map-5x4.png

A wider square view is available for a 5-by-5 ImageFrame:

https://crabcraftmc.github.io/crabcraft-map-timelapse/map-5x5.png

GitHub Pages deploys are gated behind the repository variable `ENABLE_GITHUB_PAGES=true`. Private repositories need a GitHub plan that supports private Pages, or the deploy step will fail.

## Make A Video

```sh
ffmpeg -framerate 30 -pattern_type glob -i "captures/*.png" -c:v libx264 -pix_fmt yuv420p bluemap-timelapse.mp4
```
