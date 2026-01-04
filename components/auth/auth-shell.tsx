import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  note?: string;
};

const defaultNote =
  "Every new account starts with 15 sourcing credits. Each AI sourcing search consumes 1 credit.";

export const AuthShell = ({
  title,
  subtitle,
  children,
  note = defaultNote,
}: AuthShellProps) => (
  <main className="min-h-screen bg-slate-950 text-slate-50">
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-3"
        aria-label="Back to OmniFAIND landing"
      >
        <Image
          src="/OmniFAIND-logo.png"
          alt="OmniFAIND"
          width={180}
          height={60}
          className="h-12 w-auto"
          priority
        />
      </Link>

      <section className="w-full rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-[0_20px_50px_rgba(14,165,233,0.15)]">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="mt-8">{children}</div>
        <p className="mt-10 text-center text-xs text-slate-500">{note}</p>
      </section>
    </div>
  </main>
);
