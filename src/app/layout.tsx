import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "AI School OS · 학교 과제와 학습 관리",
    template: "%s | AI School OS",
  },
  description:
    "학생과 선생님이 과제, 일정, 제출과 피드백을 관리하고 AI 학습 도우미를 이용하는 학교 학습 공간.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "AI School OS",
    title: "AI School OS · 학교 과제와 학습 관리",
    description:
      "학생과 선생님이 과제, 일정, 제출과 피드백을 관리하고 AI 학습 도우미를 이용하는 학교 학습 공간.",
    images: [
      {
        url: "/media/school-film-poster.jpg",
        width: 1280,
        height: 720,
        alt: "AI School OS 학교 과제 관리 서비스 미리보기",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI School OS · 학교 과제와 학습 관리",
    description:
      "학생과 선생님이 과제, 일정, 제출과 피드백을 관리하고 AI 학습 도우미를 이용하는 학교 학습 공간.",
    images: ["/media/school-film-poster.jpg"],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          본문으로 바로가기
        </a>
        {children}
      </body>
    </html>
  );
}
