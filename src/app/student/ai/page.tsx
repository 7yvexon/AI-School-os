import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dailyLimit, dayKey } from "@/lib/domain";
import { Empty, Heading } from "@/components/WorkspaceViews";
import { Sparkles } from "lucide-react";
export default async function Page() {
  const user = await requireUser("STUDENT");
  const [assignments, usage] = await Promise.all([
    db.assignment.findMany({
      where: {
        archivedAt: null,
        class: { members: { some: { userId: user.id, removedAt: null } } },
      },
      include: {
        class: true,
        conversations: {
          where: { userId: user.id },
          include: { _count: { select: { messages: true } } },
        },
      },
      orderBy: { dueAt: "asc" },
    }),
    db.aIUsage.findUnique({
      where: { userId_day: { userId: user.id, day: dayKey() } },
    }),
  ]);
  return (
    <>
      <Heading
        eyebrow="A LITTLE HELP, A BIG STEP"
        title="AI 학습 도우미"
        description="과제를 선택하면 설명과 평가기준을 이해하는 도우미와 대화할 수 있어요."
      />
      <div className="hero-banner">
        <div>
          <h2>
            오늘 {Math.max(0, dailyLimit(user.plan) - (usage?.count ?? 0))}번 더
            질문할 수 있어요
          </h2>
          <p>{user.plan} · 과제마다 대화가 따로 저장됩니다.</p>
        </div>
        <Sparkles className="hero-symbol" size={36} />
      </div>
      <div className="grid class-grid">
        {assignments.map((a) => (
          <Link
            className="card class-card"
            href={`/student/assignments/${a.id}#chat`}
            key={a.id}
          >
            <span className="badge badge-blue">{a.class.subject}</span>
            <h3 style={{ marginTop: 20 }}>{a.title}</h3>
            <p>{a.conversations[0]?._count.messages ?? 0}개의 메시지</p>
            <div className="class-card-footer">
              <span>대화 열기</span>
              <span>↗</span>
            </div>
          </Link>
        ))}
      </div>
      {!assignments.length && (
        <Empty>클래스에 참여하면 과제별 AI 도우미를 사용할 수 있어요.</Empty>
      )}
    </>
  );
}
