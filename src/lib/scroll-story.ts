/** Shared timeline for the camera, device UI and accessible HTML copy. */
export function storyProgress(top: number, height: number, viewport: number) {
  return Math.max(0, Math.min(1, -top / Math.max(1, height - viewport)));
}

export function storyFrame(input: number) {
  const p = Math.max(0, Math.min(1, input));
  const chapter = p < 0.35 ? 0 : p < 0.72 ? 1 : 2;
  const uiTime =
    chapter === 0
      ? (p / 0.35) * 5.99
      : chapter === 1
        ? 6 + ((p - 0.35) / 0.37) * 7.99
        : 14 + ((p - 0.72) / 0.28) * 5.95;
  const keys = [
    { at: 0, x: 2.35, y: -0.1, yaw: -0.7, roll: -0.13, scale: 0.94 },
    { at: 0.25, x: 2.15, y: 0.12, yaw: -0.18, roll: 0.035, scale: 1.08 },
    { at: 0.43, x: -2.3, y: 0.02, yaw: 0.35, roll: -0.06, scale: 1.02 },
    { at: 0.64, x: -2.1, y: 0.12, yaw: 0.12, roll: 0.035, scale: 1.08 },
    { at: 0.81, x: 2.2, y: -0.05, yaw: -0.2, roll: -0.07, scale: 1 },
    { at: 1, x: 2.4, y: 0.1, yaw: -0.45, roll: 0.05, scale: 0.92 },
  ];
  const index = Math.max(
    0,
    keys.findIndex((key, i) => i < keys.length - 1 && p <= keys[i + 1].at),
  );
  const a = keys[index],
    b = keys[index + 1];
  const t = Math.max(0, Math.min(1, (p - a.at) / (b.at - a.at)));
  const ease = t * t * (3 - 2 * t);
  const mix = (a: number, b: number) => a + (b - a) * ease;
  return {
    progress: p,
    chapter,
    uiTime,
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
    yaw: mix(a.yaw, b.yaw),
    roll: mix(a.roll, b.roll),
    scale: mix(a.scale, b.scale),
  };
}
