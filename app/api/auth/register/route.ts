import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import {
  createCredentialsUser,
  findUserByEmail,
} from "@/lib/auth/user-service";
import { normalizeSubscriptionPlan } from "@/lib/billing/plans";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  try {
    const { name, email, password, plan } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedPlan = normalizeSubscriptionPlan(plan);
    if (!normalizedPlan) {
      return NextResponse.json(
        { error: "A valid subscription plan is required." },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
        },
        { status: 400 }
      );
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try logging in." },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 10);
    await createCredentialsUser({
      email,
      name: typeof name === "string" ? name.trim() : undefined,
      passwordHash,
      subscriptionPlan: normalizedPlan,
    });

    return NextResponse.json(
      { message: "Account created successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("[auth/register] Failed to create account", error);
    return NextResponse.json(
      { error: "Unable to create account at the moment." },
      { status: 500 }
    );
  }
}
