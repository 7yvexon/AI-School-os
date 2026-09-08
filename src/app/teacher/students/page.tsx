import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Empty, Heading } from "@/components/WorkspaceViews";
export default async function Page() {
  const user = await requireUser("TEACHER");
  const classes = await db.class.findMany({
    where: { teacherId: user.id },
    include: {
      members: {
        include: {
          user: {
            select: { name: true, school: true, grade: true, classroom: true },
          },
        },
      },
    },
  });
  return (
    <>
      <Heading
        title="학생 현황"
        description="내 클래스에 참여한 학생들을 확인하세요."
      />
      {classes.map((c) => (
        <section key={c.id}>
          <div className="section-heading">
            <h2>
              {c.name} · {c.members.length}명
            </h2>
          </div>
          <div className="card card-pad">
            {c.members.map((m) => (
              <div className="list-item" key={m.id}>
                <h4>{m.user.name}</h4>
                <p>
                  {m.user.school} {m.user.grade}학년 {m.user.classroom}반
                </p>
              </div>
            ))}
            {!c.members.length && (
              <p className="page-subtitle">아직 참여한 학생이 없습니다.</p>
            )}
          </div>
        </section>
      ))}
      {!classes.length && <Empty>클래스를 만들고 학생을 초대해 주세요.</Empty>}
    </>
  );
}
