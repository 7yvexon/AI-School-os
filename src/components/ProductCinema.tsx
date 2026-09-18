"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, ArrowUpRight, ArrowDown } from "lucide-react";
import Link from "next/link";
import { storyProgress } from "@/lib/scroll-story";

export function FilmCanvas({ studio = false }: { studio?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let cancelled = false;
    let frame = 0;
    let film:
      | ReturnType<typeof import("@/lib/school-film").createSchoolFilm>
      | undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const startTime = performance.now();
    const renderFrame = (now: number) => {
      if (cancelled || !film || host.dataset.recording === "true") return;
      if (!visible || document.hidden) return;
      const section = host.closest("section");
      const rect = (section ?? host).getBoundingClientRect();
      const progress = storyProgress(rect.top, rect.height, window.innerHeight);
      const epoch = Number(host.dataset.epoch);
      const start = Number.isFinite(epoch) ? epoch : startTime;
      film.render(
        media.matches ? 2 : (now - start) / 1000,
        media.matches ? 0 : progress,
      );
    };
    const draw = (now: number) => {
      frame = 0;
      if (cancelled || media.matches || host.dataset.recording === "true")
        return;
      renderFrame(now);
      if (!cancelled && !media.matches) frame = requestAnimationFrame(draw);
    };
    const startDrawing = () => {
      if (!cancelled && !media.matches && frame === 0)
        frame = requestAnimationFrame(draw);
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? undefined
        : new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? false;
            if (!visible) {
              if (frame) cancelAnimationFrame(frame);
              frame = 0;
            } else startDrawing();
          });
    observer?.observe(host);
    const motionChange = () => {
      if (media.matches) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        renderFrame(performance.now());
      } else startDrawing();
    };
    const visibilityChange = () => {
      if (document.hidden) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      } else if (media.matches) renderFrame(performance.now());
      else startDrawing();
    };
    media.addEventListener("change", motionChange);
    document.addEventListener("visibilitychange", visibilityChange);
    let manualRender: ((event: Event) => void) | undefined;
    import("@/lib/school-film")
      .then(({ createSchoolFilm }) => {
        if (cancelled) return;
        film = createSchoolFilm(host, studio);
        manualRender = (event: Event) => {
          const value = (event as CustomEvent<unknown>).detail;
          if (typeof value === "number" && Number.isFinite(value))
            film?.render(value);
        };
        host.addEventListener("film-frame", manualRender);
        host.dataset.ready = "true";
        if (media.matches) renderFrame(performance.now());
        else startDrawing();
      })
      .catch(() => {
        if (!cancelled) host.dataset.failed = "true";
      });
    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      media.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", visibilityChange);
      observer?.disconnect();
      if (manualRender) host.removeEventListener("film-frame", manualRender);
      film?.dispose();
    };
  }, [studio]);
  return (
    <div
      className={studio ? "live-product-scene" : "film-render-scene"}
      ref={ref}
      aria-hidden="true"
    />
  );
}

const chapters = [
  {
    label: "01 / 과제 관리",
    title: (
      <>
        몇 번의 터치로
        <br />
        가벼워지는 하루
      </>
    ),
    text: "과제와 수행평가, 시험 일정까지. 한눈에 확인하세요.",
  },
  {
    label: "02 / AI 학습 도우미",
    title: (
      <>
        막막했던 시작도
        <br />
        나를 아는 AI와
      </>
    ),
    text: "내 과제에 맞는 계획으로, 지금 할 수 있는 일부터.",
  },
  {
    label: "03 / 나의 성취",
    title: (
      <>
        하나씩 해내는 순간,
        <br />
        학교생활이 달라져요
      </>
    ),
    text: "작은 완료가 모여, 더 큰 자신감이 되도록.",
  },
];

export function ProductCinema({
  renderMode = false,
}: {
  renderMode?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [chapter, setChapter] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (renderMode) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (media.matches) {
        video.current?.pause();
        setPlaying(false);
      } else {
        void video.current?.play().catch(() => setPlaying(false));
      }
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [renderMode]);
  const toggle = () => {
    if (renderMode) return;
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      void v.play().catch(() => setPlaying(false));
    } else v.pause();
  };
  return (
    <section className="product-cinema" aria-label="AI School OS 서비스 시연">
      <div className="cinema-media">
        {renderMode ? (
          <FilmCanvas />
        ) : (
          <video
            ref={video}
            onLoadedData={() => {
              if (
                window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ) {
                video.current?.pause();
                setPlaying(false);
              } else {
                void video.current?.play().catch(() => setPlaying(false));
              }
            }}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            poster="/media/school-film-poster.jpg"
            aria-hidden="true"
            onError={() => {
              setFailed(true);
              setPlaying(false);
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={() => {
              const t = video.current?.currentTime ?? 0;
              if (!Number.isFinite(t)) return;
              setChapter(t < 6 ? 0 : t < 14 ? 1 : 2);
            }}
          >
            <source src="/media/school-film.webm" type="video/webm" />
          </video>
        )}
        {failed && <FilmCanvas />}
      </div>
      <div className="cinema-shade" />
      <div className="cinema-caption" key={chapter} aria-live="polite">
        <span>{chapters[chapter].label}</span>
        <h1>{chapters[chapter].title}</h1>
        <p>{chapters[chapter].text}</p>
        <Link href="/register">
          무료로 시작하기 <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="cinema-bottom">
        <strong>
          마침내<span>학교생활 하나로</span>
        </strong>
        {!renderMode && (
          <div className="cinema-controls">
            <span className="cinema-progress" aria-hidden="true">
              <i
                key={chapter}
                style={{
                  animationDuration: chapter === 1 ? "8s" : "6s",
                  animationPlayState: playing ? "running" : "paused",
                }}
              />
            </span>
            <span aria-label={`현재 장면 ${chapter + 1} / 3`}>
              0{chapter + 1} / 03
            </span>
            <button
              type="button"
              onClick={toggle}
              disabled={failed}
              aria-label={
                failed
                  ? "시연 영상을 불러올 수 없습니다"
                  : playing
                    ? "시연 영상 일시정지"
                    : "시연 영상 재생"
              }
            >
              {playing ? (
                <Pause size={15} aria-hidden="true" focusable="false" />
              ) : (
                <Play size={15} aria-hidden="true" focusable="false" />
              )}
            </button>
          </div>
        )}
      </div>
      {!renderMode && (
        <a
          className="cinema-scroll"
          href="#experience"
          aria-label="서비스 살펴보기"
        >
          <ArrowDown size={20} aria-hidden="true" focusable="false" />
        </a>
      )}
    </section>
  );
}

export function ProductExperience() {
  return (
    <section className="product-experience" id="experience">
      <div className="experience-pin">
        <div className="experience-copy">
          <span>YOUR DAY, SIMPLIFIED</span>
          <h2>
            학교생활의 모든 순간,
            <br />
            손안에서 자연스럽게.
          </h2>
          <p>
            해야 할 일은 선명하게.
            <br />
            어떻게 시작할지는 똑똑하게.
            <br />
            나의 하루에 꼭 맞는 새로운 학교생활.
          </p>
          <Link href="/register">
            AI School OS 시작하기 <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <FilmCanvas studio />
        <div className="experience-bottom">
          과제 확인부터 AI 학습까지 · 서비스 화면 예시
        </div>
      </div>
    </section>
  );
}
