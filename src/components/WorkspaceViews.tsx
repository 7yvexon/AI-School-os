import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Plus,
  MessageCircle,
  Users,
  ArrowUpRight,
  Download,
  Star,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { accessibleAssignment } from "@/lib/access";
import {
  dailyLimit,
  dayKey,
  daysLeft,
  dday,
  isAssignmentType,
  typeLabels,
} from "@/lib/domain";
import { aiConfigured, aiProviderDisclosure, aiProviderKey } from "@/lib/ai";
import { AssignmentRow } from "./AssignmentRow";
import { JoinClassForm } from "./JoinClassForm";
import { ProfileForm } from "./ProfileForm";
import { ProgressButton } from "./ProgressButton";
import { DeleteButton } from "./DeleteButton";
import { Chat } from "./Chat";
import { SubmissionForm } from "./SubmissionForm";
import { SubmissionReviewForm } from "./SubmissionReviewForm";
import { PendingPromptNotice } from "./PendingPromptNotice";
import { AiConsentForm } from "./AiConsentForm";
import { RestoreButton } from "./RestoreButton";
import { RotateClassCodeButton } from "./RotateClassCodeButton";
import { RemoveMemberButton } from "./RemoveMemberButton";
import { AiDataDeleteButton } from "./AiDataDeleteButton";
import { RestoreMemberButton } from "./RestoreMemberButton";
import { MAX_AI_MESSAGES_ON_PAGE } from "@/lib/limits";

type Role = "STUDENT" | "TEACHER";
const withUnit = (value: string, unit: string) =>
  value ? (value.endsWith(unit) ? value : `${value}${unit}`) : "";

const attachmentStatusLabels = {
  QUARANTINED: "검사 대기",
  CLEAN: "검사 완료",
  INFECTED: "차단됨",
  SCAN_ERROR: "검사 오류",
} as const;
export function Heading({
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{description}</p>
    </div>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty card">
      <BookOpen size={28} aria-hidden="true" focusable="false" />
      <div className="empty-content">
        {typeof children === "string" ? <p>{children}</p> : children}
      </div>
    </div>
  );
}
function scope(user: { id: string; role: Role }) {
  return user.role === "TEACHER"
    ? { teacherId: user.id }
    : { members: { some: { userId: user.id, removedAt: null } } };
}

