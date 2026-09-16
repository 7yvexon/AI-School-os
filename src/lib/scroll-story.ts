/** Shared timeline for the camera, device UI and accessible HTML copy. */
export function storyProgress(top: number, height: number, viewport: number) {
  return Math.max(0, Math.min(1, -top / Math.max(1, height - viewport)));
}

export function storyFrame(input: number) {
  const p = Math.max(0, Math.min(1, input));
  const chapter = p < .35 ? 0 : p < .72 ? 1 : 2;
  const uiTime = chapter === 0 ? p / .35 * 5.99 : chapter === 1 ? 6 + (p - .35) / .37 * 7.99 : 14 + (p - .72) / .28 * 5.95;
  const keys = [
    { at: 0, x: 2.35, y: -.1, yaw: -.7, roll: -.13, scale: .94 },
    { at: .25, x: 2.15, y: .12, yaw: -.18, roll: .035, scale: 1.08 },
    { at: .43, x: -2.3, y: .02, yaw: .35, roll: -.06, scale: 1.02 },
    { at: .64, x: -2.1, y: .12, yaw: .12, roll: .035, scale: 1.08 },
    { at: .81, x: 2.2, y: -.05, yaw: -.2, roll: -.07, scale: 1 },
    { at: 1, x: 2.4, y: .1, yaw: -.45, roll: .05, scale: .92 },
  ];
  const index = Math.max(0, keys.findIndex((key, i) => i < keys.length - 1 && p <= keys[i + 1].at));
  const a = keys[index], b = keys[index + 1];
  const t = Math.max(0, Math.min(1, (p - a.at) / (b.at - a.at)));
  const ease = t * t * (3 - 2 * t);
  const mix = (a: number, b: number) => a + (b - a) * ease;
  return { progress: p, chapter, uiTime, x: mix(a.x,b.x), y: mix(a.y,b.y), yaw: mix(a.yaw,b.yaw), roll: mix(a.roll,b.roll), scale: mix(a.scale,b.scale) };
}
