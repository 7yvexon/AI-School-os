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
  const filter = typeof query.type === "string" ? query.type : undefined;
  return (
    <Assignments
      role="STUDENT"
      filter={filter}
      favorite={query.favorite === "true"}
    />
  );
}
