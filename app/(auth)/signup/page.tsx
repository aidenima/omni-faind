import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { auth } from "@/auth";

export default async function SignupPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Create your OmniFAIND account"
      subtitle="Start the 7-day trial, run sourcing searches, and unlock AI screening."
    >
      <SignupForm />
    </AuthShell>
  );
}
