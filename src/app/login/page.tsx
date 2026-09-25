import { AuthForm } from "@/components/AuthForm";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata = {
  ...pageMetadata("로그인", "AI School OS 계정에 로그인하세요."),
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AuthForm mode="login" />;
}
