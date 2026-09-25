import type { Metadata } from "next";

const previewImage = "/media/school-film-poster.jpg";

export function pageMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: "AI School OS",
      title,
      description,
      images: [
        {
          url: previewImage,
          width: 1280,
          height: 720,
          alt: "AI School OS 학교 과제 관리 서비스 미리보기",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [previewImage],
    },
  };
}
