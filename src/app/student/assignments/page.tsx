import { Assignments } from "@/components/WorkspaceViews";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; favorite?: string }>;
}) {
  const query = await searchParams;
  return (
    <Assignments
      role="STUDENT"
      filter={query.type}
      favorite={query.favorite === "true"}
    />
  );
}
