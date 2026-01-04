"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { signIn, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  SUBSCRIPTION_PLAN_LIST,
  TRIAL_CREDITS,
  TRIAL_DURATION_DAYS,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptPolicies: boolean;
};

const MIN_PASSWORD_LENGTH = 8;

export const SignupForm = () => {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptPolicies: false,
  });
  const [selectedPlan, setSelectedPlan] =
    useState<SubscriptionPlanId>("STARTER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [formLanguage, setFormLanguage] = useState<"en" | "sr">("en");

  useEffect(() => {
    let mounted = true;
    getProviders().then((providers) => {
      if (mounted) {
        setGoogleEnabled(Boolean(providers?.google));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const locale = navigator.language.toLowerCase();
    setFormLanguage(locale.startsWith("sr") ? "sr" : "en");
  }, []);

  const persistSelectedPlanCookie = (planId: SubscriptionPlanId) => {
    if (typeof document === "undefined") return;
    document.cookie = `omnifaind_selected_plan=${planId}; path=/; max-age=600; SameSite=Lax`;
  };

  const handlePlanSelect = (planId: SubscriptionPlanId) => {
    setSelectedPlan(planId);
    persistSelectedPlanCookie(planId);
  };

  const formatPlanPrice = (amount: number) => {
    try {
      return new Intl.NumberFormat(
        formLanguage === "en" ? "en-US" : "sr-RS",
        {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }
      ).format(amount);
    } catch {
      return `€${amount}`;
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!formState.acceptPolicies) {
      setError(
        formLanguage === "en"
          ? "Please confirm you have read and accept the Privacy Policy and Terms of Service."
          : "Molimo potvrdi da si procitao/la i prihvatio/la Politiku privatnosti i Uslove koriscenja."
      );
      return;
    }

    if (formState.password !== formState.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formState.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name,
          email: formState.email,
          password: formState.password,
          plan: selectedPlan,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Unable to create account.");
        setIsSubmitting(false);
        return;
      }

      const result = await signIn("credentials", {
        redirect: false,
        email: formState.email,
        password: formState.password,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError("Account created but auto-login failed. Please sign in.");
        setIsSubmitting(false);
        return;
      }

      router.push(result?.url ?? "/dashboard");
    } catch (err) {
      console.error("[signup] Failed to register", err);
      setError("Unexpected error. Please try again.");
      setIsSubmitting(false);
    }
  };

  const setOauthIntentCookie = (intent: "signup" | "signin") => {
    if (typeof document === "undefined") return;
    document.cookie = `omnifaind_oauth_intent=${intent}; path=/; max-age=600; SameSite=Lax`;
  };

  const handleGoogleSignIn = () => {
    setError(null);
    persistSelectedPlanCookie(selectedPlan);
    setOauthIntentCookie("signup");
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const planSectionTitle =
    formLanguage === "en" ? "Choose your plan" : "Izaberi paket";
  const planSectionSubtitle =
    formLanguage === "en"
      ? `Every plan starts with ${TRIAL_CREDITS} credits during the ${TRIAL_DURATION_DAYS}-day trial.`
      : `Svaki plan pocinje sa ${TRIAL_CREDITS} kredita tokom ${TRIAL_DURATION_DAYS}-odnevnog trial perioda.`;
  const planSectionNote =
    formLanguage === "en"
      ? "Trial credits are the same no matter which plan you pick."
      : "Trial krediti su isti bez obzira na paket.";

  return (
    <div className="space-y-6">
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-medium text-slate-50 transition hover:border-sky-500 hover:text-sky-100"
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
            <span>or create with email</span>
            <span className="h-px flex-1 bg-slate-800" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-100">
              {planSectionTitle}
            </p>
            <p className="text-xs text-slate-400">{planSectionSubtitle}</p>
            <p className="text-xs text-slate-500">{planSectionNote}</p>
          </div>
          <div
            role="radiogroup"
            aria-label={planSectionTitle}
            className="grid gap-3 sm:grid-cols-3"
          >
            {SUBSCRIPTION_PLAN_LIST.map((planOption) => {
              const isSelected = selectedPlan === planOption.id;
              return (
                <label
                  key={planOption.id}
                  className={`flex cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-sky-500 bg-slate-900/80"
                      : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="subscriptionPlan"
                    value={planOption.id}
                    checked={isSelected}
                    onChange={() => handlePlanSelect(planOption.id)}
                    className="sr-only"
                  />
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {planOption.label}
                  </p>
                  <p className="text-2xl font-semibold text-slate-50">
                    {formatPlanPrice(planOption.monthlyPrice)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formLanguage === "en"
                      ? `${planOption.monthlyCredits} credits / month after trial`
                      : `${planOption.monthlyCredits} kredita mesecno nakon trial perioda`}
                  </p>
                </label>
              );
            })}
          </div>
        </section>

        <label className="block text-sm text-slate-300">
          {formLanguage === "en" ? "Full name" : "Ime i prezime"}
          <input
            type="text"
            value={formState.name}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder={
              formLanguage === "en" ? "Full name" : "Ime i prezime"
            }
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-base text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </label>

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
            placeholder="Minimum 8 characters"
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-base text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Confirm password
          <input
            type="password"
            required
            value={formState.confirmPassword}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                confirmPassword: event.target.value,
              }))
            }
            placeholder="Repeat password"
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-base text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </label>

        <label className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={formState.acceptPolicies}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                acceptPolicies: event.target.checked,
              }))
            }
            className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500"
            required
          />
          <span>
            {formLanguage === "en"
              ? "I have read and accept the Privacy Policy and Terms of Service."
              : "Procitao/la sam i prihvatam Politiku privatnosti i Uslove koriscenja."}{" "}
            <Link
              href="/#privacy"
              className="text-sky-400 underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer noopener"
            >
              {formLanguage === "en" ? "Privacy Policy" : "Politika privatnosti"}
            </Link>{" "}
            &nbsp;/&nbsp;
            <Link
              href="/#terms"
              className="text-sky-400 underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer noopener"
            >
              {formLanguage === "en" ? "Terms of Service" : "Uslovi koriscenja"}
            </Link>
          </span>
        </label>

        {error && (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-slate-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-sky-400 hover:text-sky-300 underline-offset-4 hover:underline"
        >
          Sign in here.
        </Link>
      </p>
    </div>
  );
};
