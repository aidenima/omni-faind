import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/auth";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Sign in to continue"
      subtitle="Access your OmniFAIND sourcing & screening workspace."
    >
      <LoginForm />
    </AuthShell>
  );
}
