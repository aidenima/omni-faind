import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findProjectBySlug,
  requireUserId,
  sanitizeHistoryResults,
  toSearchHistoryPayload,
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

const sanitizePrompt = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 4000);
};

const sanitizeQueries = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
};

const sanitizeResultCount = (value: unknown) => {
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

  const historyEntries = await prisma.searchHistory.findMany({
    where: {
      userId,
      projectId: project.id,
    },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
  });

  return NextResponse.json({
    history: historyEntries.map(toSearchHistoryPayload),
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
  const prompt = sanitizePrompt(payload?.prompt);
  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt is required to record history." },
      { status: 400 }
    );
  }

  const queries = sanitizeQueries(payload?.queries);
  const resultCount = sanitizeResultCount(payload?.resultCount);
  const results = sanitizeHistoryResults(payload?.results) ?? [];

  const entry = await prisma.searchHistory.create({
    data: {
      userId,
      projectId: project.id,
      prompt,
      queries,
      resultCount,
      results,
    },
  });

  return NextResponse.json({ entry: toSearchHistoryPayload(entry) });
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
      { error: "A valid history entry identifier is required." },
      { status: 400 }
    );
  }

  const entry = await prisma.searchHistory.findFirst({
    where: {
      id: entryId,
      userId,
      projectId: project.id,
    },
    select: { id: true },
  });

  if (!entry) {
    return NextResponse.json(
      { error: "History entry not found." },
      { status: 404 }
    );
  }

  await prisma.searchHistory.delete({
    where: { id: entry.id },
  });

  return NextResponse.json({ success: true });
}
