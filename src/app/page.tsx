import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDown,
  Check,
  BookOpen,
  Sparkles,
  CalendarDays,
  GraduationCap,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { LearningScene, Reveal } from "@/components/LandingMotion";

export default function Home() {
  return (
    <main className="landing" id="main-content">
      <header className="landing-header">
        <nav className="landing-nav" aria-label="메인 메뉴">
          <Logo />
          <div className="landing-links">
            <a href="#features">서비스 소개</a>
            <a href="#together">선생님과 함께</a>
          </div>
          <div className="nav-actions">
            <Link className="btn btn-ghost" href="/login">
              로그인
            </Link>
            <Link className="btn btn-primary" href="/register">
              시작하기 <ArrowUpRight size={15} />
            </Link>
          </div>
        </nav>
      </header>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="intro-tag">
            <span /> 나의 학교생활, 더 가볍게
          </span>
          <h1>
            할 일은 한눈에.
            <br />
            막막함은 <span>가볍게.</span>
          </h1>
          <p>
            과제부터 수행평가, 시험 일정까지.
            <br />
            AI와 함께, 나만의 속도로 학교생활을 시작하세요.
          </p>
          <div className="landing-cta">
            <Link className="btn btn-primary" href="/register">
              무료로 시작하기 <ArrowUpRight size={18} />
            </Link>
            <a href="#features" className="btn btn-ghost">
              어떤 서비스인가요? <ArrowDown size={15} />
            </a>
          </div>
          <div className="hero-note">
            <span className="tiny-avatars">
              <i>학</i>
              <i>생</i>
              <i>쌤</i>
            </span>
            <span>학생과 선생님을 잇는 하나의 공간</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-halo" />
          <LearningScene />
          <div className="floating-label label-top">
            <span className="label-icon">
              <Check size={18} />
            </span>
            <div>
              <strong>수행평가 준비 완료!</strong>
              <small>작은 성취가 쌓이는 하루</small>
            </div>
          </div>
          <div className="floating-label label-bottom">
            <span className="label-icon purple">
              <Sparkles size={18} />
            </span>
            <div>
              <strong>오늘 30분, 뭐부터 할까?</strong>
              <small>과제를 이해하는 AI 도우미</small>
            </div>
          </div>
        </div>
        <div className="hero-scroll">
          <span>SCROLL TO EXPLORE</span>
          <ArrowDown size={16} />
        </div>
      </section>
      <section className="landing-statement" id="features">
        <Reveal>
          <span className="eyebrow">LESS WORRY, MORE POSSIBILITY</span>
          <h2>
            잊어버릴 걱정은 줄이고,
            <br />
            해낼 수 있는 일은 늘리고.
          </h2>
          <p>
            여기저기 흩어진 학교생활,
            <br className="mobile-break" /> 이제 한곳에서 정리하세요.
          </p>
        </Reveal>
      </section>
      <section className="story-section">
        <Reveal className="story-grid">
          <div className="story-copy">
            <span className="story-number">01 — 과제 관리</span>
            <h2>
              지금 해야 할 일,
              <br />
              <span>바로 알 수 있게.</span>
            </h2>
            <p>
              선생님이 등록한 과제가 내 대시보드에 쏙.
              <br />
              마감이 가까운 일부터 확인하고,
              <br />
              완료 버튼으로 하나씩 지워나가세요.
            </p>
            <div className="story-feature">
              <ClipboardIcon /> 과제 · 수행평가 · 시험 · 준비물
            </div>
          </div>
          <div className="product-preview">
            <div className="preview-top">
              <span className="brand-mark">A</span>
              <span>나의 학교생활</span>
              <i />
              <span className="preview-avatar">나</span>
            </div>
            <div className="preview-content">
              <span className="eyebrow">TODAY&apos;S PLAN</span>
              <h3>오늘도, 차근차근 👋</h3>
              <p>가장 중요한 일부터 시작해 볼까요?</p>
              {[
                {
                  color: "blue",
                  subject: "정보",
                  title: "공공데이터 시각화 수행평가",
                  date: "D-3",
                },
                {
                  color: "purple",
                  subject: "영어",
                  title: "나의 꿈 발표 준비하기",
                  date: "D-5",
                },
                {
                  color: "green",
                  subject: "과학",
                  title: "탐구 보고서 작성",
                  date: "D-7",
                },
              ].map((a) => (
                <div className="preview-task" key={a.title}>
                  <span className={`subject-icon ${a.color}`}>
                    <BookOpen size={20} />
                  </span>
                  <div>
                    <small>{a.subject}</small>
                    <strong>{a.title}</strong>
                  </div>
                  <span className="badge badge-blue">{a.date}</span>
                </div>
              ))}
              <small className="preview-caption">서비스 화면 예시</small>
            </div>
          </div>
        </Reveal>
      </section>
      <section className="story-section story-tint">
        <Reveal className="story-grid reverse">
          <div className="ai-preview">
            <div className="ai-orb">
              <Sparkles size={42} />
            </div>
            <div className="sample-question">
              오늘 30분밖에 없는데 뭐부터 해야 해?
            </div>
            <div className="sample-answer">
              <div>
                <Sparkles size={16} /> AI 과제 도우미
              </div>
              <p>
                정보 수행평가를 준비하는 첫 30분,
                <br />
                이렇게 시작해 볼까요?
              </p>
              <ol>
                <li>
                  <span>10분</span> 관심 있는 공공데이터 주제 고르기
                </li>
                <li>
                  <span>15분</span> 데이터와 필요한 항목 찾아보기
                </li>
                <li>
                  <span>5분</span> 내일 할 일 세 줄로 정리하기
                </li>
              </ol>
              <small>
                AI 답변 예시 · 실제 답변은 과제와 질문에 따라 달라집니다.
              </small>
            </div>
          </div>
          <div className="story-copy">
            <span className="story-number">02 — AI 학습 도우미</span>
            <h2>
              내 과제를 아는 AI.
              <br />
              <span>시작이 쉬워져요.</span>
            </h2>
            <p>
              제목, 설명, 마감일, 평가기준까지.
              <br />
              다시 설명할 필요 없이 바로 물어보세요.
              <br />
              스스로 해낼 수 있도록 옆에서 도울게요.
            </p>
            <div className="story-feature">
              <Sparkles size={18} /> 과제마다 이어지는 나만의 대화
            </div>
          </div>
        </Reveal>
      </section>
      <section className="story-section" id="together">
        <Reveal className="story-grid">
          <div className="story-copy">
            <span className="story-number">03 — 연결된 클래스</span>
            <h2>
              선생님은 한 번 등록.
              <br />
              <span>학생들은 바로 확인.</span>
            </h2>
            <p>
              복잡한 초대 대신, 클래스 코드 하나.
              <br />
              과제 등록부터 학생별 완료 현황까지
              <br />
              하나의 공간에서 함께할 수 있어요.
            </p>
            <Link className="text-link" href="/register">
              선생님 계정으로 시작하기 <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="class-preview">
            <div className="class-preview-icon">
              <GraduationCap size={48} />
            </div>
            <h3>정보과학 2학년</h3>
            <p>우리 반의 새로운 학습 공간</p>
            <div className="invite-preview">
              <small>클래스 초대 코드 예시</small>
              <strong>BSS-7K29FA</strong>
            </div>
            <div className="connected-people">
              <span>김</span>
              <span>이</span>
              <span>박</span>
              <span>최</span>
              <i>함께 배우고 있어요</i>
            </div>
          </div>
        </Reveal>
      </section>
      <section className="landing-benefits">
        <Reveal className="benefit-grid">
          {[
            {
              icon: CalendarDays,
              title: "한눈에 보는 일정",
              text: "수업 일정과 개인 일정을 캘린더에 함께 담아요.",
            },
            {
              icon: Check,
              title: "쌓여가는 작은 성취",
              text: "과제를 완료하고 나만의 진행 상황을 확인해요.",
            },
            {
              icon: Sparkles,
              title: "부담 없이 시작",
              text: "기본 관리 기능과 하루 10회의 AI 질문을 무료로.",
            },
          ].map((b) => (
            <div key={b.title}>
              <b.icon size={26} />
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </div>
          ))}
        </Reveal>
      </section>
      <section className="landing-final">
        <Reveal>
          <span className="eyebrow">YOUR SCHOOL, YOUR PACE</span>
          <h2>
            학교생활에,
            <br />
            조금 더 여유를.
          </h2>
          <Link className="btn btn-primary" href="/register">
            나의 학교생활 시작하기 <ArrowUpRight size={18} />
          </Link>
          <p>카드 등록 없이 무료로 시작할 수 있어요.</p>
        </Reveal>
      </section>
      <footer className="landing-footer">
        <Logo />
        <p>AI School OS · 학생과 선생님을 위한 학습 공간</p>
        <span>고등학교 모의창업 MVP 프로젝트</span>
      </footer>
    </main>
  );
}
function ClipboardIcon() {
  return <BookOpen size={18} />;
}
