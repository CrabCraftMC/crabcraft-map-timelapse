import { expect, test } from "bun:test";
import { capturePath } from "./capture-bluemap.js";

test("capturePath makes sortable png names without colon characters", () => {
  expect(capturePath("captures", new Date("2026-07-09T12:34:56.789Z"))).toBe(
    "captures/2026-07-09T12-34-56Z.png"
  );
});
