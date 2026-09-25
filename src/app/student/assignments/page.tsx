import { Assignments } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "과제 모아보기",
  "과제 유형과 마감일을 기준으로 과제를 확인하세요.",
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
  const filter = typeof query.type === "string" ? query.type : undefined;
  return (
    <Assignments
      role="STUDENT"
      filter={filter}
      favorite={query.favorite === "true"}
      query={typeof query.q === "string" ? query.q : ""}
    />
  );
}
