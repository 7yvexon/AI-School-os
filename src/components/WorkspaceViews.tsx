import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Plus,
  Sparkles,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { accessibleAssignment } from "@/lib/access";
import { dailyLimit, dayKey, daysLeft, dday, typeLabels } from "@/lib/domain";
import { aiConfigured } from "@/lib/ai";
import { AssignmentRow } from "./AssignmentRow";
import { JoinClassForm } from "./JoinClassForm";
import { ProfileForm } from "./ProfileForm";
import { ProgressButton } from "./ProgressButton";
import { DeleteButton } from "./DeleteButton";
import { Chat } from "./Chat";

type Role = "STUDENT" | "TEACHER";
export function Heading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{description}</p>
    </div>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty card">
      <BookOpen size={28} />
      <p>{children}</p>
    </div>
  );
}
function scope(user: { id: string; role: Role }) {
  return user.role === "TEACHER"
    ? { teacherId: user.id }
    : { members: { some: { userId: user.id } } };
}

export async function Dashboard({ role }: { role: Role }) {
  const user = await requireUser(role);
  const base = `/${role.toLowerCase()}`;
  const [classes, assignments, usage, events] = await Promise.all([
    db.class.findMany({
      where: scope(user),
      include: { _count: { select: { members: true } } },
    }),
    db.assignment.findMany({
      where: { class: scope(user) },
      include: { class: true, progress: { where: { userId: user.id } } },
      orderBy: { dueAt: "asc" },
    }),
    db.aIUsage.findUnique({
      where: { userId_day: { userId: user.id, day: dayKey() } },
    }),
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
  ]);
  const active = assignments.filter((a) =>
    role === "TEACHER" ? daysLeft(a.dueAt) >= 0 : !a.progress[0]?.completed,
  );
  const urgent = active.filter((a) => daysLeft(a.dueAt) <= 2);
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
          { label: "곧 마감", value: urgent.length, icon: Clock3 },
          {
            label: "완료한 과제",
            value: assignments.length - active.length,
            icon: ClipboardCheck,
          },
          {
            label: "오늘 AI 사용",
            value: `${usage?.count ?? 0}/${dailyLimit(user.plan)}`,
            icon: Sparkles,
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
          { label: "곧 마감", value: urgent.length, icon: Clock3 },
        ];
  return (
    <>
      <Heading
        eyebrow={
          role === "STUDENT" ? "MY SCHOOL, MY PACE" : "TEACHER WORKSPACE"
        }
        title={`안녕하세요, ${user.name}님 👋`}
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
              ? urgent.length
                ? `곧 마감하는 과제가 ${urgent.length}개 있어요`
                : "차근차근, 오늘도 한 걸음"
              : "좋은 수업의 시작, 하나의 클래스"}
          </h2>
          <p>
            {role === "STUDENT"
              ? "작은 일부터 시작해 보세요. 완료한 만큼 여유가 생겨요."
              : "과제를 등록하면 참여한 학생들에게 바로 표시됩니다."}
          </p>
        </div>
        {role === "TEACHER" ? (
          <Link
            className="btn btn-primary"
            href={
              classes[0]
                ? `/teacher/classes/${classes[0].id}/assignments/new`
                : "/teacher/classes/new"
            }
          >
            <Plus size={16} />
            빠른 등록
          </Link>
        ) : (
          <GraduationCap className="hero-symbol" size={48} />
        )}
      </div>
      <div className="grid stats-grid">
        {stats.map((s) => (
          <div className="card stat-card" key={s.label}>
            <div className="stat-icon">
              <s.icon size={18} />
            </div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div>
          {[
            ["긴급 · 오늘 먼저 확인", urgent],
            ["이번 주", week],
            ["나중", later],
          ].map(([label, list]) => {
            const items = list as typeof assignments;
            return (
              <section key={String(label)}>
                <div className="section-heading">
                  <h2>
                    {String(label)}{" "}
                    <span className="count">{items.length}</span>
                  </h2>
                  <Link className="text-link" href={`${base}/assignments`}>
                    전체 보기 <ArrowUpRight size={13} />
                  </Link>
                </div>
                {items.length ? (
                  <div className="assignment-list">
                    {items.slice(0, 4).map((a) => (
                      <AssignmentRow
                        key={a.id}
                        assignment={a}
                        teacher={role === "TEACHER"}
                      />
                    ))}
                  </div>
                ) : (
                  <Empty>해당하는 과제가 없어요.</Empty>
                )}
              </section>
            );
          })}
        </div>
        <aside>
          {role === "STUDENT" && (
            <>
              <div className="section-heading">
                <h2>오늘의 개인 일정</h2>
                <Link className="text-link" href="/student/calendar">
                  캘린더 →
                </Link>
              </div>
              <div className="card card-pad">
                {events.length ? (
                  events.map((event) => (
                    <div className="list-item" key={event.id}>
                      <h4>{event.title}</h4>
                    </div>
                  ))
                ) : (
                  <p className="page-subtitle">
                    오늘 등록된 개인 일정이 없어요.
                  </p>
                )}
              </div>
            </>
          )}
          <div className="section-heading">
            <h2>{role === "STUDENT" ? "AI와 시작하기" : "내 클래스"}</h2>
          </div>
          <div className="card card-pad">
            <div className="stat-icon">
              <Sparkles size={18} />
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
              <ArrowUpRight size={15} />
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
                    <h4>{a.title}</h4>
                    <p>
                      {a.class.subject} · {dday(a.dueAt)}
                    </p>
                  </div>
                  <ArrowUpRight size={15} />
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
              <div className="progress-bar">
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
                플랜 살펴보기 →
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
      _count: { select: { members: true, assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <Heading
        eyebrow="CONNECTED CLASSROOM"
        title="내 클래스"
        description="함께 배우는 공간, 필요한 과제를 한곳에서 확인하세요."
      />
      <div className="section-heading">
        <h2>참여한 수업 {classes.length}</h2>
        {role === "TEACHER" && (
          <Link className="btn btn-primary" href="/teacher/classes/new">
            <Plus size={16} />
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
              <BookOpen size={20} />
            </div>
            <div className="class-head">
              <div>
                <h3>{c.name}</h3>
                <p>
                  {c.subject} · {c.teacher.name} 선생님
                </p>
              </div>
              <ArrowUpRight size={18} />
            </div>
            <div className="class-card-footer">
              <span>학생 {c._count.members}명</span>
              <span>과제 {c._count.assignments}개</span>
            </div>
          </Link>
        ))}
      </div>
      {!classes.length && (
        <Empty>아직 클래스가 없어요. 아래에서 첫 수업을 시작해 보세요.</Empty>
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
            <p>학생에게 아래 코드를 공유해 주세요.</p>
          </div>
          <code className="class-code">{cls.code}</code>
        </div>
      )}
      <div className="section-heading">
        <h2>수업 과제</h2>
        {role === "TEACHER" && (
          <Link
            className="btn btn-primary"
            href={`/teacher/classes/${id}/assignments/new`}
          >
            <Plus size={16} />
            과제 등록
          </Link>
        )}
      </div>
      <div className="assignment-list">
        {cls.assignments.map((a) => (
          <AssignmentRow
            key={a.id}
            assignment={a}
            teacher={role === "TEACHER"}
          />
        ))}
      </div>
      {!cls.assignments.length && <Empty>등록된 과제가 없어요.</Empty>}
      {role === "TEACHER" && (
        <>
          <div className="section-heading">
            <h2>참여 학생 {cls.members.length}명</h2>
          </div>
          <div className="card card-pad">
            {cls.members.length ? (
              cls.members.map((m) => (
                <div className="list-item" key={m.id}>
                  <h4>{m.user.name}</h4>
                  <p>
                    {m.user.school} {m.user.grade && `${m.user.grade}학년`}{" "}
                    {m.user.classroom && `${m.user.classroom}반`}
                  </p>
                </div>
              ))
            ) : (
              <p className="page-subtitle">
                학생이 초대 코드로 참여하면 여기에 표시됩니다.
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}

export async function Assignments({
  role,
  filter = "",
  favorite = false,
}: {
  role: Role;
  filter?: string;
  favorite?: boolean;
}) {
  const user = await requireUser(role);
  const base = `/${role.toLowerCase()}`;
  const list = await db.assignment.findMany({
    where: {
      class: scope(user),
      ...(filter in typeLabels
        ? { type: filter as keyof typeof typeLabels }
        : {}),
      ...(favorite && role === "STUDENT"
        ? { progress: { some: { userId: user.id, favorite: true } } }
        : {}),
    },
    include: { class: true, progress: { where: { userId: user.id } } },
    orderBy: { dueAt: "asc" },
  });
  return (
    <>
      <Heading
        eyebrow="YOUR NEXT STEP"
        title={role === "STUDENT" ? "과제 모아보기" : "과제 관리"}
        description="과제부터 시험, 준비물까지. 마감이 가까운 순서로 정리했어요."
      />
      <div className="filters">
        <Link
          className={`btn ${!filter && !favorite ? "btn-primary" : "btn-secondary"}`}
          href={`${base}/assignments`}
        >
          전체
        </Link>
        {Object.entries(typeLabels).map(([key, label]) => (
          <Link
            className={`btn ${filter === key ? "btn-primary" : "btn-secondary"}`}
            key={key}
            href={`${base}/assignments?type=${key}`}
          >
            {label}
          </Link>
        ))}
        {role === "STUDENT" && (
          <Link
            className={`btn ${favorite ? "btn-primary" : "btn-secondary"}`}
            href={`${base}/assignments?favorite=true`}
          >
            ★ 즐겨찾기
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
      {!list.length && <Empty>조건에 맞는 과제가 없어요.</Empty>}
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
  const assignment = await accessibleAssignment(id, user);
  if (!assignment) notFound();
  const progress =
    role === "STUDENT"
      ? await db.assignmentProgress.findUnique({
          where: { userId_assignmentId: { userId: user.id, assignmentId: id } },
        })
      : null;
  const conversation =
    role === "STUDENT"
      ? await db.aIConversation.findUnique({
          where: { userId_assignmentId: { userId: user.id, assignmentId: id } },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        })
      : null;
  const members =
    role === "TEACHER"
      ? await db.classMember.findMany({
          where: { classId: assignment.classId },
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
  const usage =
    role === "STUDENT"
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
            {assignment.class.name} ↗
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
                label={progress?.completed ? "완료됨 · 취소하기" : "완료 처리"}
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
              <DeleteButton id={id} />
            </>
          )}
        </div>
      </div>
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
              <h2 className="small-heading">첨부파일</h2>
              {assignment.attachments.map((a) => (
                <div className="list-item" key={a.id}>
                  <a className="text-link" href={`/api/attachments/${a.id}`}>
                    {a.name} ↓
                  </a>
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
              <span>나의 상태</span>
              <span>{progress?.completed ? "완료" : "진행 중"}</span>
            </div>
          )}
        </div>
      </div>
      {role === "STUDENT" ? (
        <div id="chat" style={{ marginTop: 24 }}>
          <Chat
            assignmentId={id}
            initialMessages={(conversation?.messages ?? []).map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            }))}
            configured={aiConfigured()}
            initialUsed={usage?.count ?? 0}
            limit={dailyLimit(user.plan)}
          />
        </div>
      ) : (
        <>
          <div className="section-heading">
            <div>
              <h2>학생별 진행 상황</h2>
              <p>
                {members.filter((m) => m.user.progress[0]?.completed).length}/
                {members.length}명 완료 · 완료는 학생의 자기 확인 상태입니다.
              </p>
            </div>
          </div>
          <div className="card card-pad">
            {members.map((m) => (
              <div className="list-item" key={m.id}>
                <div>
                  <h4>{m.user.name}</h4>
                  <p>
                    {m.user.grade && `${m.user.grade}학년`}{" "}
                    {m.user.classroom && `${m.user.classroom}반`}
                  </p>
                </div>
                <span
                  className={`badge ${m.user.progress[0]?.completed ? "badge-green" : "badge-amber"}`}
                >
                  {m.user.progress[0]?.completed ? "완료" : "진행 중"}
                </span>
              </div>
            ))}
            {!members.length && (
              <p className="page-subtitle">아직 참여한 학생이 없습니다.</p>
            )}
          </div>
        </>
      )}
    </>
  );
}

export async function Settings({ role }: { role: Role }) {
  const user = await requireUser(role);
  const usage = await db.aIUsage.findUnique({
    where: { userId_day: { userId: user.id, day: dayKey() } },
  });
  return (
    <>
      <Heading
        eyebrow="MAKE IT YOURS"
        title="설정"
        description="프로필과 나의 플랜을 관리하세요."
      />
      <ProfileForm
        user={{
          name: user.name,
          school: user.school,
          grade: user.grade,
          classroom: user.classroom,
        }}
      />
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
      {role === "STUDENT" && (
        <p className="page-subtitle" style={{ marginTop: 20 }}>
          오늘 {usage?.count ?? 0}/{dailyLimit(user.plan)}회 사용 · 기록된 토큰{" "}
          {usage?.tokens ?? 0}개
        </p>
      )}
    </>
  );
}
