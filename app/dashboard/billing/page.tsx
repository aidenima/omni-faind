"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  DEFAULT_SUBSCRIPTION_PLAN,
  getPlanLabel,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";

type CreditPack = {
  id: string;
  label: string;
  description: string;
  credits: number;
  price: number;
};

type CouponResponse = {
  code: string;
  discountType: "percent" | "fixed";
  amount: number;
  currency: string | null;
  label: string;
};

type BillingCycle = "monthly" | "yearly";

type SubscriptionPlanOption = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  monthlyCredits: number;
  badge?: string;
};

const CREDIT_PACKS: CreditPack[] = [
  { id: "credit-50", label: "50 credits", description: "", credits: 50, price: 15 },
  { id: "credit-100", label: "100 credits", description: "", credits: 100, price: 28 },
  { id: "credit-200", label: "200 credits", description: "", credits: 200, price: 54 },
  { id: "credit-400", label: "400 credits", description: "", credits: 400, price: 100 },
  { id: "credit-1000", label: "1,000 credits", description: "", credits: 1000, price: 230 },
];

const SUBSCRIPTION_PLANS: SubscriptionPlanOption[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Focused sourcing runs for solo recruiters getting started with AI.",
    monthlyPrice: 27,
    monthlyCredits: 100,
  },
  {
    id: "pro",
    name: "Pro",
    description: "More automation, higher limits, and priority processing for teams.",
    monthlyPrice: 98,
    monthlyCredits: 400,
    badge: "Popular",
  },
  {
    id: "agency",
    name: "Agency",
    description: "Enterprise-scale credits, premium support, and custom integrations.",
    monthlyPrice: 789,
    monthlyCredits: 5000,
    badge: "Best value",
  },
];

const copy = {
  billing: "Billing",
  buyCredits: "Buy credits",
  description:
    "Checkout is handled via Lemon Squeezy. Choose a plan or credit pack and we will send you to their secure checkout.",
  accountLine: "Account",
  planLine: "Plan",
  creditsLeft: "Credits left",
  tabPlans: "Subscription plans",
  tabPacks: "Credit packs",
  back: "Back to dashboard",
  choosePlan: "Choose your plan",
  choosePlanDesc:
    "Pick between monthly or yearly billing. Yearly plans include an additional 20% discount and all credits upfront.",
  monthly: "Monthly",
  yearly: "Yearly (-20%)",
  perMonth: "per month",
  perYear: "per year (paid upfront)",
  creditsIncluded: "credits included",
  pickPack: "Pick a credit pack",
  pickPackDesc:
    "Credits activate instantly once the payment is confirmed. Larger packs carry lower cost per credit.",
  coupon: "Coupon",
  couponHint:
    "If you received a personalized discount code, enter and apply it here.",
  couponPlaceholder: "Enter coupon code",
  applyCoupon: "Apply coupon",
  applyingCoupon: "Applying...",
  removeCoupon: "Remove",
  checkout: "Checkout",
  checkoutDesc:
    "You will finish payment on the Lemon Squeezy checkout and receive an invoice there.",
  checkoutCta: "Continue to Lemon Squeezy checkout",
  selection: "Selection",
  subtotal: "Subtotal",
  total: "Total",
  vat: "VAT / Fees",
  vatNote: "Calculated by the PSP",
  noteFallback: "Select a plan or pack to see pricing details.",
  linkedAccount: "Linked account",
  nextSteps: "Next steps",
  step1: "Click the checkout button to open Lemon Squeezy.",
  step2: "Complete payment there; 3-D Secure handled by PSP.",
  step3: "Credits will be added immediately after confirmation.",
} as const;

const formatCurrency = (value: number) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `€${value}`;
  }
};

const getPlanPrice = (plan: SubscriptionPlanOption, cycle: BillingCycle) =>
  cycle === "monthly" ? plan.monthlyPrice : Math.round(plan.monthlyPrice * 12 * 0.8);

const getOriginalPrice = (price: number) => price * 2;

const getPlanCredits = (plan: SubscriptionPlanOption, cycle: BillingCycle) =>
  plan.monthlyCredits * (cycle === "monthly" ? 1 : 12);

