import { test } from "node:test";
import assert from "node:assert/strict";
import { storyFrame, storyProgress } from "../src/lib/scroll-story";

test("scroll story progress remains bounded for ordinary and invalid geometry", () => {
  assert.equal(storyProgress(0, 100, 20), 0);
  assert.equal(storyProgress(-40, 100, 20), 0.5);
  assert.equal(storyProgress(-100, 100, 20), 1);
  assert.equal(storyProgress(Number.NaN, 100, 20), 0);
  assert.equal(storyProgress(0, Number.NaN, 20), 0);
});

test("scroll story reaches the final camera keyframe", () => {
  const frame = storyFrame(1);
  assert.equal(frame.progress, 1);
  assert.equal(frame.chapter, 2);
  assert.equal(frame.x, 2.4);
  assert.ok(Math.abs(frame.y - 0.1) < Number.EPSILON);
  assert.equal(frame.yaw, -0.45);
  assert.equal(frame.roll, 0.05);
  assert.equal(frame.scale, 0.92);
});

test("scroll story normalizes invalid input", () => {
  assert.equal(storyFrame(Number.NaN).progress, 0);
  assert.equal(storyFrame(Number.NEGATIVE_INFINITY).progress, 0);
  assert.equal(storyFrame(Number.POSITIVE_INFINITY).progress, 1);
});
