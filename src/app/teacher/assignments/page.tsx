import { Assignments } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "과제 관리",
  "클래스 과제를 유형별로 찾아 관리하세요.",
);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string | string[];
    favorite?: string | string[];
    q?: string | string[];
  }>;
}) {
  const query = await searchParams;
  return (
    <Assignments
      role="TEACHER"
      filter={typeof query.type === "string" ? query.type : undefined}
      favorite={query.favorite === "true"}
      query={typeof query.q === "string" ? query.q : ""}
    />
  );
}