export default function BillingPage() {
  const { data: session } = useSession();
  const activePlanId: SubscriptionPlanId =
    (session?.user?.subscriptionPlan as SubscriptionPlanId | undefined) ??
    DEFAULT_SUBSCRIPTION_PLAN;
  const planDisplayName = getPlanLabel(activePlanId);
  const userDisplayName =
    session?.user?.name || session?.user?.email || "Account";
  const creditsRemainingRaw = session?.user?.creditsRemaining ?? 0;
  const formatCredits = (value: number) =>
    Number.isInteger(value) ? value.toString() : value.toFixed(1);
  const creditsRemaining = formatCredits(creditsRemainingRaw);

  const [purchaseType, setPurchaseType] = useState<"plan" | "pack">("plan");
  const [selectedPlanId, setSelectedPlanId] = useState(
    SUBSCRIPTION_PLANS[0]?.id ?? ""
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedPackId, setSelectedPackId] = useState(
    CREDIT_PACKS[0]?.id ?? ""
  );
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResponse | null>(null);
  const [couponStatus, setCouponStatus] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const t = copy;

  const selectedPack = useMemo(
    () => CREDIT_PACKS.find((pack) => pack.id === selectedPackId),
    [selectedPackId]
  );
  const selectedPlan = useMemo(
    () => SUBSCRIPTION_PLANS.find((plan) => plan.id === selectedPlanId),
    [selectedPlanId]
  );

  const summaryDetails = useMemo(() => {
    if (purchaseType === "plan" && selectedPlan) {
      const price = getPlanPrice(selectedPlan, billingCycle);
      const original = getOriginalPrice(price);
      const credits = getPlanCredits(selectedPlan, billingCycle);
      return {
        label: `${selectedPlan.name} plan`,
        subLabel:
          billingCycle === "monthly"
            ? t.monthly
            : t.yearly,
        priceValue: price,
        price: formatCurrency(price),
        originalPrice: formatCurrency(original),
        credits: credits.toLocaleString(),
        note: "Subscription renews automatically each period.",
        currency: "EUR",
      };
    }
    if (purchaseType === "pack" && selectedPack) {
      const original = getOriginalPrice(selectedPack.price);
      return {
        label: `${selectedPack.label} credit pack`,
        subLabel: "One-time top-up",
        priceValue: selectedPack.price,
        price: formatCurrency(selectedPack.price),
        originalPrice: formatCurrency(original),
        credits: selectedPack.credits.toLocaleString(),
        note: "Credits are added instantly after confirmation.",
        currency: "EUR",
      };
    }
    return null;
  }, [billingCycle, purchaseType, selectedPack, selectedPlan, t.monthly, t.yearly]);

  const discountedSummary = useMemo(() => {
    if (!summaryDetails) return null;
    const base = summaryDetails.priceValue ?? 0;
    if (!appliedCoupon) {
      return {
        ...summaryDetails,
        discountValue: 0,
        totalValue: base,
        totalPrice: formatCurrency(base),
      };
    }
    let discountValue = 0;
    if (appliedCoupon.discountType === "percent") {
      discountValue = Math.min(Math.max(appliedCoupon.amount, 0), 100);
      discountValue = (base * discountValue) / 100;
    } else {
      if (
        appliedCoupon.currency &&
        appliedCoupon.currency.toUpperCase() !== (summaryDetails.currency ?? "EUR")
      ) {
        discountValue = 0;
      } else {
        discountValue = appliedCoupon.amount;
      }
    }
    const totalValue = Math.max(0, base - discountValue);
    return {
      ...summaryDetails,
      discountValue,
      totalValue,
      discountPrice: discountValue > 0 ? `- ${formatCurrency(discountValue)}` : undefined,
      totalPrice: formatCurrency(totalValue),
    };
  }, [appliedCoupon, summaryDetails]);

  const buildCheckoutUrl = () => {
    const params = new URLSearchParams();
    params.set("type", purchaseType);
    if (purchaseType === "plan") {
      params.set("planId", selectedPlanId);
      params.set("cycle", billingCycle);
    } else {
      params.set("packId", selectedPackId);
    }
    return `/api/lemon/checkout?${params.toString()}`;
  };

  const handleCheckout = () => {
    const url = buildCheckoutUrl();
    window.location.href = url;
  };

  const handleApplyCoupon = async () => {
    const trimmed = couponCode.trim();
    if (!trimmed) {
      setCouponError("Enter a coupon code.");
      return;
    }
    setIsApplyingCoupon(true);
    setCouponError(null);
    setCouponStatus(null);

    const planForValidation = purchaseType === "plan" ? selectedPlanId : selectedPackId;

    try {
      const response = await fetch("/api/billing/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: trimmed, plan: planForValidation }),
      });
      const payload = (await response.json().catch(() => null)) as {
        valid?: boolean;
        error?: string;
        code?: string;
        discountType?: "percent" | "fixed";
        amount?: number;
        currency?: string | null;
        label?: string;
      } | null;

      if (!response.ok || !payload?.valid) {
        throw new Error(payload?.error || "Coupon is not valid.");
      }

      if (
        payload.discountType === "fixed" &&
        payload.currency &&
        payload.currency.toUpperCase() !== "EUR"
      ) {
        throw new Error("Coupon currency is not supported for this purchase.");
      }

      setAppliedCoupon({
        code: payload.code!,
        discountType: payload.discountType ?? "percent",
        amount: payload.amount ?? 0,
        currency: payload.currency ?? null,
        label: payload.label || "Coupon applied",
      });
      setCouponStatus(payload.label || "Coupon applied.");
    } catch (error) {
      setAppliedCoupon(null);
      setCouponStatus(null);
      setCouponError(error instanceof Error ? error.message : "Coupon is not valid.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponStatus(null);
    setCouponError(null);
    setCouponCode("");
  };

  useEffect(() => {
    setAppliedCoupon(null);
    setCouponStatus(null);
    setCouponError(null);
  }, [purchaseType, selectedPlanId, selectedPackId, billingCycle]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t.billing}</p>
            <h1 className="text-3xl font-semibold text-slate-50">{t.buyCredits}</h1>
            <p className="text-sm text-slate-400 max-w-2xl">{t.description}</p>
            <p className="text-xs text-slate-500">
              {t.accountLine}: {userDisplayName} | {t.planLine}: {planDisplayName} | {t.creditsLeft}: {creditsRemaining}
            </p>
            <div className="mt-4 inline-flex rounded-full border border-slate-800 bg-slate-950/70 p-1 text-xs">
              <button
                type="button"
                onClick={() => setPurchaseType("plan")}
                className={`rounded-full px-4 py-1 font-semibold transition ${
                  purchaseType === "plan"
                    ? "bg-sky-500 text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.tabPlans}
              </button>
              <button
                type="button"
                onClick={() => setPurchaseType("pack")}
                className={`rounded-full px-4 py-1 font-semibold transition ${
                  purchaseType === "pack"
                    ? "bg-sky-500 text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.tabPacks}
              </button>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-500 hover:text-sky-200"
          >
            ↩ {t.back}
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <form className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <section className="space-y-4">
              {purchaseType === "plan" ? (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t.choosePlan}</p>
                    <p className="text-sm text-slate-400">{t.choosePlanDesc}</p>
                  </div>
                  <div className="inline-flex rounded-full border border-slate-800 bg-slate-950/60 p-1 text-xs">
                    {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => (
                      <button
                        key={cycle}
                        type="button"
                        onClick={() => setBillingCycle(cycle)}
                        className={`rounded-full px-4 py-1 font-semibold transition ${
                          billingCycle === cycle
                            ? "bg-sky-500 text-slate-950"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {cycle === "monthly" ? t.monthly : t.yearly}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {SUBSCRIPTION_PLANS.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      const price = getPlanPrice(plan, billingCycle);
                      const original = getOriginalPrice(price);
                      const credits = getPlanCredits(plan, billingCycle);
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            isSelected
                              ? "border-sky-500 bg-slate-900 text-slate-50 shadow-[0_20px_45px_rgba(14,165,233,0.25)]"
                              : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{plan.name}</p>
                            {plan.badge && (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
                                {plan.badge}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-center">
                            <p className="text-3xl font-semibold text-slate-50">{formatCurrency(price)}</p>
                            <p className="text-sm font-semibold text-slate-200">
                              <span className="line-through decoration-2 decoration-slate-400">
                                {formatCurrency(original)}
                              </span>{" "}
                              <span className="text-slate-400">Original</span>
                            </p>
                          </div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                            {billingCycle === "monthly" ? t.perMonth : t.perYear}
                          </p>
                          <p className="text-sm text-slate-400">{plan.description}</p>
                          <p className="text-sm font-semibold text-emerald-400">
                            {credits.toLocaleString()} {t.creditsIncluded}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t.pickPack}</p>
                    <p className="text-sm text-slate-400">{t.pickPackDesc}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {CREDIT_PACKS.map((pack) => {
                      const isSelected = selectedPackId === pack.id;
                      const original = getOriginalPrice(pack.price);
                      return (
                        <button
                          key={pack.id}
                          type="button"
                          onClick={() => {
                            setSelectedPackId(pack.id);
                            setPurchaseType("pack");
                          }}
                          className={`rounded-2xl border p-4 text-left transition ${
                            isSelected
                              ? "border-sky-500 bg-slate-900 text-slate-50"
                              : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{pack.label}</p>
                          <p className="text-2xl font-semibold text-slate-50">
                            {pack.credits.toLocaleString()} {t.creditsIncluded}
                          </p>
                          <div className="space-y-1 text-center">
                            <p className="text-lg font-semibold text-emerald-400">
                              {formatCurrency(pack.price)}
                            </p>
                            <p className="text-sm font-semibold text-slate-200">
                              <span className="line-through decoration-2 decoration-slate-400">
                                {formatCurrency(original)}
                              </span>{" "}
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                50% off
                              </span>
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <section className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t.coupon}</p>
                <p className="text-sm text-slate-400">{t.couponHint}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder={t.couponPlaceholder}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon}
                    className="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                  >
                    {isApplyingCoupon ? t.applyingCoupon : t.applyCoupon}
                  </button>
                  {appliedCoupon && (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-rose-400 hover:text-rose-200"
                    >
                      {t.removeCoupon}
                    </button>
                  )}
                </div>
              </div>
              {couponStatus && <p className="text-xs text-emerald-300">{couponStatus}</p>}
              {couponError && <p className="text-xs text-rose-300">{couponError}</p>}
            </section>

            <section className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t.checkout}</p>
                <p className="text-sm text-slate-400">{t.checkoutDesc}</p>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                {t.checkoutCta}
              </button>
            </section>
          </form>

          <aside className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Order summary</p>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>{t.selection}</span>
                <span className="font-semibold text-slate-50">
                  {discountedSummary?.label ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t.billing}</span>
                <span className="font-semibold text-slate-50">
                  {discountedSummary?.subLabel ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Credits</span>
                <span className="font-semibold text-emerald-400">
                  {discountedSummary?.credits ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t.subtotal}</span>
                <span className="font-semibold">
                  {discountedSummary?.price ?? "—"}
                </span>
              </div>
              {appliedCoupon &&
                discountedSummary &&
                "discountPrice" in discountedSummary && (
                  <div className="flex items-center justify-between text-emerald-300">
                    <span>{t.coupon} ({appliedCoupon.code})</span>
                    <span className="font-semibold">
                      {discountedSummary.discountPrice}
                    </span>
                  </div>
                )}
              <div className="flex items-center justify-between text-lg font-semibold text-slate-50 pt-2 border-t border-slate-800">
                <span>{t.total}</span>
                <span>{discountedSummary?.totalPrice ?? "—"}</span>
              </div>
              <div className="text-xs text-slate-500">
                {discountedSummary?.note ?? t.noteFallback}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{t.vat}</span>
                <span>{t.vatNote}</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4 text-sm text-slate-300 space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t.linkedAccount}</p>
              <div className="flex items-center justify-between">
                <span>User</span>
                <span className="font-semibold text-slate-50">{userDisplayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Plan</span>
                <span className="font-semibold text-slate-50">{planDisplayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Current credits</span>
                <span className="font-semibold text-emerald-400">{creditsRemaining}</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-200">{t.nextSteps}</p>
              <ul className="space-y-1 list-disc pl-4">
                <li>{t.step1}</li>
                <li>{t.step2}</li>
                <li>{t.step3}</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
