import { ProductCinema } from "@/components/ProductCinema";
import type { Metadata } from "next";
import "../cinema.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function FilmRenderPage() {
  return (
    <main className="film-render-page">
      <ProductCinema />
    </main>
  );
}
