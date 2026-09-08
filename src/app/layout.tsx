import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "AI School OS · 학교생활을 가볍게",
    template: "%s | AI School OS",
  },
  description:
    "과제, 수행평가, 시험 일정부터 AI 학습 도우미까지. 학생과 선생님을 연결하는 하나의 공간.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main-content">
          본문으로 바로가기
        </a>
        {children}
      </body>
    </html>
  );
}
