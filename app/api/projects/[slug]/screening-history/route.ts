import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findProjectBySlug,
  requireUserId,
  sanitizeJobDescription,
  sanitizeScreeningResults,
  toScreeningHistoryPayload,
} from "@/app/api/projects/utils";

type RouteParams = {
  slug: string;
};

type RouteContext = {
  params: Promise<RouteParams> | RouteParams;
};

const resolveSlugParam = async (
  contextParams: RouteContext["params"]
) => {
  if (contextParams instanceof Promise) {
    const resolved = await contextParams;
    return resolved.slug;
  }
  return contextParams.slug;
};

const MAX_HISTORY_ENTRIES = 50;

const sanitizeCount = (value: unknown) => {
  if (typeof value !== "number") return null;
  if (Number.isNaN(value)) return null;
  return Math.max(0, Math.round(value));
};

const sanitizeEntryId = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 64) return null;
  return trimmed;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const slug = await resolveSlugParam(context.params);
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await findProjectBySlug(userId, slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limitValue = limitParam ? parseInt(limitParam, 10) : 20;
  const safeLimit = Number.isFinite(limitValue)
    ? Math.min(Math.max(limitValue, 1), MAX_HISTORY_ENTRIES)
    : 20;

  const historyEntries = await prisma.screeningHistory.findMany({
    where: {
      userId,
      projectId: project.id,
    },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
  });

  return NextResponse.json({
    history: historyEntries.map(toScreeningHistoryPayload),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const slug = await resolveSlugParam(context.params);
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await findProjectBySlug(userId, slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const jobDescription = sanitizeJobDescription(payload?.jobDescription);
  if (!jobDescription) {
    return NextResponse.json(
      { error: "Job description is required to record screening history." },
      { status: 400 }
    );
  }

  const jobTitle =
    typeof payload?.jobTitle === "string"
      ? payload.jobTitle.trim().slice(0, 240) || null
      : null;
  const candidateCount = sanitizeCount(payload?.candidateCount);
  const resultCount = sanitizeCount(payload?.resultCount);
  const results = sanitizeScreeningResults(payload?.results) ?? [];

  const entry = await prisma.screeningHistory.create({
    data: {
      userId,
      projectId: project.id,
      jobTitle,
      jobDescription,
      candidateCount,
      resultCount,
      results,
    },
  });

  return NextResponse.json({ entry: toScreeningHistoryPayload(entry) });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const slug = await resolveSlugParam(context.params);
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await findProjectBySlug(userId, slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const entryId = sanitizeEntryId(payload?.entryId);
  if (!entryId) {
    return NextResponse.json(
      { error: "A valid screening history entry identifier is required." },
      { status: 400 }
    );
  }

  const entry = await prisma.screeningHistory.findFirst({
    where: {
      id: entryId,
      userId,
      projectId: project.id,
    },
    select: { id: true },
  });

  if (!entry) {
    return NextResponse.json(
      { error: "Screening history entry not found." },
      { status: 404 }
    );
  }

  await prisma.screeningHistory.delete({
    where: { id: entry.id },
  });

  return NextResponse.json({ success: true });
}
