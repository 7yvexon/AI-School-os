import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { storyFrame } from "./scroll-story";

/** Original product film, rendered locally. No reference footage is embedded. */
export function createSchoolFilm(host: HTMLElement, studio = false) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = !studio;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(studio ? "#f4f5f7" : "#c6c0b6");
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.5;
  room.dispose();
  pmrem.dispose();
  const resources: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] =
    [];
  const material = (color: string, metalness = 0, roughness = 0.5) => {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    resources.push(m);
    return m;
  };
  const silver = material("#979fa9", 0.95, 0.24);
  const black = material("#101316", 0.4, 0.22);
  const box = (
    w: number,
    h: number,
    d: number,
    r: number,
    m: THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    let g: THREE.BufferGeometry;
    if (h > 4 && d < 0.3) {
      const s = new THREE.Shape();
      s.moveTo(-w / 2 + r, -h / 2);
      s.lineTo(w / 2 - r, -h / 2);
      s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      s.lineTo(w / 2, h / 2 - r);
      s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      s.lineTo(-w / 2 + r, h / 2);
      s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      s.lineTo(-w / 2, -h / 2 + r);
      s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      g = new THREE.ExtrudeGeometry(s, {
        depth: d,
        bevelEnabled: true,
        bevelSize: 0.012,
        bevelThickness: 0.012,
        bevelSegments: 3,
        steps: 1,
        curveSegments: 16,
      });
      g.translate(0, 0, -d / 2);
    } else g = new RoundedBoxGeometry(w, h, d, 3, r);
    resources.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  scene.add(new THREE.HemisphereLight(0xe9f2ff, 0xb59670, 0.6));
  const sun = new THREE.DirectionalLight(0xffecd6, 2);
  sun.position.set(-3, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  sun.shadow.normalBias = 0.03;
  sun.shadow.bias = -0.0001;
  sun.shadow.radius = 5;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc9dfff, 0.65);
  fill.position.set(5, 3, -3);
  scene.add(fill);
  const phone = new THREE.Group();
  scene.add(phone);
  box(2.7, 5.5, 0.18, 0.27, silver, phone);
  box(2.62, 5.42, 0.18, 0.25, black, phone, 0, 0, 0.055);
  const screen = document.createElement("canvas");
  screen.width = 780;
  screen.height = 1600;
  const ctx = screen.getContext("2d")!;
  const texture = new THREE.CanvasTexture(screen);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  resources.push(texture);
  const faceMat = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
  });
  resources.push(faceMat);
  const shape = new THREE.Shape();
  const w = 2.48,
    h = 5.24,
    r = 0.22;
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ShapeGeometry(shape);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      (geo.attributes.position.getX(i) + w / 2) / w,
      (geo.attributes.position.getY(i) + h / 2) / h,
    );
  resources.push(geo);
  const face = new THREE.Mesh(geo, faceMat);
  face.position.z = 0.17;
  phone.add(face);
  box(0.69, 0.15, 0.025, 0.07, black, phone, 0, 2.38, 0.2);
  box(0.05, 0.55, 0.09, 0.018, silver, phone, -1.365, 0.85, 0);
  box(0.05, 0.4, 0.09, 0.018, silver, phone, 1.365, 0.5, 0);
  const lensGeo = new THREE.SphereGeometry(0.034, 16, 16);
  resources.push(lensGeo);
  const lens = new THREE.Mesh(lensGeo, material("#1d3354", 0.8, 0.1));
  lens.position.set(0.23, 2.38, 0.22);
  phone.add(lens);
  if (!studio) {
    const backdrop = new THREE.TextureLoader().load(
      "/media/study-background.png",
      (loaded) => {
        loaded.colorSpace = THREE.SRGBColorSpace;
        scene.background = loaded;
        host.dataset.backgroundReady = "true";
      },
    );
    resources.push(backdrop);
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext("2d")!;
    const gradient = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 64);
    gradient.addColorStop(0, "rgba(0,0,0,.5)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    shadowContext.fillStyle = gradient;
    shadowContext.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    resources.push(shadowTexture);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    });
    resources.push(shadowMaterial);
    const shadowGeometry = new THREE.PlaneGeometry(4, 3);
    resources.push(shadowGeometry);
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(1.1, -2.92, 0);
    scene.add(shadow);
  }
  const rounded = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    color: string,
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color = "#202b3b",
    weight = 500,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Arial, 'Malgun Gothic', sans-serif`;
    ctx.fillText(value, x, y);
  };
  let lastScreen = -1;
  function drawScreen(t: number) {
    if (Math.floor(t * 20) === lastScreen) return;
    lastScreen = Math.floor(t * 20);
    const phase = t < 6 ? 0 : t < 14 ? 1 : 2;
    ctx.fillStyle = "#f5f6f8";
    ctx.fillRect(0, 0, 780, 1600);
    text("9:41", 58, 70, 26, "#202b3b", 700);
    text("● ▰", 655, 70, 24);
    text("AI School OS", 50, 175, 31, "#3278f6", 800);
    if (phase === 0) {
      text("좋은 아침이에요,", 50, 265, 50, "#202b3b", 700);
      text("오늘도 차근차근.", 50, 330, 50, "#202b3b", 700);
      rounded(42, 390, 696, 210, 30, "#fff");
      text("이번 주 할 일", 78, 450, 25, "#818b9b");
      text("완료한 과제", 425, 450, 25, "#818b9b");
      text("3", 78, 553, 78, "#3278f6", 700);
      text("8", 425, 553, 78, "#3278f6", 700);
      text("오늘의 우선순위", 50, 685, 30, "#202b3b", 700);
      ["주제 탐구 보고서", "나의 꿈 발표 준비", "과학 실험 기록"].forEach(
        (title, i) => {
          const y = 740 + i * 155;
          rounded(42, y, 696, 135, 25, "#fff");
          rounded(65, y + 27, 78, 78, 22, ["#e6edff", "#eee8fb", "#e3f3eb"][i]);
          text(
            ["탐구", "영어", "과학"][i],
            76,
            y + 70,
            24,
            ["#4381e7", "#8a65c6", "#409b7b"][i],
            700,
          );
          text(title, 165, y + 58, 29, "#273448", 700);
          text("수행평가 · 준비 중", 165, y + 99, 22, "#8b95a6");
          text(`D-${3 + i * 2}`, 635, y + 70, 24, "#3278f6", 700);
        },
      );
      rounded(42, 1250, 696, 140, 26, "#e7eeff");
      text("✦   내 과제를 아는 AI", 70, 1303, 29, "#3478ef", 700);
      text("오늘 30분, 뭐부터 할까요?", 115, 1353, 23, "#6c85b0");
      if (t > 3) {
        const p = (t - 3) / 3;
        ctx.strokeStyle = `rgba(50,120,246,${0.5 * (1 - (p % 1))})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(390, 810, 25 + (p % 1) * 65, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (phase === 1) {
      text("내 과제를 아는 AI", 50, 270, 46, "#202b3b", 700);
      text("탐구 · 주제 탐구 보고서", 50, 325, 24, "#8490a1");
      rounded(140, 400, 595, 160, 30, "#3278f6");
      text("오늘 30분밖에 없는데", 180, 463, 30, "#fff", 600);
      text("뭐부터 시작해야 해?", 180, 510, 30, "#fff", 600);
      const p = Math.min(1, (t - 6) / 2);
      ctx.globalAlpha = p;
      rounded(42, 630, 690, 570, 30, "#fff");
      text("✦  AI 과제 도우미", 70, 695, 28, "#3278f6", 700);
      text("좋아요. 오늘은 첫 단계부터!", 70, 765, 30, "#273448", 700);
      [
        "10분   관심 있는 주제 고르기",
        "15분   필요한 자료 찾아보기",
        "  5분   내일 할 일 정리하기",
      ].forEach((line, i) => {
        const chars = Math.floor(Math.max(0, t - 7 - i * 0.7) * 20);
        text(line.slice(0, chars), 70, 860 + i * 85, 27, "#53647c");
      });
      text("작은 시작이면 충분해요.", 70, 1130, 27, "#3478ef", 600);
      ctx.globalAlpha = 1;
      rounded(42, 1310, 695, 90, 35, "#e8ebf1");
      text("궁금한 내용을 물어보세요", 70, 1365, 25, "#98a2b1");
    } else {
      text("오늘도, 하나 해냈어요.", 50, 275, 46, "#202b3b", 700);
      text("작은 성취가 쌓이는 나의 학교생활", 50, 335, 26, "#8792a2");
      const p = Math.min(1, (t - 14) / 1.2);
      ctx.save();
      ctx.translate(390, 650);
      ctx.scale(0.8 + p * 0.2, 0.8 + p * 0.2);
      rounded(-135, -135, 270, 270, 135, "#3278f6");
      ctx.strokeStyle = "white";
      ctx.lineWidth = 20;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-60, 0);
      ctx.lineTo(-15, 45);
      ctx.lineTo(70, -50);
      ctx.stroke();
      ctx.restore();
      text("수행평가 준비 완료!", 170, 890, 40, "#202b3b", 700);
      rounded(42, 1000, 696, 220, 30, "#fff");
      text("이번 주 완료한 과제", 80, 1065, 28, "#8490a1");
      text("9", 80, 1165, 80, "#3278f6", 700);
      text("어제보다 한 걸음 더", 240, 1150, 27, "#8792a2");
    }
    rounded(0, 1450, 780, 150, 0, "#fff");
    ["홈", "클래스", "AI", "캘린더"].forEach((s, i) => {
      text(
        ["⌂", "▦", "✦", "□"][i],
        90 + i * 180,
        1500,
        34,
        i === phase ? "#3278f6" : "#a3acb8",
      );
      text(s, 80 + i * 180, 1544, 21, i === phase ? "#3278f6" : "#a3acb8");
    });
    rounded(270, 1570, 240, 8, 4, "#202b3b");
    texture.needsUpdate = true;
  }
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  const target = new THREE.Vector3();
  let disposed = false;
  function render(seconds: number, scroll = 0) {
    if (disposed) return;
    const frame = storyFrame(scroll);
    const t = studio ? frame.uiTime : seconds % 20;
    drawScreen(t);
    const mobile = camera.aspect < 0.8;
    if (studio) {
      phone.position.set(mobile ? 0 : frame.x, frame.y, 0);
      phone.scale.setScalar(frame.scale);
      phone.rotation.set(
        .04 + Math.sin(scroll * Math.PI) * .08,
        frame.yaw * (mobile ? .6 : 1),
        frame.roll,
      );
      camera.position.set(0, 0.5, mobile ? 13.5 : 12);
      target.set(0, 0, 0);
    } else {
      phone.position.set(1.1, -0.02, 0);
      phone.rotation.set(-0.08, -0.22 + Math.sin(seconds * 0.12) * 0.07, -0.08);
      const a = (t / 20) * Math.PI * 2;
      camera.position.set(
        4.4 + Math.sin(a) * 1.3,
        3.6 + Math.cos(a) * 0.5,
        mobile ? 16 : 11.4 + Math.sin(a) * 1.1,
      );
      target.set(mobile ? 1.1 : -0.4, -0.1, 0);
    }
    camera.lookAt(target);
    renderer.render(scene, camera);
  }
  render(0);
  return {
    canvas: renderer.domElement,
    render,
    dispose() {
      disposed = true;
      ro.disconnect();
      resources.forEach((r) => r.dispose());
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
