import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  // Server-side guard in case middleware is bypassed (e.g., stale cookies or proxy quirks)
  if (!session?.user?.id) {
    const callbackUrl = "/dashboard";
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return <>{children}</>;
}
