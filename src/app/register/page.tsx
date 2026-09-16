import { AuthForm } from "@/components/AuthForm";
import { teacherSignupEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main id="main-content">
      <AuthForm mode="register" teacherSignupEnabled={teacherSignupEnabled()} />
    </main>
  );
}
