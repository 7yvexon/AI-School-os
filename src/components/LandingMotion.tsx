"use client";
import { useEffect, useRef } from "react";

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
