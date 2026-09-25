import { ProductCinema } from "@/components/ProductCinema";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../cinema.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function FilmRenderPage({
  searchParams,
}: {
  searchParams: Promise<{
    "film-render"?: string | string[] | undefined;
  }>;
}) {
  const params = await searchParams;
  if (process.env.NODE_ENV === "production" || params["film-render"] !== "1")
    notFound();

  return (
    <main id="main-content" className="film-render-page" tabIndex={-1}>
      <ProductCinema renderMode />
    </main>
  );
}
