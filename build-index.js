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
    .latest { display: block; color: inherit; text-decoration: none; margin-bottom: 24px; }
    .latest img { width: 100%; border-radius: 8px; display: block; background: #1d222b; }
    .latest span { display: block; margin-top: 8px; color: #b8c0cc; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
    .thumb { color: inherit; text-decoration: none; border-radius: 8px; overflow: hidden; background: #1d222b; }
    .thumb img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
    .thumb span { display: block; padding: 10px 12px; color: #d7dce3; font-size: .94rem; }
    .empty { min-height: 50vh; display: grid; place-items: center; color: #b8c0cc; text-align: center; }
    @media (max-width: 640px) { header { display: block; } .meta { text-align: left; margin-top: 8px; } main { width: min(100vw - 20px, 1180px); padding-top: 18px; } }
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
        ? `<a class="latest" href="captures/${latest}"><img src="captures/${latest}" alt="Latest capture"><span>Latest: ${captureLabel(latest)}</span></a><section class="grid">${items}</section>`
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
