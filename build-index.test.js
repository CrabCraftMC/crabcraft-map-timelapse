import { expect, test } from "bun:test";
import { captureLabel, renderIndex } from "./build-index.js";

test("captureLabel formats capture filenames", () => {
  expect(captureLabel("2026-07-09T12-24-00Z.png")).toBe("2026-07-09 12:24:00 UTC");
});

test("renderIndex links captures", () => {
  expect(renderIndex(["2026-07-09T12-24-00Z.png"])).toContain(
    'href="captures/2026-07-09T12-24-00Z.png"'
  );
});

test("renderIndex builds a chronological timelapse player", () => {
  const html = renderIndex([
    "2026-07-10T12-00-00Z.png",
    "2026-07-09T12-00-00Z.png",
  ]);

  expect(html).toContain('id="timelapse-frame"');
  expect(html).toContain('id="play-toggle"');
  expect(html).toContain('id="frame-slider"');
  expect(html.indexOf('"captures/2026-07-09T12-00-00Z.png"')).toBeLessThan(
    html.indexOf('"captures/2026-07-10T12-00-00Z.png"')
  );
});
