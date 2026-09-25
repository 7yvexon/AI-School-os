import Link from "next/link";
import { Star, Check } from "lucide-react";
import { dday, daysLeft, typeLabels } from "@/lib/domain";
type AssignmentWithClass = {
  id: string;
  title: string;
  description: string;
  dueAt: Date;
  type: keyof typeof typeLabels;
  class: { name: string; subject: string };
  progress?: { completed: boolean; favorite: boolean }[];
};
export function AssignmentRow({
  assignment,
  teacher = false,
}: {
  assignment: AssignmentWithClass;
  teacher?: boolean;
}) {
  const progress = assignment.progress?.[0];
  const due = dday(assignment.dueAt);
  const urgent = daysLeft(assignment.dueAt) <= 2;
  const typeLabel = typeLabels[assignment.type];
  return (
    <Link
      className="assignment-row"
      href={
        teacher
          ? `/teacher/assignments/${assignment.id}`
          : `/student/assignments/${assignment.id}`
      }
    >
      <div className="assignment-date">
        <strong>
          {new Intl.DateTimeFormat("ko-KR", {
            day: "numeric",
            timeZone: "Asia/Seoul",
          }).format(assignment.dueAt)}
        </strong>
        <small>
          {new Date(assignment.dueAt).toLocaleDateString("ko-KR", {
            month: "short",
            timeZone: "Asia/Seoul",
          })}
        </small>
      </div>
      <div className="assignment-main">
        <h3>{assignment.title}</h3>
        <p>
          {assignment.class.subject} · {assignment.class.name}
        </p>
      </div>
      <div className="assignment-meta">
        {progress?.favorite && (
          <span className="assignment-row-status">
            <Star size={15} fill="#eab308" color="#eab308" aria-hidden="true" />
            즐겨찾기
          </span>
        )}
        <span className="badge">{typeLabel}</span>
        <span className={`badge ${urgent ? "badge-red" : "badge-blue"}`}>
          {due}
        </span>
        {progress?.completed && (
          <span className="assignment-row-status is-done">
            <Check size={14} aria-hidden="true" />
            진행 완료
          </span>
        )}
      </div>
    </Link>
  );
}
