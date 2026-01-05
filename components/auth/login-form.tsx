"use client";

import Image from "next/image";
import { useState, FormEvent, useEffect } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type FormState = {
  email: string;
  password: string;
};

export const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formState, setFormState] = useState<FormState>({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getProviders()
      .then((providers) => {
        if (mounted) {
          setGoogleEnabled(Boolean(providers?.google));
          if (!providers?.google) {
            setGoogleError(
              "Google sign-in is unavailable. Check OAuth credentials."
            );
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setGoogleError(
            "Google sign-in is unavailable. Check OAuth credentials."
          );
        }
      });

    const errorParam = searchParams.get("error");
    if (errorParam === "device-limit") {
      setError("Maximum number of devices reached for this account.");
    }

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      redirect: false,
      email: formState.email,
      password: formState.password,
      callbackUrl: "/dashboard",
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    router.push(result?.url ?? "/dashboard");
  };

  const setOauthIntentCookie = (intent: "signup" | "signin") => {
    if (typeof document === "undefined") return;
    document.cookie = `omnifaind_oauth_intent=${intent}; path=/; max-age=600; SameSite=Lax`;
  };

  const handleGoogleSignIn = () => {
    setError(null);
    setOauthIntentCookie("signin");
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="space-y-6">
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-medium text-slate-50 transition hover:border-sky-500 hover:text-sky-100"
            aria-disabled={!googleEnabled}
          >
            <Image
              src="/google-logo.svg"
              alt="Google logo"
              width={20}
              height={20}
              className="h-5 w-5"
              priority
            />
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-800" />
            <span>or use email</span>
            <span className="h-px flex-1 bg-slate-800" />
          </div>

          {googleError && (
            <p className="text-xs text-amber-400" role="alert">
              {googleError}
            </p>
          )}
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm text-slate-300">
          Email
          <input
            type="email"
            required
            value={formState.email}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, email: event.target.value }))
            }
            placeholder="you@example.com"
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-base text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Password
          <input
            type="password"
            required
            value={formState.password}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                password: event.target.value,
              }))
            }
            placeholder="••••••••"
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-base text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </label>

        {error && (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-sky-500 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-slate-400">
        Need an account?{" "}
        <Link
          href="/signup"
          className="text-sky-400 hover:text-sky-300 underline-offset-4 hover:underline"
        >
          Create one for free.
        </Link>
      </p>
    </div>
  );
};
