import { AuthForm } from "@/components/AuthForm";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata = {
  ...pageMetadata(
    "회원가입",
    "AI School OS에서 학생 또는 선생님 계정을 만드세요.",
  ),
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AuthForm mode="register" />;
}