export async function Dashboard({ role }: { role: Role }) {
  const user = await requireUser(role);
  const providerKey = aiProviderKey();
  const hasAiConsent = Boolean(
    user.aiConsentAt &&
    providerKey &&
    user.aiConsentProviderKey === providerKey,
  );
  const base = `/${role.toLowerCase()}`;
  const [
    classes,
    assignments,
    usage,
    events,
    pendingReviewCount,
    pendingSubmissions,
  ] = await Promise.all([
    db.class.findMany({
      where: scope(user),
      include: {
        _count: { select: { members: { where: { removedAt: null } } } },
      },
    }),
    db.assignment.findMany({
      where: { class: scope(user), archivedAt: null },
      include: { class: true, progress: { where: { userId: user.id } } },
      orderBy: { dueAt: "asc" },
    }),
    role === "STUDENT" && hasAiConsent
      ? db.aIUsage.findUnique({
          where: { userId_day: { userId: user.id, day: dayKey() } },
        })
      : Promise.resolve(null),
    role === "STUDENT"
      ? db.personalEvent.findMany({
          where: {
            userId: user.id,
            dueAt: {
              gte: new Date(`${dayKey()}T00:00:00+09:00`),
              lte: new Date(`${dayKey()}T23:59:59+09:00`),
            },
          },
          orderBy: { dueAt: "asc" },
        })
      : Promise.resolve([]),
    role === "TEACHER"
      ? db.submission.count({
          where: {
            status: "SUBMITTED",
            assignment: { class: { teacherId: user.id } },
          },
        })
      : Promise.resolve(0),
    role === "TEACHER"
      ? db.submission.findMany({
          where: {
            status: "SUBMITTED",
            assignment: { class: { teacherId: user.id } },
          },
          select: {
            id: true,
            submittedAt: true,
            student: { select: { name: true } },
            assignment: {
              select: {
                id: true,
                title: true,
                archivedAt: true,
                class: { select: { name: true } },
              },
            },
          },
          orderBy: { submittedAt: "asc" },
          take: 4,
        })
      : Promise.resolve([]),
  ]);
  const studentActive = assignments.filter((a) => !a.progress[0]?.completed);
  const active =
    role === "TEACHER"
      ? assignments.filter((a) => daysLeft(a.dueAt) >= 0)
      : studentActive;
  const overdue = (role === "TEACHER" ? assignments : studentActive).filter(
    (a) => daysLeft(a.dueAt) < 0,
  );
  const todayDue = active.filter((a) => daysLeft(a.dueAt) === 0);
  const todayItems = [
    ...todayDue.map((assignment) => ({
      kind: "assignment" as const,
      id: assignment.id,
      dueAt: assignment.dueAt,
      assignment,
    })),
    ...events.map((event) => ({
      kind: "event" as const,
      id: event.id,
      dueAt: event.dueAt,
      event,
    })),
  ].sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime());
  const urgent = active.filter(
    (a) => daysLeft(a.dueAt) >= 1 && daysLeft(a.dueAt) <= 2,
  );
  const week = active.filter(
    (a) => daysLeft(a.dueAt) > 2 && daysLeft(a.dueAt) <= 7,
  );
  const later = active.filter((a) => daysLeft(a.dueAt) > 7);
  const latest = [...assignments]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3);
  const nearest = active[0];
  const stats =
    role === "STUDENT"
      ? [
          { label: "진행 중 과제", value: active.length, icon: BookOpen },
          { label: "기한 지남", value: overdue.length, icon: Clock3 },
          { label: "곧 마감", value: urgent.length, icon: Clock3 },
          {
            label: "완료한 과제",
            value: assignments.length - studentActive.length,
            icon: ClipboardCheck,
          },
          {
            label: "오늘 AI 사용",
            value: `${usage?.count ?? 0}/${dailyLimit(user.plan)}`,
            icon: MessageCircle,
          },
        ]
      : [
          { label: "내 클래스", value: classes.length, icon: BookOpen },
          {
            label: "클래스별 학생 합계",
            value: classes.reduce((n, c) => n + c._count.members, 0),
            icon: Users,
          },
          { label: "진행 중 과제", value: active.length, icon: ClipboardCheck },
          { label: "기한 지남", value: overdue.length, icon: Clock3 },
          { label: "곧 마감", value: urgent.length, icon: Clock3 },
          {
            label: "검토 대기",
            value: pendingReviewCount,
            icon: MessageCircle,
          },
        ];
  const sections = [
    {
      label: "기한 지남",
      items: overdue,
    },
    {
      label: "마감 임박 · 3일 이내",
      items: urgent,
    },
    {
      label: "이번 주",
      items: week,
    },
    { label: "나중", items: later },
  ];
  const visibleSections = sections.filter((section) => section.items.length);
  return (
    <>
      <Heading
        eyebrow={
          role === "STUDENT" ? "MY SCHOOL, MY PACE" : "TEACHER WORKSPACE"
        }
        title={`안녕하세요, ${user.name}님`}
        description={
          role === "STUDENT"
            ? "해야 할 일은 선명하게, 학교생활은 가볍게."
            : "수업의 흐름을 한눈에 확인하고 학생들과 연결하세요."
        }
      />
      <div className="hero-banner">
        <div>
          <h2>
            {role === "STUDENT"
              ? overdue.length
                ? `기한이 지난 과제가 ${overdue.length}개 있어요`
                : urgent.length
                  ? `곧 마감하는 과제가 ${urgent.length}개 있어요`
                  : "차근차근, 오늘도 한 걸음"
              : "좋은 수업의 시작, 하나의 클래스"}
          </h2>
          <p>
            {role === "STUDENT"
              ? overdue.length
                ? "기한과 제출 상태를 확인하고, 먼저 살펴볼 과제를 골라 보세요."
                : "작은 일부터 시작해 보세요. 완료한 만큼 여유가 생겨요."
              : "과제를 등록하면 참여한 학생들에게 바로 표시됩니다."}
          </p>
        </div>
        {role === "TEACHER" ? (
          classes.length ? (
            <details className="quick-assignment-picker">
              <summary className="btn btn-primary">
                <Plus size={16} aria-hidden="true" focusable="false" />
                과제 등록
              </summary>
              <div className="quick-assignment-picker__options">
                <p>과제를 등록할 클래스를 선택하세요.</p>
                {classes.map((cls) => (
                  <Link
                    className="list-item"
                    href={`/teacher/classes/${cls.id}/assignments/new`}
                    key={cls.id}
                  >
                    <span>{cls.name}</span>
                    <span className="form-hint">{cls.subject}</span>
                  </Link>
                ))}
              </div>
            </details>
          ) : (
            <Link className="btn btn-primary" href="/teacher/classes/new">
              <Plus size={16} aria-hidden="true" focusable="false" />
              클래스 만들기
            </Link>
          )
        ) : (
          <GraduationCap
            className="hero-symbol"
            size={48}
            aria-hidden="true"
            focusable="false"
          />
        )}
      </div>
      <PendingPromptNotice
        role={role}
        hasAssignments={assignments.length > 0}
        hasClasses={classes.length > 0}
        assignmentHref={
          role === "STUDENT"
            ? nearest
              ? "/student/assignments/" + nearest.id + "#chat"
              : assignments[0]
                ? `/student/assignments/${assignments[0].id}#chat`
                : undefined
            : undefined
        }
      />
      <div className="grid stats-grid stats-grid--dashboard">
        {stats.map((s) => (
          <div className="card stat-card" key={s.label}>
            <div className="stat-icon">
              <s.icon size={18} aria-hidden="true" focusable="false" />
            </div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>
      {role === "TEACHER" && pendingReviewCount > 0 && (
        <section
          className="dashboard-review-queue"
          aria-labelledby="dashboard-review-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="dashboard-review-title">
                검토 대기 제출{" "}
                <span className="count">{pendingReviewCount}</span>
              </h2>
              <p>학생이 제출한 과제에 피드백을 남겨 주세요.</p>
            </div>
            <Link className="text-link" href="/teacher/reviews">
              모든 검토 대기 보기 <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="assignment-list">
            {pendingSubmissions.map((submission) => (
              <Link
                className="assignment-row"
                href={
                  "/teacher/assignments/" +
                  submission.assignment.id +
                  "#submission-review"
                }
                key={submission.id}
              >
                <div className="assignment-date">
                  <strong>
                    {new Intl.DateTimeFormat("ko-KR", {
                      day: "numeric",
                      timeZone: "Asia/Seoul",
                    }).format(submission.submittedAt)}
                  </strong>
                  <small>
                    {new Intl.DateTimeFormat("ko-KR", {
                      month: "short",
                      timeZone: "Asia/Seoul",
                    }).format(submission.submittedAt)}
                  </small>
                </div>
                <div className="assignment-main">
                  <h3>{submission.assignment.title}</h3>
                  <p>
                    {submission.student.name} ·{" "}
                    {submission.assignment.class.name}
                  </p>
                </div>
                <div className="assignment-meta">
                  {submission.assignment.archivedAt && (
                    <span className="badge badge-amber">보관된 과제</span>
                  )}
                  <span className="badge badge-blue">검토 대기</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="dashboard-grid">
        <div>
          {role === "STUDENT" && todayItems.length > 0 && (
            <section aria-labelledby="dashboard-today-title">
              <div className="section-heading">
                <h2 id="dashboard-today-title">
                  오늘 할 일 <span className="count">{todayItems.length}</span>
                </h2>
                <Link className="text-link" href="/student/calendar">
                  캘린더 <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>
              <div className="assignment-list">
                {todayItems.map((item) =>
                  item.kind === "assignment" ? (
                    <AssignmentRow
                      assignment={item.assignment}
                      key={`assignment-${item.id}`}
                    />
                  ) : (
                    <div
                      className="assignment-row today-personal-event"
                      key={`event-${item.id}`}
                    >
                      <div className="assignment-date">
                        <strong>
                          {new Intl.DateTimeFormat("ko-KR", {
                            day: "numeric",
                            timeZone: "Asia/Seoul",
                          }).format(item.dueAt)}
                        </strong>
                        <small>개인 일정</small>
                      </div>
                      <div className="assignment-main">
                        <h3>{item.event.title}</h3>
                        <p>오늘의 개인 일정</p>
                      </div>
                      <span className="badge badge-green">개인</span>
                    </div>
                  ),
                )}
              </div>
            </section>
          )}
          {visibleSections.length ? (
            visibleSections.map((section) => (
              <section
                aria-labelledby={`dashboard-section-${section.label}`}
                key={section.label}
              >
                <div className="section-heading">
                  <h2 id={`dashboard-section-${section.label}`}>
                    {section.label}{" "}
                    <span className="count">{section.items.length}</span>
                  </h2>
                  <Link className="text-link" href={`${base}/assignments`}>
                    전체 보기 <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                </div>
                <div className="assignment-list">
                  {section.items.slice(0, 4).map((assignment) => (
                    <AssignmentRow
                      key={assignment.id}
                      assignment={assignment}
                      teacher={role === "TEACHER"}
                    />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <section
              className="empty card card-pad"
              aria-labelledby="dashboard-empty-title"
            >
              <h2 id="dashboard-empty-title">
                {role === "STUDENT"
                  ? assignments.length
                    ? "진행 중인 과제가 없어요"
                    : "아직 등록된 과제가 없어요"
                  : "아직 등록된 과제가 없어요"}
              </h2>
              <p>
                {role === "STUDENT"
                  ? assignments.length
                    ? "완료한 과제와 즐겨찾기는 과제 목록에서 다시 확인할 수 있어요."
                    : classes.length
                      ? "참여 중인 클래스에 과제가 등록되면 여기에 표시됩니다."
                      : "선생님이 공유한 클래스 코드로 먼저 참여해 주세요."
                  : classes.length
                    ? "클래스에서 과제를 등록하면 학생 진행 상황을 확인할 수 있습니다."
                    : "먼저 클래스를 만들고 학생을 초대해 주세요."}
              </p>
              <Link
                className="btn btn-secondary"
                href={
                  role === "STUDENT"
                    ? assignments.length || classes.length
                      ? "/student/assignments"
                      : "/student/classes"
                    : classes.length
                      ? "/teacher/classes"
                      : "/teacher/classes/new"
                }
              >
                {role === "STUDENT"
                  ? assignments.length || classes.length
                    ? "과제 목록 보기"
                    : "클래스 참여하기"
                  : classes.length
                    ? "클래스 관리하기"
                    : "클래스 만들기"}
              </Link>
            </section>
          )}
        </div>
        <aside>
          <div className="section-heading">
            <h2>{role === "STUDENT" ? "AI와 시작하기" : "내 클래스"}</h2>
          </div>
          <div className="card card-pad">
            <div className="stat-icon">
              <MessageCircle size={18} aria-hidden="true" focusable="false" />
            </div>
            <h3 style={{ margin: "0 0 10px" }}>
              {role === "STUDENT"
                ? "막막한 과제, 작게 나눠봐요"
                : `${classes.length}개의 수업을 운영 중이에요`}
            </h3>
            <p
              className="page-subtitle"
              style={{ lineHeight: 1.8, marginBottom: 18 }}
            >
              {role === "STUDENT"
                ? nearest
                  ? `${nearest.title} · ${dday(nearest.dueAt)}. 과제 도우미에게 오늘 할 일을 물어보세요.`
                  : assignments.length
                    ? "모든 과제를 완료했어요. 지난 과제의 AI 대화도 계속 확인할 수 있어요."
                    : "클래스에 참여하고 나만의 학습 도우미를 만나보세요."
                : "초대 코드를 공유하고 학생들의 진행 상황을 확인하세요."}
            </p>
            <Link
              className="btn btn-primary btn-block"
              href={
                role === "TEACHER"
                  ? "/teacher/classes"
                  : nearest
                    ? `/student/assignments/${nearest.id}#chat`
                    : assignments.length
                      ? "/student/ai"
                      : "/student/classes"
              }
            >
              {role === "TEACHER" ? "클래스 관리하기" : "시작하기"}{" "}
              <ArrowUpRight size={15} aria-hidden="true" focusable="false" />
            </Link>
          </div>
          <div className="section-heading">
            <h2>최근 등록된 과제</h2>
          </div>
          <div className="card card-pad list-tight">
            {latest.length ? (
              latest.map((a) => (
                <Link
                  className="list-item"
                  key={a.id}
                  href={`${base}/assignments/${a.id}`}
                >
                  <div>
                    <h3>{a.title}</h3>
                    <p>
                      {a.class.subject} · {dday(a.dueAt)}
                    </p>
                  </div>
                  <ArrowUpRight
                    size={15}
                    aria-hidden="true"
                    focusable="false"
                  />
                </Link>
              ))
            ) : (
              <p className="page-subtitle">새 과제를 기다리고 있어요.</p>
            )}
          </div>
          {role === "STUDENT" && (
            <div className="plan-mini card card-pad">
              <span className="badge badge-blue">{user.plan}</span>
              <h3>오늘의 AI 사용량</h3>
              <div
                className="progress-bar"
                role="progressbar"
                aria-label="오늘의 AI 사용량"
                aria-valuemin={0}
                aria-valuemax={dailyLimit(user.plan)}
                aria-valuenow={Math.min(
                  usage?.count ?? 0,
                  dailyLimit(user.plan),
                )}
                aria-valuetext={`${usage?.count ?? 0}/${dailyLimit(user.plan)}회`}
              >
                <span
                  style={{
                    width: `${Math.min(100, ((usage?.count ?? 0) / dailyLimit(user.plan)) * 100)}%`,
                  }}
                />
              </div>
              <p className="form-hint">
                {usage?.count ?? 0} / {dailyLimit(user.plan)}회 · 한국 시간 자정
                초기화
              </p>
              <Link className="text-link" href="/student/settings">
                플랜 살펴보기 <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export async function Classes({ role }: { role: Role }) {
  const user = await requireUser(role);
  const base = `/${role.toLowerCase()}`;
  const classes = await db.class.findMany({
    where: scope(user),
    include: {
      teacher: { select: { name: true } },
      _count: {
        select: {
          members: { where: { removedAt: null } },
          assignments: { where: { archivedAt: null } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <Heading
        eyebrow="CONNECTED CLASSROOM"
        title="내 클래스"
        description={
          role === "TEACHER"
            ? "직접 운영하는 클래스와 학생 참여 현황을 관리하세요."
            : "참여 중인 클래스와 필요한 과제를 한곳에서 확인하세요."
        }
      />
      <div className="section-heading">
        <h2>
          {role === "TEACHER" ? "운영 중인 클래스" : "참여한 클래스"}{" "}
          {classes.length}
        </h2>
        {role === "TEACHER" && (
          <Link className="btn btn-primary" href="/teacher/classes/new">
            <Plus size={16} aria-hidden="true" focusable="false" />
            클래스 만들기
          </Link>
        )}
      </div>
      <div className="grid class-grid">
        {classes.map((c) => (
          <Link
            className="card class-card"
            key={c.id}
            href={`${base}/classes/${c.id}`}
          >
            <div className="stat-icon">
              <BookOpen size={20} aria-hidden="true" focusable="false" />
            </div>
            <div className="class-head">
              <div>
                <h3>{c.name}</h3>
                <p>
                  {c.subject} · {c.teacher.name} 선생님
                </p>
              </div>
              <ArrowUpRight size={18} aria-hidden="true" focusable="false" />
            </div>
            <div className="class-card-footer">
              <span>학생 {c._count.members}명</span>
              <span>과제 {c._count.assignments}개</span>
            </div>
          </Link>
        ))}
      </div>
      {!classes.length && (
        <Empty>
          {role === "TEACHER"
            ? "아직 운영 중인 클래스가 없어요. 위에서 첫 클래스를 만들어 보세요."
            : "아직 참여 중인 클래스가 없어요. 선생님께 받은 초대 코드로 참여해 주세요."}
        </Empty>
      )}
      {role === "STUDENT" && (
        <section style={{ maxWidth: 560 }}>
          <div className="section-heading">
            <div>
              <h2>새 클래스에 참여하기</h2>
              <p>선생님께 받은 클래스 코드를 입력해 주세요.</p>
            </div>
          </div>
          <JoinClassForm />
        </section>
      )}
    </>
  );
}

export async function ClassDetail({ role, id }: { role: Role; id: string }) {
  const user = await requireUser(role);
  const cls = await db.class.findFirst({
    where: { id, ...scope(user) },
    include: {
      teacher: { select: { name: true } },
      assignments: {
        where: role === "TEACHER" ? {} : { archivedAt: null },
        include: { class: true, progress: { where: { userId: user.id } } },
        orderBy: { dueAt: "asc" },
      },
      members: {
        where: role === "TEACHER" ? {} : { id: "" },
        include: {
          user: {
            select: { name: true, school: true, grade: true, classroom: true },
          },
        },
      },
    },
  });
  if (!cls) notFound();
  const activeAssignments = cls.assignments.filter((a) => !a.archivedAt);
  const archivedAssignments = cls.assignments.filter((a) => a.archivedAt);
  const activeMembers = cls.members.filter((m) => !m.removedAt);
  const removedMembers = cls.members.filter((m) => m.removedAt);
  return (
    <>
      <Heading
        eyebrow={cls.subject}
        title={cls.name}
        description={`${cls.teacher.name} 선생님과 함께하는 수업`}
      />
      {role === "TEACHER" && (
        <div className="hero-banner">
          <div>
            <h2>학생 초대 코드</h2>
            <p>
              새 학생에게 이 코드를 전달하세요. 기존 참여 학생은 코드 재발급
              후에도 클래스에 남습니다.
            </p>
          </div>
          <div className="detail-actions">
            <RotateClassCodeButton classId={cls.id} code={cls.code} />
          </div>
        </div>
      )}
      <div className="section-heading">
        <h2>수업 과제</h2>
        {role === "TEACHER" && (
          <Link
            className="btn btn-primary"
            href={`/teacher/classes/${id}/assignments/new`}
          >
            <Plus size={16} aria-hidden="true" focusable="false" />
            과제 등록
          </Link>
        )}
      </div>
      <div className="assignment-list">
        {activeAssignments.map((a) => (
          <AssignmentRow
            key={a.id}
            assignment={a}
            teacher={role === "TEACHER"}
          />
        ))}
      </div>
      {!activeAssignments.length && (
        <Empty>
          {role === "STUDENT"
            ? "이 클래스에는 아직 과제가 배정되지 않았어요. 선생님이 등록하면 여기에 표시됩니다."
            : "아직 활성 과제가 없습니다. 위에서 첫 과제를 등록해 보세요."}
        </Empty>
      )}
      {role === "TEACHER" && archivedAssignments.length > 0 && (
        <>
          <div className="section-heading">
            <h2>보관된 과제 {archivedAssignments.length}</h2>
          </div>
          <div className="assignment-list">
            {archivedAssignments.map((a) => (
              <AssignmentRow key={a.id} assignment={a} teacher />
            ))}
          </div>
        </>
      )}
      {role === "TEACHER" && (
        <>
          <div className="section-heading">
            <h2>참여 학생 {activeMembers.length}명</h2>
          </div>
          <div className="card card-pad">
            {activeMembers.length ? (
              activeMembers.map((m) => (
                <div className="list-item" key={m.id}>
                  <h3>{m.user.name}</h3>
                  <p>
                    {[
                      m.user.school,
                      withUnit(m.user.grade, "학년"),
                      withUnit(m.user.classroom, "반"),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "프로필 정보 없음"}
                  </p>
                  <RemoveMemberButton memberId={m.id} />
                </div>
              ))
            ) : (
              <p className="page-subtitle">
                학생이 초대 코드로 참여하면 여기에 표시됩니다.
              </p>
            )}
          </div>
          {removedMembers.length > 0 && (
            <>
              <div className="section-heading">
                <h2>제외된 학생 {removedMembers.length}명</h2>
              </div>
              <div className="card card-pad">
                {removedMembers.map((m) => (
                  <div className="list-item" key={m.id}>
                    <div>
                      <h4>{m.user.name}</h4>
                      <p>
                        기존 제출·검토 기록은 보존되며, 참여 복원 후 다시 확인할
                        수 있습니다.
                      </p>
                    </div>
                    <RestoreMemberButton memberId={m.id} />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

export async function Assignments({
  role,
  filter = "",
  favorite = false,
  query = "",
}: {
  role: Role;
  filter?: string;
  favorite?: boolean;
  query?: string;
}) {
  const user = await requireUser(role);
  const base = `/${role.toLowerCase()}`;
  const normalizedQuery = query.trim().slice(0, 80);
  const classScope = scope(user);
  const [list, totalCount, classCount] = await Promise.all([
    db.assignment.findMany({
      where: {
        class: classScope,
        archivedAt: null,
        ...(isAssignmentType(filter)
          ? { type: filter as keyof typeof typeLabels }
          : {}),
        ...(favorite && role === "STUDENT"
          ? { progress: { some: { userId: user.id, favorite: true } } }
          : {}),
        ...(normalizedQuery
          ? {
              OR: [
                { title: { contains: normalizedQuery, mode: "insensitive" } },
                {
                  class: {
                    name: { contains: normalizedQuery, mode: "insensitive" },
                  },
                },
                {
                  class: {
                    subject: { contains: normalizedQuery, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      include: { class: true, progress: { where: { userId: user.id } } },
      orderBy: { dueAt: "asc" },
    }),
    db.assignment.count({ where: { class: classScope, archivedAt: null } }),
    role === "STUDENT"
      ? db.class.count({ where: classScope })
      : Promise.resolve(0),
  ]);
  const hrefFor = (
    nextFilter: string,
    nextFavorite: boolean,
    nextQuery: string,
  ) => {
    const params = new URLSearchParams();
    if (nextFilter) params.set("type", nextFilter);
    if (nextFavorite) params.set("favorite", "true");
    if (nextQuery) params.set("q", nextQuery);
    const search = params.toString();
    return `${base}/assignments${search ? `?${search}` : ""}`;
  };
  const hasFilters = Boolean(filter || favorite || normalizedQuery);
  return (
    <>
      <Heading
        eyebrow="YOUR NEXT STEP"
        title={role === "STUDENT" ? "과제 모아보기" : "과제 관리"}
        description="과제부터 시험, 준비물까지. 마감이 가까운 순서로 정리했어요."
      />
      <form
        className="assignment-search"
        action={`${base}/assignments`}
        method="get"
      >
        {isAssignmentType(filter) && (
          <input type="hidden" name="type" value={filter} />
        )}
        {favorite && <input type="hidden" name="favorite" value="true" />}
        <label className="sr-only" htmlFor="assignment-search-query">
          과제 제목이나 클래스 검색
        </label>
        <input
          id="assignment-search-query"
          type="search"
          name="q"
          maxLength={80}
          defaultValue={normalizedQuery}
          placeholder="과제 제목 또는 클래스 검색"
        />
        <button className="btn btn-primary" type="submit">
          검색
        </button>
      </form>
      <div className="filters">
        <Link
          className={`btn ${!filter && !favorite ? "btn-primary" : "btn-secondary"}`}
          href={hrefFor("", false, normalizedQuery)}
        >
          전체
        </Link>
        {Object.entries(typeLabels).map(([key, label]) => (
          <Link
            className={`btn ${filter === key ? "btn-primary" : "btn-secondary"}`}
            key={key}
            href={hrefFor(key, favorite, normalizedQuery)}
          >
            {label}
          </Link>
        ))}
        {role === "STUDENT" && (
          <Link
            className={`btn ${favorite ? "btn-primary" : "btn-secondary"}`}
            href={hrefFor(filter, !favorite, normalizedQuery)}
          >
            <Star size={15} aria-hidden="true" /> 즐겨찾기
          </Link>
        )}
      </div>
      <div className="assignment-list">
        {list.map((a) => (
          <AssignmentRow
            key={a.id}
            assignment={a}
            teacher={role === "TEACHER"}
          />
        ))}
      </div>
      {!list.length && (
        <div className="empty card card-pad">
          <h2>
            {hasFilters
              ? "조건에 맞는 과제가 없어요"
              : totalCount
                ? "표시할 과제가 없습니다"
                : "아직 등록된 과제가 없어요"}
          </h2>
          <p>
            {hasFilters
              ? "검색어나 필터를 바꾸거나 전체 목록으로 돌아가 보세요."
              : role === "STUDENT"
                ? classCount
                  ? "참여한 클래스에 과제가 등록되면 여기에 표시됩니다."
                  : "과제를 확인하려면 먼저 선생님께 받은 코드로 클래스에 참여해 주세요."
                : "클래스를 만들고 과제를 등록하면 이곳에서 관리할 수 있습니다."}
          </p>
          <Link
            className="btn btn-secondary"
            href={
              hasFilters
                ? hrefFor("", false, "")
                : role === "STUDENT"
                  ? "/student/classes"
                  : "/teacher/classes"
            }
          >
            {hasFilters
              ? "필터 초기화"
              : role === "STUDENT"
                ? "내 클래스 보기"
                : "클래스 관리하기"}
          </Link>
        </div>
      )}
    </>
  );
}

export async function AssignmentDetail({
  role,
  id,
}: {
  role: Role;
  id: string;
}) {
  const user = await requireUser(role);
  const assignment = await accessibleAssignment(id, user, {
    includeArchived: role === "TEACHER",
  });
  if (!assignment) notFound();
  const providerKey = aiProviderKey();
  const hasAiConsent = Boolean(
    user.aiConsentAt &&
    providerKey &&
    user.aiConsentProviderKey === providerKey,
  );
  const progress =
    role === "STUDENT"
      ? await db.assignmentProgress.findUnique({
          where: { userId_assignmentId: { userId: user.id, assignmentId: id } },
        })
      : null;
  const conversation =
    role === "STUDENT" && hasAiConsent
      ? await db.aIConversation.findUnique({
          where: { userId_assignmentId: { userId: user.id, assignmentId: id } },
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: MAX_AI_MESSAGES_ON_PAGE,
            },
          },
        })
      : null;
  const members =
    role === "TEACHER"
      ? await db.classMember.findMany({
          where: { classId: assignment.classId, removedAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                grade: true,
                classroom: true,
                progress: { where: { assignmentId: id } },
              },
            },
          },
        })
      : [];
  const submission =
    role === "STUDENT"
      ? await db.submission.findUnique({
          where: {
            assignmentId_studentId: {
              assignmentId: id,
              studentId: user.id,
            },
          },
          include: {
            reviews: {
              orderBy: { createdAt: "desc" },
              include: { reviewer: { select: { name: true } } },
            },
          },
        })
      : null;
  const submissions =
    role === "TEACHER"
      ? await db.submission.findMany({
          where: { assignmentId: id },
          include: {
            student: {
              select: { name: true, grade: true, classroom: true },
            },
            reviews: {
              orderBy: { createdAt: "desc" },
              include: { reviewer: { select: { name: true } } },
            },
          },
          orderBy: { updatedAt: "desc" },
        })
      : [];
  const submissionStatusByStudent = new Map(
    submissions.map((item) => [item.studentId, item.status]),
  );
  const usage =
    role === "STUDENT" && hasAiConsent
      ? await db.aIUsage.findUnique({
          where: { userId_day: { userId: user.id, day: dayKey() } },
        })
      : null;
  return (
    <>
      <div className="detail-header">
        <div>
          <Link
            className="eyebrow"
            href={`/${role.toLowerCase()}/classes/${assignment.classId}`}
          >
            {assignment.class.name}{" "}
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
          <h1>{assignment.title}</h1>
          <p>
            {assignment.class.subject} · {typeLabels[assignment.type]}
          </p>
        </div>
        <div className="detail-actions">
          {role === "STUDENT" ? (
            <>
              <ProgressButton
                id={id}
                field="favorite"
                value={progress?.favorite ?? false}
                label="즐겨찾기"
              />
              <ProgressButton
                id={id}
                field="completed"
                value={progress?.completed ?? false}
                label={
                  progress?.completed ? "진행 완료 표시 취소" : "진행 완료 표시"
                }
              />
            </>
          ) : (
            <>
              <Link
                className="btn btn-secondary"
                href={`/teacher/assignments/${id}/edit`}
              >
                과제 수정
              </Link>
              {assignment.archivedAt ? (
                <RestoreButton id={id} />
              ) : (
                <DeleteButton id={id} />
              )}
            </>
          )}
        </div>
      </div>
      {assignment.archivedAt && (
        <div className="alert alert-error">이 과제는 보관된 상태입니다.</div>
      )}
      <div className="detail-body">
        <div className="card card-pad">
          <h2 className="small-heading">무엇을 해야 하나요?</h2>
          <p className="prose-like">{assignment.description}</p>
          <h2 className="small-heading">평가기준</h2>
          <div className="rubric">
            {assignment.rubric || "별도의 평가기준이 등록되지 않았습니다."}
          </div>
          {assignment.attachments.length > 0 && (
            <>
              <h2 className="small-heading" id="attachments">
                첨부파일
              </h2>
              {assignment.attachments.some(
                (attachment) => attachment.scanStatus !== "CLEAN",
              ) && (
                <p className="form-hint">
                  안전 검사가 끝난 파일만 다운로드할 수 있습니다. 검사 대기나
                  오류가 오래 지속되면 서비스 운영 담당자에게 재검사를 문의해
                  주세요.
                </p>
              )}
              {assignment.attachments.map((a) => (
                <div className="list-item" key={a.id}>
                  {a.scanStatus === "CLEAN" ? (
                    <a className="text-link" href={`/api/attachments/${a.id}`}>
                      {a.name} <Download size={13} aria-hidden="true" />
                    </a>
                  ) : (
                    <span>
                      {a.name} · {attachmentStatusLabels[a.scanStatus]}
                    </span>
                  )}
                  {role === "TEACHER" && (
                    <DeleteButton
                      op="attachment-delete"
                      label="파일 삭제"
                      id={a.id}
                    />
                  )}
                </div>
              ))}
            </>
          )}
        </div>
        <div className="card card-pad">
          <span
            className={`badge ${daysLeft(assignment.dueAt) <= 2 ? "badge-red" : "badge-blue"}`}
          >
            {dday(assignment.dueAt)}
          </span>
          <div className="info-row">
            <span>마감일</span>
            <strong>{dayKey(assignment.dueAt)}</strong>
          </div>
          <div className="info-row">
            <span>마감 시간</span>
            <span>오후 11:59 (한국)</span>
          </div>
          <div className="info-row">
            <span>종류</span>
            <span>{typeLabels[assignment.type]}</span>
          </div>
          {role === "STUDENT" && (
            <div className="info-row">
              <span>나의 진행 표시</span>
              <span>{progress?.completed ? "완료" : "진행 중"}</span>
            </div>
          )}
        </div>
      </div>
      {role === "STUDENT" ? (
        <>
          <div id="chat" style={{ marginTop: 24 }}>
            {hasAiConsent ? (
              <Chat
                key={id}
                assignmentId={id}
                initialMessages={[...(conversation?.messages ?? [])]
                  .reverse()
                  .map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                  }))}
                configured={aiConfigured()}
                initialUsed={usage?.count ?? 0}
                limit={dailyLimit(user.plan)}
              />
            ) : (
              <AiConsentForm
                provider={aiProviderDisclosure()}
                granted={hasAiConsent}
                savedConsent={Boolean(user.aiConsentAt)}
              />
            )}
          </div>
          <div style={{ marginTop: 24 }}>
            <SubmissionForm
              assignmentId={id}
              content={submission?.content}
              status={submission?.status}
              feedback={submission?.feedback}
              reviews={submission?.reviews.map((review) => ({
                id: review.id,
                status: review.status === "RETURNED" ? "RETURNED" : "REVIEWED",
                feedback: review.feedback,
                submissionContent: review.submissionContent,
                createdAt: review.createdAt.toISOString(),
                reviewerName: review.reviewer.name,
              }))}
            />
          </div>
        </>
      ) : (
        <>
          <div className="section-heading">
            <div>
              <h2>학생별 진행 상황</h2>
              <p>
                {members.filter((m) => m.user.progress[0]?.completed).length}/
                {members.length}명 진행 완료 표시 · 제출 상태는 각 학생의
                배지에서 확인할 수 있어요.
              </p>
            </div>
          </div>
          <div className="card card-pad">
            {members.map((m) => (
              <div className="list-item" key={m.id}>
                <div>
                  <h3>{m.user.name}</h3>
                  <p>
                    {[
                      withUnit(m.user.grade, "학년"),
                      withUnit(m.user.classroom, "반"),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "학년·반 정보 없음"}
                  </p>
                </div>
                <span
                  className={`badge ${m.user.progress[0]?.completed ? "badge-green" : "badge-amber"}`}
                >
                  {m.user.progress[0]?.completed ? "진행 완료" : "진행 중"}
                </span>
                <span className="badge badge-blue">
                  {submissionStatusByStudent.get(m.user.id) === "REVIEWED"
                    ? "검토 완료"
                    : submissionStatusByStudent.get(m.user.id) === "RETURNED"
                      ? "수정 요청"
                      : submissionStatusByStudent.get(m.user.id) === "SUBMITTED"
                        ? "검토 대기"
                        : "미제출"}
                </span>
              </div>
            ))}
            {!members.length && (
              <p className="page-subtitle">아직 참여한 학생이 없습니다.</p>
            )}
          </div>
          <div className="section-heading" id="submission-review">
            <div>
              <h2>제출물 검토</h2>
              <p>{submissions.length}명이 제출한 내용을 확인하세요.</p>
            </div>
          </div>
          <div className="card card-pad">
            {submissions.length ? (
              submissions.map((item) => (
                <SubmissionReviewForm
                  key={item.id}
                  submissionId={item.id}
                  studentName={item.student.name}
                  studentMeta={[
                    withUnit(item.student.grade, "학년"),
                    withUnit(item.student.classroom, "반"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  content={item.content}
                  status={item.status}
                  feedback={item.feedback}
                  submittedAt={item.submittedAt.toISOString()}
                  updatedAt={item.updatedAt.toISOString()}
                  reviews={item.reviews.map((review) => ({
                    id: review.id,
                    status:
                      review.status === "RETURNED" ? "RETURNED" : "REVIEWED",
                    feedback: review.feedback,
                    submissionContent: review.submissionContent,
                    createdAt: review.createdAt.toISOString(),
                    reviewerName: review.reviewer.name,
                  }))}
                />
              ))
            ) : (
              <p className="page-subtitle">아직 제출한 학생이 없습니다.</p>
            )}
          </div>
        </>
      )}
    </>
  );
}

export async function Settings({ role }: { role: Role }) {
  const user = await requireUser(role);
  const providerKey = aiProviderKey();
  const hasAiConsent = Boolean(
    user.aiConsentAt &&
    providerKey &&
    user.aiConsentProviderKey === providerKey,
  );
  const usage =
    role === "STUDENT" && hasAiConsent
      ? await db.aIUsage.findUnique({
          where: { userId_day: { userId: user.id, day: dayKey() } },
        })
      : null;
  return (
    <>
      <Heading
        eyebrow="MAKE IT YOURS"
        title="설정"
        description={
          role === "STUDENT"
            ? "프로필과 AI 사용 설정을 관리하세요."
            : "프로필과 수업 운영 정보를 관리하세요."
        }
      />
      <ProfileForm
        user={{
          name: user.name,
          school: user.school,
          grade: user.grade,
          classroom: user.classroom,
        }}
      />
      {role === "STUDENT" && (
        <div style={{ marginTop: 24 }}>
          <AiConsentForm
            granted={hasAiConsent}
            savedConsent={Boolean(user.aiConsentAt)}
            provider={aiProviderDisclosure()}
          />
          <div style={{ marginTop: 16 }}>
            <div className="card card-pad">
              <h2 className="small-heading">AI 대화 기록</h2>
              <p className="prose-like">
                모든 과제의 앱 내 대화를 삭제합니다. 사용 동의와 사용량 통계는
                유지되며, 이후 질문을 보내면 새 대화 기록이 시작됩니다.
              </p>
              <AiDataDeleteButton />
            </div>
          </div>
        </div>
      )}
      {role === "STUDENT" ? (
        <>
          <div className="section-heading">
            <h2>내 플랜 · {user.plan}</h2>
          </div>
          <div className="grid plans-grid">
            <div className="card card-pad">
              <span className="badge badge-blue">FREE</span>
              <h3>학교생활의 기본</h3>
              <p className="prose-like">
                과제·클래스·캘린더 관리
                <br />
                AI 하루 10회
              </p>
            </div>
            <div className="card card-pad">
              <span className="badge badge-blue">PRO</span>
              <h3>더 넉넉한 AI 도우미</h3>
              <p className="prose-like">
                AI 하루 100회
                <br />
                자동 공부계획 · 고급 일정 분석 · 파일 분석: 준비 중
              </p>
              <p className="form-hint">
                MVP에서는 결제를 받지 않습니다. 플랜 변경은 운영자에게 문의해
                주세요.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="card card-pad">
          <h2 className="small-heading">교사 계정 기능</h2>
          <p className="prose-like">
            교사 계정에서는 클래스와 학생을 관리합니다. AI 사용 한도와 플랜은
            학생 계정에만 적용됩니다.
          </p>
        </div>
      )}
      {role === "STUDENT" && hasAiConsent && (
        <p className="page-subtitle" style={{ marginTop: 20 }}>
          오늘 {usage?.count ?? 0}/{dailyLimit(user.plan)}회 사용 · 기록된 토큰{" "}
          {usage?.tokens ?? 0}개
        </p>
      )}
    </>
  );
}
