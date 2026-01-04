import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  HISTORY_RESULTS_PREVIEW_LIMIT,
  type SavedHistoryResult,
} from "@/types/search-history";
import type {
  Project,
  SearchHistory,
  ScreeningHistory,
} from "@prisma/client";

export const MAX_NAME_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 600;
const SLUG_MAX_LENGTH = 48;
const MAX_RESULT_NAME_LENGTH = 160;
const MAX_RESULT_URL_LENGTH = 500;
const MAX_RESULT_SNIPPET_LENGTH = 2000;
const MAX_JOB_DESCRIPTION_LENGTH = 6000;
const MAX_SCREENING_EXPLANATION_LENGTH = 3000;

export const requireUserId = async () => {
  const session = await auth();
  return session?.user?.id ?? null;
};

export const sanitizeProjectName = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_NAME_LENGTH);
};

export const sanitizeProjectDescription = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_DESCRIPTION_LENGTH);
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";

export const generateUniqueSlug = async (userId: string, name: string) => {
  const base = slugify(name).slice(0, SLUG_MAX_LENGTH) || "project";
  let attempt = 0;
  while (attempt < 50) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await prisma.project.findFirst({
      where: { userId, slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
    attempt += 1;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
};

export const toProjectPayload = (project: Project) => ({
  id: project.id,
  slug: project.slug,
  name: project.name,
  description: project.description,
  createdAt: project.createdAt.toISOString(),
});

export const findProjectBySlug = (userId: string, slug: string) => {
  return prisma.project.findFirst({
    where: { userId, slug },
  });
};

const sanitizeStringField = (value: unknown, limit: number) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, limit);
};

const sanitizeOptionalStringField = (value: unknown, limit: number) => {
  const sanitized = sanitizeStringField(value, limit);
  return sanitized ?? null;
};

const sanitizeHistorySource = (value: unknown): SavedHistoryResult["source"] => {
  if (
    value === "linkedin" ||
    value === "upwork" ||
    value === "behance" ||
    value === "fiverr" ||
    value === "github"
  ) {
    return value;
  }
  return "unknown";
};

const sanitizeHistoryResultEntry = (
  value: unknown
): SavedHistoryResult | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const name = sanitizeStringField(raw.name, MAX_RESULT_NAME_LENGTH);
  const profileUrl = sanitizeStringField(raw.profileUrl, MAX_RESULT_URL_LENGTH);
  if (!name || !profileUrl) {
    return null;
  }

  return {
    name,
    profileUrl,
    snippet: sanitizeOptionalStringField(
      raw.snippet,
      MAX_RESULT_SNIPPET_LENGTH
    ),
    rawSnippet: sanitizeOptionalStringField(
      raw.rawSnippet,
      MAX_RESULT_SNIPPET_LENGTH
    ),
    source: sanitizeHistorySource(raw.source),
  };
};

export const sanitizeHistoryResults = (
  value: unknown
): SavedHistoryResult[] | null => {
  if (!Array.isArray(value)) return null;
  const sanitized = value
    .map(sanitizeHistoryResultEntry)
    .filter((entry): entry is SavedHistoryResult => Boolean(entry))
    .slice(0, HISTORY_RESULTS_PREVIEW_LIMIT);
  return sanitized.length ? sanitized : null;
};

export const toSearchHistoryPayload = (entry: SearchHistory) => ({
  id: entry.id,
  prompt: entry.prompt,
  queries: entry.queries ?? null,
  resultCount: entry.resultCount ?? 0,
  createdAt: entry.createdAt.toISOString(),
  results: sanitizeHistoryResults(entry.results) ?? null,
});

export const sanitizeJobDescription = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_JOB_DESCRIPTION_LENGTH);
};

const sanitizeScreeningResultEntry = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = sanitizeStringField(raw.id, MAX_RESULT_NAME_LENGTH);
  const name = sanitizeStringField(raw.name, MAX_RESULT_NAME_LENGTH);
  const rank =
    typeof raw.rank === "number" && Number.isFinite(raw.rank)
      ? Math.max(1, Math.round(raw.rank))
      : null;
  const fitScore =
    typeof raw.fitScore === "number" && Number.isFinite(raw.fitScore)
      ? Math.round(raw.fitScore)
      : null;
  const explanation = sanitizeOptionalStringField(
    raw.explanation,
    MAX_SCREENING_EXPLANATION_LENGTH
  );

  if (!name) return null;

  return {
    id: id ?? `result-${Math.random().toString(36).slice(2, 8)}`,
    name,
    rank,
    fitScore,
    explanation,
  };
};

export const sanitizeScreeningResults = (value: unknown) => {
  if (!Array.isArray(value)) return null;
  const sanitized = value
    .map(sanitizeScreeningResultEntry)
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .slice(0, HISTORY_RESULTS_PREVIEW_LIMIT);
  return sanitized.length ? sanitized : null;
};

export const toScreeningHistoryPayload = (entry: ScreeningHistory) => ({
  id: entry.id,
  jobTitle: entry.jobTitle ?? null,
  jobDescription: entry.jobDescription,
  candidateCount: entry.candidateCount ?? 0,
  resultCount: entry.resultCount ?? 0,
  createdAt: entry.createdAt.toISOString(),
  results: sanitizeScreeningResults(entry.results) ?? null,
});
