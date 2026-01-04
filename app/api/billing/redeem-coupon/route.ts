import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

type RedeemPayload = {
  code?: string;
};

const sanitizeCode = (value?: string | null) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
};

const buildLabel = (
  discountType: "percent" | "fixed",
  amount: number,
  currency?: string | null
) => {
  if (discountType === "percent") {
    return `${amount}% off`;
  }
  return currency ? `${currency} ${amount} off` : `${amount} off`;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as RedeemPayload | null;
  const code = sanitizeCode(payload?.code);
  if (!code) {
    return NextResponse.json({ success: false, error: "Coupon code is required." }, { status: 400 });
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code },
  });

  if (!coupon) {
    return NextResponse.json({ success: false, error: "Coupon is not valid." }, { status: 404 });
  }

  if (coupon.userId && coupon.userId !== userId) {
    return NextResponse.json({ success: false, error: "Coupon is not assigned to this account." }, { status: 403 });
  }
  const now = new Date();
  if (coupon.expiresAt && now > coupon.expiresAt) {
    return NextResponse.json({ success: false, error: "Coupon has expired." }, { status: 400 });
  }

  const discountType =
    coupon.discountType === "percent" || coupon.discountType === "fixed"
      ? coupon.discountType
      : "percent";

  const amount = Number(coupon.amount);
  const safeAmount =
    discountType === "percent" ? Math.min(Math.max(amount, 0), 100) : Math.max(amount, 0);

  try {
    await prisma.coupon.delete({ where: { id: coupon.id } });
  } catch (error) {
    console.error("Failed to redeem coupon", error);
    return NextResponse.json({ success: false, error: "Failed to redeem coupon." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    code: coupon.code,
    discountType,
    amount: safeAmount,
    currency: coupon.currency ?? null,
    label: buildLabel(discountType, safeAmount, coupon.currency),
  });
}
