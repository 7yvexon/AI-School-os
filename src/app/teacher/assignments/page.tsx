import { Assignments } from "@/components/WorkspaceViews";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string | string[];
    favorite?: string | string[];
  }>;
}) {
  const query = await searchParams;
  return (
    <Assignments
      role="TEACHER"
      filter={typeof query.type === "string" ? query.type : undefined}
      favorite={query.favorite === "true"}
    />
  );
}
