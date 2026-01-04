"use client";

import { useState } from "react";

type DiscountType = "percent" | "fixed";

type CouponListItem = {
  id: string;
  code: string;
  discountType: "percent" | "fixed" | string;
  amount: number;
  currency: string | null;
  userId: string;
  expiresAt: string | null;
  createdAt: string;
};

export default function AdminCouponsPage() {
  const [adminToken, setAdminToken] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [amount, setAmount] = useState(10);
  const [currency, setCurrency] = useState("EUR");
  const [userId, setUserId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [coupons, setCoupons] = useState<CouponListItem[]>([]);

  const handleSubmit = async () => {
    setStatus(null);
    setError(null);

    if (!adminToken.trim()) {
      setError("Enter admin token.");
      return;
    }
    if (!code.trim()) {
      setError("Enter coupon code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        discountType,
        amount: Number(amount),
        currency: discountType === "fixed" ? currency.trim().toUpperCase() || "EUR" : null,
        userId: userId.trim() || null,
      };

      const response = await fetch("/api/billing/admin/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken.trim(),
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to create coupon.");
      }
      setStatus(`Created coupon ${result?.coupon?.code || code.trim().toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create coupon.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadCoupons = async () => {
    setError(null);
    setStatus(null);
    if (!adminToken.trim()) {
      setError("Enter admin token.");
      return;
    }
    setIsLoadingList(true);
    try {
      const response = await fetch("/api/billing/admin/coupons", {
        method: "GET",
        headers: {
          "x-admin-token": adminToken.trim(),
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.coupons) {
        throw new Error(payload?.error || "Failed to load coupons.");
      }
      setCoupons(payload.coupons as CouponListItem[]);
      setStatus("Coupons loaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load coupons.");
    } finally {
      setIsLoadingList(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin</p>
          <h1 className="text-2xl font-semibold text-slate-50">Create coupon (temporary)</h1>
          <p className="text-sm text-amber-200">
            This page is temporary for manual coupon creation. Protect the admin token.
          </p>
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">Admin token</span>
            <input
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="ADMIN_COUPON_TOKEN"
              className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-300">Code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. USER-20"
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-300">Discount type</span>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-300">Amount</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>
            {discountType === "fixed" && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-300">Currency</span>
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </label>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-300">User ID (required)</span>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user id to lock coupon"
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>
            <span className="text-xs text-slate-500 self-end">
              Coupon will be single-use and auto-removed when applied.
            </span>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {isSubmitting ? "Creating..." : "Create coupon"}
          </button>
          <button
            type="button"
            onClick={handleLoadCoupons}
            disabled={isLoadingList}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            {isLoadingList ? "Loading..." : "Load coupons"}
          </button>

          {status && <p className="text-xs text-emerald-300">{status}</p>}
          {error && <p className="text-xs text-rose-300">{error}</p>}

          {coupons.length > 0 && (
            <div className="space-y-3 pt-4">
              <p className="text-sm font-semibold text-slate-200">Existing coupons</p>
              <div className="space-y-3">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <span className="font-semibold text-slate-50">{coupon.code}</span>
                      <span className="text-xs rounded-full border border-slate-700 px-2 py-0.5">
                        {coupon.discountType === "percent"
                          ? `${coupon.amount}%`
                          : `${coupon.currency || "EUR"} ${coupon.amount}`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      User: {coupon.userId}
                    </p>
                    <p className="text-xs text-slate-500">
                      Expires: {coupon.expiresAt || "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Created: {coupon.createdAt}
                    </p>
                    <p className="text-xs text-slate-500">
                      One-time use; removed on apply.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
