const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

// Offline WebCodecs encoding preserves 24 fps even on a slow rendering machine.
(async () => {
  fs.mkdirSync("public/media", { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (e) => console.error(e.message));
    page.on("console", (m) => {
      if (m.text().startsWith("Film:")) console.log(m.text());
    });
    await page.goto("http://localhost:3000/?film-render=1");
    await page
      .locator(
        '.film-render-scene[data-ready="true"][data-background-ready="true"]',
      )
      .waitFor({ timeout: 60000 });
    await page.addStyleTag({
      content:
        ".landing-header,.cinema-caption,.cinema-bottom,.cinema-scroll,.cinema-shade,.product-experience{display:none!important}.product-cinema{margin:0!important;border-radius:0!important;min-height:0!important;height:720px!important;width:1280px!important}",
    });
    await page.addScriptTag({
      path: path.resolve("node_modules/webm-muxer/build/webm-muxer.js"),
    });
    await page.waitForTimeout(300);
    const result = await page
      .locator(".film-render-scene")
      .evaluate(async (host) => {
        host.dataset.recording = "true";
        const canvas = host.querySelector("canvas");
        const { Muxer, ArrayBufferTarget } = WebMMuxer;
        const target = new ArrayBufferTarget();
        const muxer = new Muxer({
          target,
          video: {
            codec: "V_VP9",
            width: canvas.width,
            height: canvas.height,
            frameRate: 24,
          },
          firstTimestampBehavior: "offset",
        });
        let encodingError;
        const encoder = new VideoEncoder({
          output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
          error: (e) => {
            encodingError = e;
          },
        });
        encoder.configure({
          codec: "vp09.00.10.08",
          width: canvas.width,
          height: canvas.height,
          bitrate: 4500000,
          framerate: 24,
          latencyMode: "quality",
        });
        let poster;
        for (let i = 0; i < 480; i++) {
          host.dispatchEvent(new CustomEvent("film-frame", { detail: i / 24 }));
          if (i === 0)
            poster = canvas.toDataURL("image/jpeg", 0.94).split(",")[1];
          const frame = new VideoFrame(canvas, {
            timestamp: Math.round((i * 1000000) / 24),
            duration: Math.round(1000000 / 24),
          });
          encoder.encode(frame, { keyFrame: i % 48 === 0 });
          frame.close();
          if (i % 12 === 11) {
            await encoder.flush();
            if (encodingError) throw encodingError;
          }
          if (i % 48 === 47) console.log("Film: " + (i + 1) + "/480 frames");
          await new Promise((r) => setTimeout(r, 0));
        }
        await encoder.flush();
        encoder.close();
        muxer.finalize();
        const base64 = await new Promise((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result.split(",")[1]);
          r.readAsDataURL(new Blob([target.buffer], { type: "video/webm" }));
        });
        return { base64, poster };
      });
    fs.writeFileSync(
      "public/media/school-film.webm",
      Buffer.from(result.base64, "base64"),
    );
    fs.writeFileSync(
      "public/media/school-film-poster.jpg",
      Buffer.from(result.poster, "base64"),
    );
    console.log(
      "Film complete: 20 seconds, 480 frames,",
      fs.statSync("public/media/school-film.webm").size,
      "bytes",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
