import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { LandingPrompt } from "@/components/LandingPrompt";
import { Logo } from "@/components/Logo";
import { pageMetadata } from "@/lib/page-metadata";
import "./landing.css";

export const metadata = {
  ...pageMetadata(
    "학교 과제와 학습 관리",
    "학생과 선생님이 과제, 일정, 제출과 피드백을 관리하고 AI 학습 도우미를 이용하는 학교 학습 공간.",
  ),
  alternates: { canonical: "/" },
};

const flowLines = [
  "deep-flow-line--one",
  "deep-flow-line--two",
  "deep-flow-line--three",
  "deep-flow-line--four",
  "deep-flow-line--five",
  "deep-flow-line--six",
  "deep-flow-line--seven",
] as const;

const footerGroups = [
  {
    title: "서비스",
    links: [
      ["학생 공간", "/login"],
      ["선생님 공간", "/login"],
      ["AI 학습 도우미", "/login"],
      ["학교 일정", "/login"],
    ],
  },
  {
    title: "시작하기",
    links: [
      ["사용 방법", "#prompt"],
      ["회원가입", "/register"],
      ["로그인", "/login"],
    ],
  },
  {
    title: "학교생활",
    links: [
      ["과제와 제출", "/login"],
      ["수업 클래스", "/login"],
      ["피드백 기록", "/login"],
    ],
  },
  {
    title: "도움말",
    links: [
      ["서비스 안내", "#prompt"],
      ["GitHub에서 문의하기", "https://github.com/7yvexon/AI-School-os/issues"],
      ["개인정보 안내", "/privacy"],
    ],
  },
] as const;

export default function Home() {
  return (
    <div className="deepseek-landing">
      <div className="deep-page-noise" aria-hidden="true" />
      <header className="deep-header">
        <div className="deep-header__inner">
          <div className="deep-header__identity">
            <Logo />
            <span>LEARNING OPERATING SYSTEM</span>
          </div>
          <nav className="deep-header__nav" aria-label="메인 메뉴">
            <a href="#prompt">AI 학습</a>
            <a href="#quick-start">빠른 시작</a>
            <a href="#footer">서비스 안내</a>
          </nav>
          <div className="deep-header__actions">
            <Link className="deep-header__login" href="/login">
              로그인
            </Link>
            <Link className="deep-header__start" href="/register">
              시작하기 <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="deep-hero" aria-labelledby="hero-title">
          <div className="deep-hero__scene" aria-hidden="true">
            <div className="deep-flow-field">
              {flowLines.map((line) => (
                <span className={line} key={line} />
              ))}
            </div>
            <div className="deep-orbit deep-orbit--one" />
            <div className="deep-orbit deep-orbit--two" />
            <div className="deep-glow deep-glow--one" />
            <div className="deep-glow deep-glow--two" />
          </div>

          <div className="deep-hero__content">
            <Link className="deep-news" href="/register">
              <Sparkles size={15} aria-hidden="true" />
              새로운 AI 학습 공간이 열렸어요
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
            <h1 id="hero-title">
              학교생활의
              <br />
              <strong>다음 장면으로</strong>
            </h1>
            <p className="deep-hero__lead">
              과제·일정·제출과 선생님 피드백을 한곳에서 관리하고,
              <br />
              AI 학습 도우미로 과제의 다음 단계를 찾아보세요.
            </p>

            <LandingPrompt />

            <div className="deep-hero__actions">
              <Link className="deep-hero__primary" href="/register">
                계정 만들고 시작하기{" "}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              <Link className="deep-hero__secondary" href="/login">
                이미 계정이 있나요? 로그인
              </Link>
            </div>
            <p className="deep-hero__caption">
              <Check size={15} aria-hidden="true" />
              과제 · 일정 · 제출 · 피드백을 한곳에서 이어가요.
            </p>

            <div className="deep-hero__signals" id="quick-start">
              <span>
                <CalendarDays size={15} aria-hidden="true" />
                오늘의 과제와 일정
              </span>
              <span>
                <MessageCircle size={15} aria-hidden="true" />
                막힌 순간의 AI 질문
              </span>
              <span>
                <Users size={15} aria-hidden="true" />
                학생과 선생님 연결
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="deep-footer" id="footer">
        <div className="deep-footer__inner">
          <div className="deep-footer__identity">
            <Logo />
            <p>학생과 선생님을 위한 학교생활 운영 도구</p>
            <span>AI School OS · MVP</span>
          </div>
          {footerGroups.map((group) => (
            <nav
              className="deep-footer__group"
              aria-label={group.title}
              key={group.title}
            >
              <h2>{group.title}</h2>
              {group.links.map(([label, href]) =>
                href.startsWith("http") ? (
                  <a href={href} key={label} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                ) : (
                  <Link href={href} key={label}>
                    {label}
                  </Link>
                ),
              )}
            </nav>
          ))}
        </div>
        <div className="deep-footer__bottom">
          <span>© 2026 AI School OS</span>
          <span>범서고등학교 모의창업 프로젝트</span>
        </div>
      </footer>
    </div>
  );
}
