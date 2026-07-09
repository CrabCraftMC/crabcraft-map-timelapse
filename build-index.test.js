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
