import assert from "node:assert/strict";
import test from "node:test";
import { formatLastUpdated, jekyllFrontMatter, jekyllLastUpdated } from "./site-utils.mjs";

test("formats the update date in America/New_York", () => {
  assert.equal(formatLastUpdated("2026-08-23T03:59:59Z"), "Aug. 22, 2026");
  assert.equal(formatLastUpdated("2026-08-23T04:00:00Z"), "Aug. 23, 2026");
  assert.equal(formatLastUpdated("2026-12-01T04:59:59Z"), "Nov. 30, 2026");
  assert.equal(formatLastUpdated("2026-12-01T05:00:00Z"), "Dec. 1, 2026");
});

test("does not punctuate the unabbreviated May month name", () => {
  assert.equal(formatLastUpdated("2026-05-01T16:00:00Z"), "May 1, 2026");
});

test("keeps the branch date dependent on Jekyll deployment time", () => {
  assert.equal(jekyllFrontMatter, "---\n---\n");
  assert.match(jekyllLastUpdated, /site\.time/);
  assert.doesNotMatch(jekyllLastUpdated, /LAST_UPDATED/);
});
