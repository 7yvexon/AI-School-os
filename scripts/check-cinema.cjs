const { chromium, expect } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://localhost:3000");
    await expect(
      page.getByRole("heading", {
        name: "해야 할 일과 수업의 흐름을 한곳에서.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".hero-workspace")).toBeVisible();
    await expect(page.locator(".flow-step")).toHaveCount(3);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await mobile.goto("http://localhost:3000");
    await expect(
      mobile.getByRole("heading", {
        name: "해야 할 일과 수업의 흐름을 한곳에서.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(mobile.locator(".hero-workspace")).toBeVisible();
    expect(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await mobile.screenshot({
      path: "test-results/landing-mobile.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
    console.log(
      JSON.stringify(
        {
          landing: true,
          workflowSections: 3,
          desktopOverflow: false,
          mobileOverflow: false,
          mediaLoaded: false,
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
