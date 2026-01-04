import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  generateUniqueSlug,
  requireUserId,
  sanitizeProjectName,
  sanitizeProjectDescription,
  toProjectPayload,
} from "./utils";
import {
  DEFAULT_SUBSCRIPTION_PLAN,
  getPlanProjectLimit,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    projects: projects.map(toProjectPayload),
  });
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlan: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

    const planId =
      (account.subscriptionPlan as SubscriptionPlanId | undefined) ??
      DEFAULT_SUBSCRIPTION_PLAN;
    const projectLimit = getPlanProjectLimit(planId);

    const payload = await request.json().catch(() => null);
    const name = sanitizeProjectName(payload?.name);
    const description = sanitizeProjectDescription(payload?.description);
    if (!name) {
      return NextResponse.json(
        { error: "Project name is required." },
        { status: 400 }
      );
    }
    if (!description) {
      return NextResponse.json(
        { error: "Project description is required." },
        { status: 400 }
      );
    }

    const projectCount = await prisma.project.count({ where: { userId } });
    if (projectCount >= projectLimit) {
      return NextResponse.json(
        {
          error: `Project limit reached for this plan (${projectLimit} projects).`,
        },
        { status: 403 }
      );
    }

    const slug = await generateUniqueSlug(userId, name);
    const project = await prisma.project.create({
      data: {
        userId,
        name,
        description,
        slug,
      },
    });

    return NextResponse.json({ project: toProjectPayload(project) });
  } catch (error) {
    console.error("Failed to create project", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            error:
              "You already have a project with a similar name. Try a different name.",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Failed to create project: ${error.message}`
            : "Failed to create project. Please try again.",
      },
      { status: 500 }
    );
  }
}
