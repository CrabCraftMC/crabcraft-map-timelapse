#!/usr/bin/env bun
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

async function exists(file) {
  try {
    await readdir(file);
    return true;
  } catch {
    return false;
  }
}

export async function listCaptures(dir = "captures") {
  if (!(await exists(dir))) return [];

  const found = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".png")) {
        found.push(path.relative(dir, fullPath).split(path.sep).join("/"));
      }
    }
  }

  await walk(dir);
  return found.sort().reverse();
}

export function captureLabel(file) {
  const stamp = path.basename(file, ".png").replace(
    /T(\d{2})-(\d{2})-(\d{2})Z$/,
    "T$1:$2:$3Z"
  );
  const date = new Date(stamp);
  return Number.isNaN(date.valueOf())
    ? path.basename(file, ".png")
    : date.toISOString().replace(".000Z", " UTC").replace("T", " ");
}

export function renderIndex(captures) {
  const latest = captures[0];
  const frames = [...captures].reverse().map((file) => ({
    src: `captures/${file}`,
    label: captureLabel(file),
  }));
  const serialisedFrames = JSON.stringify(frames).replaceAll("<", "\\u003c");
  const items = captures
    .map((file) => {
      const label = captureLabel(file);
      return `<a class="thumb" href="captures/${file}"><img src="captures/${file}" alt="${label}" loading="lazy"><span>${label}</span></a>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CrabCraft Map Timelapse</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #111318; color: #f1f3f4; }
    body { margin: 0; }
    main { width: min(1180px, calc(100vw - 32px)); margin: 0 auto; padding: 28px 0 40px; }
    header { display: flex; justify-content: space-between; gap: 18px; align-items: end; margin-bottom: 18px; }
    h1 { margin: 0; font-size: clamp(1.8rem, 4vw, 3.2rem); line-height: 1; }
    .meta { color: #b8c0cc; text-align: right; }
    .player { margin-bottom: 28px; }
    .frame-link { display: block; color: inherit; background: #1d222b; }
    .frame-link img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; background: #1d222b; }
    .player-info { display: flex; justify-content: space-between; gap: 16px; margin: 10px 0; color: #b8c0cc; font-variant-numeric: tabular-nums; }
    .controls { display: grid; grid-template-columns: auto minmax(120px, 1fr) auto; gap: 12px; align-items: center; }
    button, select { min-height: 38px; border: 1px solid #4a5361; border-radius: 6px; background: #252b35; color: #f1f3f4; font: inherit; }
    button { padding: 0 16px; cursor: pointer; }
    button:hover, select:hover { background: #303744; }
    button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid #7ab8ff; outline-offset: 2px; }
    input[type="range"] { width: 100%; accent-color: #7ab8ff; }
    select { padding: 0 30px 0 10px; }
    h2 { margin: 0 0 12px; font-size: 1.25rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
    .thumb { color: inherit; text-decoration: none; border-radius: 8px; overflow: hidden; background: #1d222b; }
    .thumb img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
    .thumb span { display: block; padding: 10px 12px; color: #d7dce3; font-size: .94rem; }
    .empty { min-height: 50vh; display: grid; place-items: center; color: #b8c0cc; text-align: center; }
    @media (max-width: 640px) { header { display: block; } .meta { text-align: left; margin-top: 8px; } main { width: min(100vw - 20px, 1180px); padding-top: 18px; } .player-info { display: block; } .frame-count { margin-top: 4px; } .controls { grid-template-columns: auto 1fr; } .controls input { grid-column: 1 / -1; grid-row: 1; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>CrabCraft Map Timelapse</h1>
      <div class="meta">${captures.length} capture${captures.length === 1 ? "" : "s"}</div>
    </header>
    ${
      latest
        ? `<section class="player" aria-label="Map timelapse player">
      <a class="frame-link" id="frame-link" href="${frames[0].src}"><img id="timelapse-frame" src="${frames[0].src}" alt="CrabCraft map capture at ${frames[0].label}"></a>
      <div class="player-info">
        <span id="frame-label">${frames[0].label}</span>
        <span class="frame-count" id="frame-count">1 / ${frames.length}</span>
      </div>
      <div class="controls">
        <button id="play-toggle" type="button" aria-label="Pause timelapse">Pause</button>
        <input id="frame-slider" type="range" min="0" max="${frames.length - 1}" value="0" step="1" aria-label="Timelapse frame">
        <select id="playback-speed" aria-label="Playback speed">
          <option value="1600">0.5x</option>
          <option value="800" selected>1x</option>
          <option value="400">2x</option>
          <option value="200">4x</option>
        </select>
      </div>
    </section>
    <h2>All captures</h2>
    <section class="grid">${items}</section>
    <script>
      const frames = ${serialisedFrames};
      const frameImage = document.querySelector("#timelapse-frame");
      const frameLink = document.querySelector("#frame-link");
      const frameLabel = document.querySelector("#frame-label");
      const frameCount = document.querySelector("#frame-count");
      const frameSlider = document.querySelector("#frame-slider");
      const playToggle = document.querySelector("#play-toggle");
      const playbackSpeed = document.querySelector("#playback-speed");
      let currentFrame = 0;
      let playing = true;
      let timer;
      let loadVersion = 0;

      function preload(index) {
        const image = new Image();
        image.src = frames[index].src;
      }

      async function showFrame(index) {
        const version = ++loadVersion;
        const next = frames[index];
        const image = new Image();
        image.src = next.src;
        try {
          await image.decode();
        } catch {
          return;
        }
        if (version !== loadVersion) return;

        currentFrame = index;
        frameImage.src = next.src;
        frameImage.alt = "CrabCraft map capture at " + next.label;
        frameLink.href = next.src;
        frameLabel.textContent = next.label;
        frameCount.textContent = (index + 1) + " / " + frames.length;
        frameSlider.value = String(index);
        preload((index + 1) % frames.length);
      }

      function scheduleNext() {
        clearTimeout(timer);
        if (!playing || frames.length < 2) return;
        timer = setTimeout(async () => {
          await showFrame((currentFrame + 1) % frames.length);
          scheduleNext();
        }, Number(playbackSpeed.value));
      }

      function setPlaying(value) {
        playing = value;
        playToggle.textContent = playing ? "Pause" : "Play";
        playToggle.setAttribute("aria-label", (playing ? "Pause" : "Play") + " timelapse");
        scheduleNext();
      }

      playToggle.addEventListener("click", () => setPlaying(!playing));
      frameSlider.addEventListener("input", async () => {
        await showFrame(Number(frameSlider.value));
        scheduleNext();
      });
      playbackSpeed.addEventListener("change", scheduleNext);
      preload(frames.length > 1 ? 1 : 0);
      scheduleNext();
    </script>`
        : `<section class="empty">No captures yet. The next scheduled run will add one.</section>`
    }
  </main>
</body>
</html>
`;
}

export async function buildSite(capturesDir = "captures", outDir = "site") {
  const captures = await listCaptures(capturesDir);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  if (captures.length) {
    await cp(capturesDir, path.join(outDir, "captures"), { recursive: true });
  }

  await writeFile(path.join(outDir, "index.html"), renderIndex(captures));
  return captures.length;
}

if (import.meta.main) {
  const count = await buildSite(option("--captures", "captures"), option("--out", "site"));
  console.log(`Built site with ${count} capture${count === 1 ? "" : "s"}.`);
}
