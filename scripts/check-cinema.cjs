const { chromium, expect } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:3000");
    const video = page.locator(".cinema-media video");
    await expect
      .poll(() => video.evaluate((v) => v.readyState), { timeout: 60000 })
      .toBeGreaterThanOrEqual(2);
    await expect.poll(() => video.evaluate((v) => v.paused)).toBe(false);
    await page.getByRole("button", { name: "시연 영상 일시정지" }).click();
    expect(await video.evaluate((v) => v.paused)).toBe(true);
    const metadata = await video.evaluate((v) => ({
      duration: v.duration,
      width: v.videoWidth,
      height: v.videoHeight,
    }));
    expect(metadata.duration).toBeGreaterThan(19.8);
    expect(metadata.duration).toBeLessThan(20.2);
    for (const [t, copy] of [
      [2, "몇 번의 터치로"],
      [10, "나를 아는 AI"],
      [17, "하나씩 해내는 순간"],
    ]) {
      await video.evaluate(async (v, t) => {
        await new Promise((r) => {
          v.onseeked = r;
          v.currentTime = t;
        });
      }, t);
      await expect(page.locator(".cinema-caption h1")).toContainText(copy);
      await page.screenshot({ path: `test-results/cinema-${t}.png` });
    }
    await page.locator(".product-experience").scrollIntoViewIfNeeded();
    await page
      .locator('.live-product-scene[data-ready="true"]')
      .waitFor({ timeout: 60000 });
    await page.screenshot({ path: "test-results/cinema-studio.png" });
    for (const section of await page.locator(".reveal-ready").all()) {
      await section.scrollIntoViewIfNeeded();
      await expect(section).toHaveClass(/reveal-visible/);
    }
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    await mobile.goto("http://localhost:3000");
    await expect
      .poll(() => mobile.locator("video").evaluate((v) => v.readyState), {
        timeout: 60000,
      })
      .toBeGreaterThanOrEqual(2);
    expect(await mobile.locator("video").evaluate((v) => v.paused)).toBe(true);
    expect(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await mobile.screenshot({ path: "test-results/cinema-mobile.png" });
    await mobile.getByRole("button", { name: "시연 영상 재생" }).click();
    await expect
      .poll(() => mobile.locator("video").evaluate((v) => v.paused))
      .toBe(false);
    expect(errors).toEqual([]);
    console.log(
      JSON.stringify(
        {
          metadata,
          autoplay: true,
          pause: true,
          chapters: 3,
          webgl: true,
          mobileOverflow: false,
          reducedMotion: true,
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
