"use client";
import { useEffect, useRef } from "react";

export function ScrollShowcase() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const progress = media.matches
        ? 0.55
        : Math.max(
            0,
            Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)),
          );
      node.style.setProperty("--journey", String(progress));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      media.removeEventListener("change", schedule);
    };
  }, []);
  return (
    <section
      ref={ref}
      className="scroll-showcase"
      aria-labelledby="showcase-title"
    >
      <div className="showcase-stage">
        <div className="showcase-copy">
          <span className="eyebrow">ALL YOUR SCHOOL LIFE</span>
          <h2 id="showcase-title">
            할 일은 한눈에.
            <br />
            하루는 내 페이스대로.
          </h2>
          <p>
            흩어져 있던 과제와 일정이
            <br />
            나를 위한 하나의 화면으로.
          </p>
          <a href="/register" className="text-link">
            나의 공간 만들기 ↗
          </a>
        </div>
        <div className="showcase-device" aria-label="학교생활 대시보드 예시">
          <div className="device-camera" />
          <div className="device-screen">
            <div className="device-status">
              <b>9:41</b>
              <span>● ▰</span>
            </div>
            <span className="device-greeting">MY SCHOOL</span>
            <h3>
              좋은 아침이에요,
              <br />
              오늘도 차근차근.
            </h3>
            <div className="device-summary">
              <span>
                이번 주 할 일
                <strong>
                  3<small>개</small>
                </strong>
              </span>
              <span>
                완료한 과제
                <strong>
                  8<small>개</small>
                </strong>
              </span>
            </div>
            <h4>
              오늘의 우선순위 <span>전체 보기 ↗</span>
            </h4>
            {[
              { s: "탐구", t: "주제 탐구 보고서", d: "D-3", c: "blue" },
              { s: "영어", t: "나의 꿈 발표 준비", d: "D-5", c: "purple" },
              { s: "과학", t: "탐구 보고서 작성", d: "D-7", c: "green" },
            ].map((a) => (
              <div className="device-task" key={a.s}>
                <i className={a.c}>{a.s}</i>
                <div>
                  <b>{a.t}</b>
                  <small>수행평가 · 준비 중</small>
                </div>
                <em>{a.d}</em>
              </div>
            ))}
            <div className="device-ai">
              <span>✦</span>
              <div>
                <b>막막할 땐, AI와 함께</b>
                <small>오늘 30분, 뭐부터 할까요?</small>
              </div>
              <span>↗</span>
            </div>
            <div className="device-tabs">
              <b>
                ⌂<small>홈</small>
              </b>
              <span>
                ▦<small>클래스</small>
              </span>
              <span>
                ✦<small>AI</small>
              </span>
              <span>
                □<small>캘린더</small>
              </span>
            </div>
          </div>
        </div>
        <div className="journey-note note-one">
          <span>✓</span>
          <b>
            하나씩 끝내는 즐거움<small>나의 속도로, 꾸준하게</small>
          </b>
        </div>
        <div className="journey-note note-two">
          <span>✦</span>
          <b>
            내 과제를 이해하는 AI<small>시작부터 마무리까지 함께</small>
          </b>
        </div>
        <span className="showcase-caption">서비스 화면 예시</span>
      </div>
    </section>
  );
}

