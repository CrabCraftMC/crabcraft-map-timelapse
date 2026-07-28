#!/usr/bin/env bun
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

export function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

export function intOption(name, fallback) {
  const value = Number(option(name, fallback));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}

export function capturePath(outDir, date = new Date()) {
  const stamp = date.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  return path.join(outDir, `${stamp}.png`);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function takeBlueMapScreenshot(page, outputPath) {
  await page.getByTitle("Menu").click();
  const download = page.waitForEvent("download", { timeout: 60000 });
  await page.getByText("Take Screenshot").locator("xpath=..").click();
  await (await download).saveAs(outputPath);
}

async function setTopDownView(page) {
  await page.evaluate(() => {
    const bluemap = window.bluemap;
    if (!bluemap?.mapViewer?.map?.data?.flatView) {
      throw new Error("BlueMap flat view is not available");
    }

    const rotation = bluemap.mapViewer.controlsManager.rotation;
    bluemap.setFlatView(0);
    bluemap.mapViewer.controlsManager.rotation = rotation;
    bluemap.mapViewer.redraw();
  });
  await sleep(250);
}

async function waitForDetailedTiles(page) {
  await page.waitForFunction(
    () => {
      const manager = window.bluemap?.mapViewer?.map?.hiresTileManager;
      if (!manager) return false;

      const expected =
        (manager.viewDistanceX * 2 + 1) * (manager.viewDistanceZ * 2 + 1);
      const loaded = [...manager.tiles.values()].filter((tile) => tile.loaded).length;
      if (loaded < Math.ceil(expected * 0.8)) {
        window.__bluemapDetailedReadySince = undefined;
        return false;
      }

      if (!window.__bluemapDetailedReadySince) {
        window.__bluemapDetailedReadySince = Date.now();
        return false;
      }

      return Date.now() - window.__bluemapDetailedReadySince >= 3000;
    },
    null,
    { timeout: 120000 }
  );
}

async function hideBlueMapOverlays(page) {
  await page.evaluate(() => {
    const markers = window.bluemap?.mapViewer?.markers;
    if (!markers) throw new Error("BlueMap markers are not ready");

    markers.visible = false;
    markers.traverse?.((marker) => {
      marker.visible = false;
    });
    window.bluemap.mapViewer.redraw();
  });
  await sleep(250);
}

async function captureOnce(browser, config) {
  const page = await browser.newPage({
    viewport: { width: config.width, height: config.height },
    acceptDownloads: true
  });

  try {
    await page.goto(config.url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector("canvas", { timeout: 60000 });
    await sleep(config.delayMs);
    await setTopDownView(page);
    await waitForDetailedTiles(page);
    await hideBlueMapOverlays(page);

    const outputPath = config.file ?? capturePath(config.outDir);
    await takeBlueMapScreenshot(page, outputPath);
    console.log(outputPath);
  } finally {
    await page.close();
  }
}

export async function main() {
  const config = {
    url: option(
      "--url",
      process.env.BLUEMAP_URL ?? "https://map.crabcraft.net/#world:0:0:0:700:0:0:0:1:flat"
    ),
    outDir: option("--out", process.env.BLUEMAP_OUT ?? "captures"),
    file: option("--file", process.env.BLUEMAP_FILE),
    minutes: intOption("--minutes", process.env.BLUEMAP_MINUTES ?? "15"),
    width: intOption("--width", process.env.BLUEMAP_WIDTH ?? "1920"),
    height: intOption("--height", process.env.BLUEMAP_HEIGHT ?? "1080"),
    delayMs: intOption("--delay-ms", process.env.BLUEMAP_DELAY_MS ?? "10000"),
    once: process.argv.includes("--once"),
    headed: process.argv.includes("--headed")
  };

  await mkdir(config.file ? path.dirname(config.file) : config.outDir, { recursive: true });

  const browser = await chromium.launch({ headless: !config.headed });
  try {
    do {
      await captureOnce(browser, config);
      if (!config.once) await sleep(config.minutes * 60_000);
    } while (!config.once);
  } finally {
    await browser.close();
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
