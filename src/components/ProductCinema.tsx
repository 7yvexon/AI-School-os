"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, ArrowUpRight, ArrowDown } from "lucide-react";
import Link from "next/link";

export function FilmCanvas({ studio = false }: { studio?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    if (studio && new URLSearchParams(location.search).has("film-render"))
      return;
    let cancelled = false,
      frame = 0;
    let film:
      | ReturnType<typeof import("@/lib/school-film").createSchoolFilm>
      | undefined;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(host);
    import("@/lib/school-film")
      .then(({ createSchoolFilm }) => {
        if (cancelled) return;
        film = createSchoolFilm(host, studio);
        const manualRender = (event: Event) =>
          film?.render((event as CustomEvent<number>).detail);
        host.addEventListener("film-frame", manualRender);
        host.dataset.ready = "true";
        const start = performance.now();
        const draw = (now: number) => {
          frame = requestAnimationFrame(draw);
          if (host.dataset.recording === "true") return;
          if (!visible || document.hidden) return;
          const rect = host.closest("section")!.getBoundingClientRect();
          const p = Math.max(
            0,
            Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)),
          );
          film?.render(
            media.matches
              ? 2
              : (now - Number(host.dataset.epoch ?? start)) / 1000,
            p,
          );
        };
        frame = requestAnimationFrame(draw);
      })
      .catch(() => {
        host.dataset.failed = "true";
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
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

export function ProductCinema() {
  const video = useRef<HTMLVideoElement>(null);
  const [chapter, setChapter] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [renderMode] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("film-render"),
  );
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
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
  }, []);
  const toggle = () => {
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
              if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
                video.current?.pause();
                setPlaying(false);
              } else {
                void video.current?.play().catch(() => setPlaying(false));
              }
            }}
            muted
            loop
            playsInline
            preload="auto"
            poster="/media/school-film-poster.jpg"
            onError={() => setFailed(true)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={() => {
              const t = video.current?.currentTime ?? 0;
              setChapter(t < 6 ? 0 : t < 14 ? 1 : 2);
            }}
          >
            <source src="/media/school-film.webm" type="video/webm" />
          </video>
        )}
        {failed && <FilmCanvas />}
      </div>
      <div className="cinema-shade" />
      <div className="cinema-caption" key={chapter}>
        <span>{chapters[chapter].label}</span>
        <h1>{chapters[chapter].title}</h1>
        <p>{chapters[chapter].text}</p>
        <Link href="/register">
          무료로 시작하기 <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="cinema-bottom">
        <strong>
          마침내<span>학교생활 하나로</span>
        </strong>
        <div className="cinema-controls">
          <span className="cinema-progress">
            <i
              key={chapter}
              style={{
                animationDuration: chapter === 1 ? "8s" : "6s",
                animationPlayState: playing ? "running" : "paused",
              }}
            />
          </span>
          <span>0{chapter + 1} / 03</span>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "시연 영상 일시정지" : "시연 영상 재생"}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
        </div>
      </div>
      <a
        className="cinema-scroll"
        href="#experience"
        aria-label="서비스 살펴보기"
      >
        <ArrowDown size={20} />
      </a>
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
            AI School OS 시작하기 <ArrowUpRight size={16} />
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
