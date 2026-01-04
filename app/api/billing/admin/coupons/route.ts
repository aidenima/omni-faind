import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type CouponPayload = {
  code?: string;
  discountType?: "percent" | "fixed" | string;
  amount?: number;
  currency?: string | null;
  userId?: string | null;
};

const requireAdminToken = (request: NextRequest) => {
  const token = request.headers.get("x-admin-token");
  if (!token) return false;
  const expected = process.env.ADMIN_COUPON_TOKEN;
  return expected && token === expected;
};

const sanitizeCode = (value?: string | null) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
};

const sanitizeAmount = (value?: number | null) => {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  return Math.max(0, value);
};

export async function POST(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as CouponPayload | null;
  const code = sanitizeCode(payload?.code);
  if (!code) {
    return NextResponse.json({ error: "Coupon code is required." }, { status: 400 });
  }

  const discountType =
    payload?.discountType === "percent" || payload?.discountType === "fixed"
      ? payload.discountType
      : null;
  if (!discountType) {
    return NextResponse.json({ error: "discountType must be 'percent' or 'fixed'." }, { status: 400 });
  }

  const amount = sanitizeAmount(payload?.amount);
  if (amount === null) {
    return NextResponse.json({ error: "Valid amount is required." }, { status: 400 });
  }

  const currency =
    discountType === "fixed"
      ? (typeof payload?.currency === "string" ? payload.currency.toUpperCase() : "EUR")
      : null;
  const userId =
    typeof payload?.userId === "string" && payload.userId.trim()
      ? payload.userId.trim()
      : null;
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code,
        userId,
        discountType,
        amount,
        currency,
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        coupon,
        message: "Coupon created.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create coupon", error);
    return NextResponse.json(
      { error: "Failed to create coupon." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      coupons,
    });
  } catch (error) {
    console.error("Failed to list coupons", error);
    return NextResponse.json(
      { error: "Failed to list coupons." },
      { status: 500 }
    );
  }
}
