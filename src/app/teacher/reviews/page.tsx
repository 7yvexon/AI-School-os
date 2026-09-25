import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Heading } from "@/components/WorkspaceViews";
import { SubmissionReviewForm } from "@/components/SubmissionReviewForm";
import { pageMetadata } from "@/lib/page-metadata";

const pageSize = 20;
export const metadata = pageMetadata(
  "검토 대기 제출",
  "선생님 클래스의 미검토 제출물을 확인하세요.",
);

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser("TEACHER");
  const query = await searchParams;
  const pageValue = Number(query.page ?? "1");
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const where = {
    status: "SUBMITTED" as const,
    assignment: { class: { teacherId: user.id } },
  };
  const [total, submissions] = await Promise.all([
    db.submission.count({ where }),
    db.submission.findMany({
      where,
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            archivedAt: true,
            class: { select: { name: true } },
          },
        },
        student: { select: { name: true, grade: true, classroom: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { reviewer: { select: { name: true } } },
        },
      },
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <Heading
        eyebrow="REVIEW QUEUE"
        title="검토 대기 제출"
        description={`오래된 제출부터 확인합니다. 전체 ${total}건 · 페이지 ${page}/${lastPage}`}
      />
      {submissions.length ? (
        <div className="review-queue-list">
          {submissions.map((submission) => (
            <section className="card card-pad" key={submission.id}>
              <div className="section-heading">
                <div>
                  <Link
                    className="text-link"
                    href={`/teacher/assignments/${submission.assignment.id}#submission-review`}
                  >
                    {submission.assignment.class.name} ·{" "}
                    {submission.assignment.title}
                  </Link>
                  {submission.assignment.archivedAt && (
                    <p className="form-hint">보관된 과제의 제출입니다.</p>
                  )}
                </div>
              </div>
              <SubmissionReviewForm
                submissionId={submission.id}
                studentName={submission.student.name}
                studentMeta={`${submission.student.grade ? `${submission.student.grade}학년` : ""}${submission.student.grade && submission.student.classroom ? " " : ""}${submission.student.classroom ? `${submission.student.classroom}반` : ""}`}
                content={submission.content}
                status={submission.status}
                feedback={submission.feedback}
                submittedAt={submission.submittedAt.toISOString()}
                updatedAt={submission.updatedAt.toISOString()}
                reviews={submission.reviews.map((review) => ({
                  id: review.id,
                  status:
                    review.status === "RETURNED" ? "RETURNED" : "REVIEWED",
                  feedback: review.feedback,
                  submissionContent: review.submissionContent,
                  createdAt: review.createdAt.toISOString(),
                  reviewerName: review.reviewer.name,
                }))}
              />
            </section>
          ))}
        </div>
      ) : (
        <div className="empty card card-pad">
          <h2>검토할 제출이 없습니다</h2>
          <p>새 제출이 도착하면 이 목록에 표시됩니다.</p>
          <Link className="btn btn-secondary" href="/teacher/dashboard">
            대시보드로 돌아가기
          </Link>
        </div>
      )}
      {lastPage > 1 && (
        <nav className="pagination" aria-label="검토 대기 페이지">
          {page > 1 ? (
            <Link
              className="btn btn-secondary"
              href={`/teacher/reviews?page=${page - 1}`}
            >
              이전 20건
            </Link>
          ) : (
            <span />
          )}
          {page < lastPage && (
            <Link
              className="btn btn-secondary"
              href={`/teacher/reviews?page=${page + 1}`}
            >
              다음 20건
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