export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    node.classList.add("reveal-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          node.classList.add("reveal-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export function LearningScene() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let dispose: (() => void) | undefined;
    let cancelled = false;
    async function start() {
      if (preference.matches || !node) return;
      const THREE = await import("three");
      if (cancelled) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      node.appendChild(renderer.domElement);
      node.classList.add("scene-loaded");
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0, 10);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x839cce, 3));
      const light = new THREE.DirectionalLight(0xffffff, 4);
      light.position.set(-3, 5, 6);
      scene.add(light);
      const group = new THREE.Group();
      group.rotation.set(0.1, -0.25, -0.14);
      scene.add(group);
      const blue = new THREE.MeshStandardMaterial({
        color: 0x377cff,
        roughness: 0.3,
        metalness: 0.13,
      });
      const pale = new THREE.MeshStandardMaterial({
        color: 0xf4f8ff,
        roughness: 0.55,
      });
      const darkBlue = new THREE.MeshStandardMaterial({
        color: 0x1955c7,
        roughness: 0.35,
      });
      const materials: InstanceType<typeof THREE.Material>[] = [
        blue,
        pale,
        darkBlue,
      ];
      const geometries: InstanceType<typeof THREE.BufferGeometry>[] = [];
      function rounded(w: number, h: number, depth: number) {
        const r = 0.16,
          x = -w / 2,
          y = -h / 2,
          s = new THREE.Shape();
        s.moveTo(x + r, y);
        s.lineTo(x + w - r, y);
        s.quadraticCurveTo(x + w, y, x + w, y + r);
        s.lineTo(x + w, y + h - r);
        s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        s.lineTo(x + r, y + h);
        s.quadraticCurveTo(x, y + h, x, y + h - r);
        s.lineTo(x, y + r);
        s.quadraticCurveTo(x, y, x + r, y);
        const geometry = new THREE.ExtrudeGeometry(s, {
          depth,
          bevelEnabled: true,
          bevelSegments: 3,
          steps: 1,
          bevelSize: 0.04,
          bevelThickness: 0.04,
        });
        geometries.push(geometry);
        return geometry;
      }
      const book = new THREE.Mesh(rounded(2.6, 3.25, 0.16), blue);
      book.position.set(0, -0.12, 0);
      group.add(book);
      const page = new THREE.Mesh(rounded(2.25, 2.88, 0.08), pale);
      page.position.set(0.05, -0.08, 0.19);
      group.add(page);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 640;
      const ctx = canvas.getContext("2d");
      let texture: InstanceType<typeof THREE.CanvasTexture> | undefined;
      if (ctx) {
        ctx.fillStyle = "#f4f8ff";
        ctx.fillRect(0, 0, 512, 640);
        ctx.fillStyle = "#3079f6";
        ctx.font = "bold 25px Arial";
        ctx.fillText("MY SCHOOL", 50, 78);
        ctx.fillStyle = "#192942";
        ctx.font = "bold 44px Arial";
        ctx.fillText("Today,", 50, 146);
        ctx.fillText("one step ahead.", 50, 202);
        for (let i = 0; i < 3; i++) {
          const y = 270 + i * 96;
          ctx.fillStyle = "#e3ecfc";
          ctx.beginPath();
          ctx.roundRect(44, y, 424, 72, 15);
          ctx.fill();
          ctx.fillStyle = i === 0 ? "#367efa" : "#c6d7f2";
          ctx.beginPath();
          ctx.roundRect(63, y + 20, 30, 30, 8);
          ctx.fill();
          if (!i) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(70, y + 35);
            ctx.lineTo(77, y + 42);
            ctx.lineTo(87, y + 28);
            ctx.stroke();
          }
          ctx.fillStyle = "#889cbb";
          ctx.fillRect(115, y + 23, 225 - i * 37, 8);
          ctx.fillStyle = "#bccbe1";
          ctx.fillRect(115, y + 42, 140, 6);
        }
        texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({ map: texture });
        materials.push(material);
        const geo = new THREE.PlaneGeometry(2.2, 2.8);
        geometries.push(geo);
        const face = new THREE.Mesh(geo, material);
        face.position.set(0.05, -0.08, 0.33);
        group.add(face);
      }
      const ringGeo = new THREE.TorusGeometry(0.5, 0.15, 24, 64);
      geometries.push(ringGeo);
      const ring = new THREE.Mesh(ringGeo, blue);
      ring.position.set(1.8, 1.35, 0.2);
      ring.rotation.set(0.4, 0.8, 0.3);
      scene.add(ring);
      const ballGeo = new THREE.IcosahedronGeometry(0.44, 1);
      geometries.push(ballGeo);
      const ball = new THREE.Mesh(ballGeo, pale);
      ball.position.set(-1.9, -1.45, 0.8);
      scene.add(ball);
      const miniGeo = rounded(0.7, 0.7, 0.15);
      const mini = new THREE.Mesh(miniGeo, darkBlue);
      mini.position.set(1.65, -1.5, 0.8);
      mini.rotation.z = -0.35;
      scene.add(mini);
      const resize = () => {
        const { width, height } = node.getBoundingClientRect();
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(node);
      resize();
      let visible = true;
      const observer = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
      });
      observer.observe(node);
      let frame = 0,
        last = 0;
      const pointer = { x: 0, y: 0 };
      const move = (e: PointerEvent) => {
        const rect = node.getBoundingClientRect();
        pointer.x = (e.clientX - rect.left) / rect.width - 0.5;
        pointer.y = (e.clientY - rect.top) / rect.height - 0.5;
      };
      node.addEventListener("pointermove", move);
      const draw = (time: number) => {
        frame = requestAnimationFrame(draw);
        if (!visible || document.hidden || time - last < 32) return;
        last = time;
        const t = time / 1000;
        group.position.y = Math.sin(t * 0.8) * 0.09;
        group.rotation.y +=
          (-0.25 + pointer.x * 0.25 - group.rotation.y) * 0.06;
        group.rotation.x += (0.1 + pointer.y * 0.15 - group.rotation.x) * 0.06;
        ring.rotation.z = t * 0.16;
        ring.position.y = 1.35 + Math.sin(t + 1) * 0.14;
        ball.rotation.y = t * 0.25;
        mini.position.y = -1.5 + Math.sin(t + 2) * 0.1;
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(draw);
      const lost = (event: Event) => {
        event.preventDefault();
        node.classList.remove("scene-loaded");
        cancelAnimationFrame(frame);
      };
      renderer.domElement.addEventListener("webglcontextlost", lost);
      dispose = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        resizeObserver.disconnect();
        node.removeEventListener("pointermove", move);
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        texture?.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        node.classList.remove("scene-loaded");
      };
    }
    void start().catch(() => {
      node.classList.remove("scene-loaded");
    });
    const change = () => {
      cancelled = true;
      dispose?.();
    };
    preference.addEventListener("change", change);
    return () => {
      cancelled = true;
      dispose?.();
      preference.removeEventListener("change", change);
    };
  }, []);
  return (
    <div className="learning-scene" ref={host} aria-hidden="true">
      <div className="scene-fallback">
        <span>MY SCHOOL</span>
        <strong>
          오늘도,
          <br />한 걸음 앞으로.
        </strong>
        <div>✓ 수행평가 준비하기</div>
        <div>○ 내일의 계획 세우기</div>
        <div>○ AI에게 질문하기</div>
      </div>
    </div>
  );
}
