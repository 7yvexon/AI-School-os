import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dayKey } from "@/lib/domain";
import { Heading } from "@/components/WorkspaceViews";
import { EventForm } from "@/components/EventForm";
import { DeleteButton } from "@/components/DeleteButton";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser("STUDENT");
  const { month } = await searchParams;
  const selected =
    month && /^20\d{2}-(0[1-9]|1[0-2])$/.test(month)
      ? month
      : dayKey().slice(0, 7);
  const [year, m] = selected.split("-").map(Number);
  const first = new Date(Date.UTC(year, m - 1, 1));
  const next = new Date(Date.UTC(year, m, 1));
  const from = new Date(`${selected}-01T00:00:00+09:00`);
  const until = new Date(next.getTime() - 9 * 3600000);
  const [assignments, events] = await Promise.all([
    db.assignment.findMany({
      where: {
        class: { members: { some: { userId: user.id } } },
        dueAt: { gte: from, lt: until },
      },
    }),
    db.personalEvent.findMany({
      where: { userId: user.id, dueAt: { gte: from, lt: until } },
      orderBy: { dueAt: "asc" },
    }),
  ]);
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const start = first.getUTCDay();
  const cells = Math.ceil((start + count) / 7) * 7;
  const prevMonth = new Date(Date.UTC(year, m - 2, 1))
    .toISOString()
    .slice(0, 7);
  const nextMonth = next.toISOString().slice(0, 7);
  return (
    <>
      <Heading
        eyebrow="ONE MONTH AT A GLANCE"
        title="나의 캘린더"
        description="수업 일정과 개인 일정을 한눈에 확인하세요."
      />
      <div className="section-heading">
        <h2>
          {year}년 {m}월
        </h2>
        <div className="filters" style={{ margin: 0 }}>
          <Link
            className="btn btn-secondary"
            aria-label="이전 달"
            href={`?month=${prevMonth}`}
          >
            ←
          </Link>
          <Link className="btn btn-secondary" href="/student/calendar">
            이번 달
          </Link>
          <Link
            className="btn btn-secondary"
            aria-label="다음 달"
            href={`?month=${nextMonth}`}
          >
            →
          </Link>
        </div>
      </div>
      <div className="calendar">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div className="calendar-weekday" key={d}>
            {d}
          </div>
        ))}
        {Array.from({ length: cells }, (_, i) => {
          const day = i - start + 1;
          const valid = day > 0 && day <= count;
          const key = `${selected}-${String(day).padStart(2, "0")}`;
          return (
            <div
              className={`calendar-day ${valid ? "" : "empty-day"} ${key === dayKey() ? "today" : ""}`}
              key={i}
            >
              {valid && (
                <>
                  <div className="calendar-day-number">{day}</div>
                  {assignments
                    .filter((a) => dayKey(a.dueAt) === key)
                    .map((a) => (
                      <Link
                        className="calendar-event"
                        style={{ display: "block" }}
                        title={a.title}
                        href={`/student/assignments/${a.id}`}
                        key={a.id}
                      >
                        {a.title}
                      </Link>
                    ))}
                  {events
                    .filter((e) => dayKey(e.dueAt) === key)
                    .map((e) => (
                      <div
                        className="calendar-event personal"
                        title={e.title}
                        key={e.id}
                      >
                        {e.title}
                      </div>
                    ))}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="section-heading">
        <h2>개인 일정 추가</h2>
      </div>
      <EventForm />
      <div className="section-heading">
        <h2>이번 달 개인 일정</h2>
      </div>
      <div className="card card-pad">
        {events.length ? (
          events.map((e) => (
            <div className="list-item" key={e.id}>
              <div>
                <h4>{e.title}</h4>
                <p>{dayKey(e.dueAt)}</p>
              </div>
              <DeleteButton id={e.id} op="event-delete" label="일정 삭제" />
            </div>
          ))
        ) : (
          <p className="page-subtitle">아직 개인 일정이 없어요.</p>
        )}
      </div>
    </>
  );
}
