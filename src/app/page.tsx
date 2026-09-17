import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  MessageCircle,
  Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import "./landing.css";

const tasks = [
  {
    subject: "탐구",
    title: "주제 탐구 보고서",
    date: "9월 20일",
    urgent: true,
  },
  {
    subject: "영어",
    title: "나의 꿈 발표 준비",
    date: "9월 22일",
    urgent: false,
  },
  {
    subject: "과학",
    title: "탐구 보고서 작성",
    date: "9월 24일",
    urgent: false,
  },
];

export default function Home() {
  return (
    <main className="landing" id="main-content">
      <header className="landing-header">
        <nav className="landing-nav" aria-label="메인 메뉴">
          <Logo />
          <div className="landing-links">
            <a href="#how-it-works">사용 방법</a>
            <a href="#for-teachers">선생님과 함께</a>
          </div>
          <div className="nav-actions">
            <Link className="btn btn-ghost" href="/login">
              로그인
            </Link>
            <Link className="btn btn-primary" href="/register">
              시작하기 <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">
            해야 할 일과
            <br />
            <span>수업의 흐름을</span> 한곳에서.
          </h1>
          <p className="hero-lead">
            과제, 마감일, 제출과 피드백을 한 화면에서 정리하세요.
            <br />
            오늘 할 일을 고르는 데 쓰는 시간을 줄여 드립니다.
          </p>
          <div className="landing-cta">
            <Link className="btn btn-primary" href="/register">
              무료로 시작하기 <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <a className="btn btn-secondary" href="#how-it-works">
              어떻게 쓰나요?
            </a>
          </div>
          <p className="hero-proof">
            <Check size={16} aria-hidden="true" /> 학생과 선생님이 같은 과제를
            보고, 각자의 다음 일을 확인합니다.
          </p>
        </div>

        <div className="hero-workspace" aria-label="오늘의 학교생활 예시">
          <div className="workspace-topline">
            <div>
              <span className="workspace-label">나의 학교생활</span>
              <strong>오늘 할 일</strong>
            </div>
            <span className="workspace-date">9월 17일 목요일</span>
          </div>
          <div className="workspace-summary">
            <div>
              <span>남은 과제</span>
              <strong>3개</strong>
            </div>
            <div>
              <span>이번 주 완료</span>
              <strong>8개</strong>
            </div>
            <div className="workspace-summary-note">
              <CalendarDays size={16} aria-hidden="true" />
              마감이 가까운 순서
            </div>
          </div>
          <div className="workspace-tasks">
            {tasks.map((task) => (
              <div className="workspace-task" key={task.title}>
                <span className={`task-subject ${task.urgent ? "urgent" : ""}`}>
                  {task.subject}
                </span>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.date} 마감</span>
                </div>
                <span className={`task-state ${task.urgent ? "urgent" : ""}`}>
                  {task.urgent ? "먼저" : "진행 중"}
                </span>
              </div>
            ))}
          </div>
          <div className="workspace-footline">
            <span>
              <ClipboardCheck size={16} aria-hidden="true" /> 오늘의 우선순위
            </span>
            <span>완료한 만큼 여유가 생겨요</span>
          </div>
        </div>
      </section>

      <section className="landing-bridge" aria-labelledby="bridge-title">
        <div>
          <h2 id="bridge-title">
            기록이 흩어지지 않도록,
            <br />
            하나의 흐름으로 이어집니다.
          </h2>
        </div>
        <p>
          선생님이 올린 과제는 학생의 일정이 되고, 학생의 제출은 선생님의
          피드백으로 이어집니다. 필요한 순간에 필요한 정보만 보세요.
        </p>
      </section>

      <section
        className="landing-flow"
        id="how-it-works"
        aria-labelledby="flow-title"
      >
        <div className="section-intro">
          <h2 id="flow-title">한 번 정리하면, 다음 행동이 보입니다.</h2>
        </div>
        <div className="flow-list">
          <article className="flow-step">
            <div className="flow-icon">
              <BookOpen size={22} aria-hidden="true" />
            </div>
            <h3>수업을 만들고</h3>
            <p>
              클래스 코드 하나로 학생을 초대하고, 과제를 한 번에 공유합니다.
            </p>
          </article>
          <article className="flow-step">
            <div className="flow-icon">
              <CalendarDays size={22} aria-hidden="true" />
            </div>
            <h3>오늘 할 일을 고르고</h3>
            <p>마감일과 우선순위를 보고 지금 시작할 과제를 빠르게 찾습니다.</p>
          </article>
          <article className="flow-step">
            <div className="flow-icon">
              <MessageCircle size={22} aria-hidden="true" />
            </div>
            <h3>막히면 질문하고</h3>
            <p>
              과제 맥락을 알고 있는 도우미에게 다음 한 걸음을 물어볼 수
              있습니다.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-ai" aria-labelledby="ai-title">
        <div className="ai-copy">
          <h2 id="ai-title">
            막막할 때는
            <br />
            다음 한 걸음만.
          </h2>
          <p>
            완성본을 대신 만드는 대신, 과제의 설명과 평가기준을 바탕으로 스스로
            시작할 수 있는 순서를 함께 찾습니다.
          </p>
          <Link className="text-link text-link-light" href="/register">
            나의 공간 만들기 <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="ai-note" aria-label="AI 과제 도우미 답변 예시">
          <div className="ai-note-head">
            <span>과제 도우미</span>
            <span>답변 예시</span>
          </div>
          <p className="ai-question">오늘 30분만 쓸 수 있어. 어디부터 할까?</p>
          <div className="ai-answer">
            <strong>첫 단계부터 작게 시작해 볼까요?</strong>
            <ol>
              <li>
                <span>10분</span> 관심 있는 탐구 주제 고르기
              </li>
              <li>
                <span>15분</span> 참고 자료와 필요한 항목 찾아보기
              </li>
              <li>
                <span>5분</span> 내일 할 일 세 줄로 정리하기
              </li>
            </ol>
            <small>실제 답변은 과제와 질문에 따라 달라집니다.</small>
          </div>
        </div>
      </section>

      <section
        className="landing-together"
        id="for-teachers"
        aria-labelledby="together-title"
      >
        <div className="section-intro">
          <h2 id="together-title">
            수업은 한 번 등록하고,
            <br />
            진행은 함께 확인합니다.
          </h2>
          <p>
            클래스 코드로 초대하고, 과제 등록부터 제출물 검토까지 한 공간에서
            이어가세요.
          </p>
          <Link className="text-link" href="/register">
            선생님 계정으로 시작하기{" "}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="class-board" aria-label="클래스 화면 예시">
          <div className="class-board-head">
            <div>
              <span>탐구 수업</span>
              <strong>2학년 탐구 수업</strong>
            </div>
            <Users size={22} aria-hidden="true" />
          </div>
          <div className="class-code-row">
            <span>학생 초대 코드</span>
            <code>BSS-7K29FA</code>
          </div>
          <div className="class-member-row">
            <span className="member-dots" aria-hidden="true">
              <i>김</i>
              <i>이</i>
              <i>박</i>
              <i>최</i>
            </span>
            <span>4명이 함께 배우고 있어요</span>
          </div>
        </div>
      </section>

      <section className="landing-final" aria-labelledby="final-title">
        <h2 id="final-title">
          학교생활을 정리하는
          <br />첫 화면을 만드세요.
        </h2>
        <Link className="btn btn-primary" href="/register">
          무료로 시작하기 <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <p>카드 등록 없이 시작할 수 있습니다.</p>
      </section>

      <footer className="landing-footer">
        <Logo />
        <p>학생과 선생님을 위한 학교생활 운영 도구</p>
        <span>AI School OS · MVP</span>
      </footer>
    </main>
  );
}
