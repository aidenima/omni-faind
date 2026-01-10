import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireUserId,
} from "@/app/api/projects/utils";
import {
  getPlanContactLimit,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";
import { buildRateLimitHeaders, checkRateLimit } from "@/lib/rate-limit";
import { logApiRequest } from "@/lib/request-logger";
import { getClientIp } from "@/lib/request-utils";

const GOOGLE_SEARCH_URL =
  "https://customsearch.googleapis.com/customsearch/v1";
const RESULTS_PER_PAGE = 10;
const MAX_GOOGLE_PAGES = 10; // Google CSE caps pagination at ~100 results per query
const MAX_RESULTS = 150;
const GOOGLE_FETCH_TIMEOUT_MS = 15000;
const CREDITS_PER_SEARCH = 1;

const fetchWithTimeout = async (
  input: Parameters<typeof fetch>[0],
  init?: RequestInit,
  timeoutMs = GOOGLE_FETCH_TIMEOUT_MS
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

type CandidateSource =
  | "linkedin"
  | "upwork"
  | "behance"
  | "fiverr"
  | "github";
type CandidateResult = {
  name: string;
  profileUrl: string;
  snippet?: string;
  rawSnippet?: string;
  source: CandidateSource;
};
const AVAILABLE_SOURCES: CandidateSource[] = [
  "linkedin",
  "upwork",
  "behance",
  "fiverr",
  "github",
];
const DEFAULT_SOURCES: CandidateSource[] = ["linkedin", "upwork"];

type CustomSearchItem = {
  title?: string;
  link?: string;
  snippet?: string;
  htmlSnippet?: string;
  formattedUrl?: string;
};

type CustomSearchResponse = {
  items?: CustomSearchItem[];
  queries?: {
    nextPage?: {
      startIndex?: number;
    }[];
  };
};

const ownerPromptKeywords = [
  "owner",
  "owners",
  "founder",
  "founders",
  "cofounder",
  "co-founder",
  "vlasnik",
  "vlasnici",
  "vlasnika",
  "vlasnike",
  "osnivac",
  "osnivaca",
  "osnivaci",
];

const nonFreelancerKeywords = [
  "buyer",
  "buyers",
  "kupac",
  "kupca",
  "kupce",
  "kupci",
  "clinic owner",
  "company owner",
  "business owner",
  "agency owner",
];

const sanitizeName = (value: string) =>
  value.replace(/\s+-\s+.*$/, "").trim();

const containsLocation = (text: string | undefined, city: string) => {
  if (!text || !city) return false;
  const cleanedCity = city.trim().toLowerCase();
  if (!cleanedCity) return false;
  return text.toLowerCase().includes(cleanedCity);
};

const isLinkedInProfile = (url?: string | null) =>
  Boolean(url && /linkedin\.com\/in\//i.test(url));

const stripHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

const mergeSnippets = (snippet?: string, htmlSnippet?: string) => {
  const normalize = (text: string) =>
    text
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  const rawParts = [snippet, htmlSnippet]
    .map((text) => (text ? text.replace(/&nbsp;/gi, " ").trim() : ""))
    .filter((text) => Boolean(text));
  const seen = new Set<string>();
  const ordered: string[] = [];
  rawParts.forEach((text) => {
    const key = normalize(text);
    if (!seen.has(key)) {
      seen.add(key);
      ordered.push(text);
    }
  });
  return ordered.join("\n").trim();
};

const isUpworkProfile = (url?: string | null) =>
  Boolean(url && /upwork\.com\/freelancers\//i.test(url));
const isBehanceProfile = (url?: string | null) =>
  Boolean(url && /behance\.net\//i.test(url));
const isFiverrProfile = (url?: string | null) =>
  Boolean(url && /fiverr\.com\//i.test(url));
const isGithubProfile = (url?: string | null) =>
  Boolean(url && /github\.com\/[a-z0-9-]+\/?$/i.test(url));

const SOURCE_CONFIG: Record<
  CandidateSource,
  { siteToken: string; pageBudget: number; filter: (url?: string | null) => boolean }
> = {
  linkedin: {
    siteToken: "linkedin.com/in",
    pageBudget: 6,
    filter: isLinkedInProfile,
  },
  upwork: {
    siteToken: "upwork.com/freelancers",
    pageBudget: 3,
    filter: isUpworkProfile,
  },
  behance: {
    siteToken: "behance.net",
    pageBudget: 3,
    filter: isBehanceProfile,
  },
  fiverr: {
    siteToken: "fiverr.com",
    pageBudget: 3,
    filter: isFiverrProfile,
  },
  github: {
    siteToken: "github.com",
    pageBudget: 3,
    filter: isGithubProfile,
  },
};

const shouldSkipUpwork = (input?: string | null) => {
  if (!input) return false;
  const normalized = input.toLowerCase();
  return (
    ownerPromptKeywords.some((keyword) => normalized.includes(keyword)) ||
    nonFreelancerKeywords.some((keyword) => normalized.includes(keyword))
  );
};

const rewriteSiteToken = (query: string, targetSite: string) => {
  const trimmed = query.trim();
  if (!trimmed) return `site:${targetSite}`;
  if (/^site:[^\s]+/i.test(trimmed)) {
    return trimmed.replace(/^site:[^\s]+/i, `site:${targetSite}`);
  }
  return `site:${targetSite} ${trimmed}`;
};

const parseSources = (value: unknown): CandidateSource[] => {
  if (!Array.isArray(value)) return [];
  const normalized: CandidateSource[] = [];
  value.forEach((entry) => {
    if (typeof entry !== "string") return;
    const lower = entry.toLowerCase() as CandidateSource;
    if (
      (AVAILABLE_SOURCES as string[]).includes(lower) &&
      !normalized.includes(lower)
    ) {
      normalized.push(lower);
    }
  });
  return normalized;
};

const flattenUpworkQuery = (value: string) => {
  const pattern = /\(\(([^()]+)\)\s+((?:\([^()]+\)\s*)+)\)/g;
  return value.replace(pattern, (_, firstGroup: string, remainingGroups: string) => {
    const segments: string[] = [];
    const normalizedFirst = firstGroup.trim();
    if (normalizedFirst) {
      segments.push(
        normalizedFirst.includes(" OR ")
          ? `(${normalizedFirst})`
          : normalizedFirst
      );
    }
    const matches = remainingGroups.match(/\([^()]+\)/g);
    if (matches) {
      matches.forEach((segment) => {
        const trimmed = segment.slice(1, -1).trim();
        if (!trimmed) return;
        segments.push(
          trimmed.includes(" OR ") ? `(${trimmed})` : trimmed
        );
      });
    }
    if (!segments.length) {
      return value;
    }
    return `(${segments.join(" OR ")})`;
  });
};

const transformQueryForSource = (
  query: string,
  source: CandidateSource
) => {
  if (source === "upwork") {
    return flattenUpworkQuery(query);
  }
  return query;
};

const sortByCity = (results: CandidateResult[], city?: string | null) => {
  if (!city) return results;
  const normalizedCity = city.toLowerCase();
  return [...results].sort((a, b) => {
    const aMatch = containsLocation(
      `${a.name} ${a.snippet}`.toLowerCase(),
      normalizedCity
    );
    const bMatch = containsLocation(
      `${b.name} ${b.snippet}`.toLowerCase(),
      normalizedCity
    );
    if (aMatch === bMatch) return 0;
    return aMatch ? -1 : 1;
  });
};

const interleaveBuckets = (
  buckets: CandidateResult[][],
  limit: number
) => {
  const combined: CandidateResult[] = [];
  const seen = new Set<string>();
  const maxLength = Math.max(0, ...buckets.map((bucket) => bucket.length));

  for (let index = 0; index < maxLength && combined.length < limit; index += 1) {
    for (const bucket of buckets) {
      const candidate = bucket[index];
      if (!candidate || seen.has(candidate.profileUrl)) continue;
      seen.add(candidate.profileUrl);
      combined.push(candidate);
      if (combined.length >= limit) {
        break;
      }
    }
  }

  if (combined.length < limit) {
    for (const bucket of buckets) {
      for (const candidate of bucket) {
        if (combined.length >= limit) break;
        if (seen.has(candidate.profileUrl)) continue;
        seen.add(candidate.profileUrl);
        combined.push(candidate);
      }
      if (combined.length >= limit) break;
    }
  }

  return combined;
};

const mapSearchItemsToCandidates = (
  items: CustomSearchItem[],
  source: CandidateSource,
  filterFn: (url?: string | null) => boolean
) => {
  return items
    .filter((item) => filterFn(item.link))
    .map((item) => {
      const plainSnippet = item.snippet?.trim() || "";
      const htmlSnippet = item.htmlSnippet ? stripHtml(item.htmlSnippet) : "";
      const combinedSnippet = mergeSnippets(plainSnippet, htmlSnippet);
      return {
        name: sanitizeName(item.title || item.link || "Candidate"),
        profileUrl: item.link!,
        snippet: plainSnippet,
        rawSnippet: combinedSnippet || plainSnippet,
        source,
      };
    });
};

const executeCustomSearch = async (
  searchQuery: string,
  apiKey: string,
  searchEngineId: string,
  pagesToFetch: number
) => {
  const results: CustomSearchItem[] = [];
  let startIndex = 1;

  for (let page = 0; page < pagesToFetch; page += 1) {
    const url = new URL(GOOGLE_SEARCH_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", searchEngineId);
    url.searchParams.set("q", searchQuery.trim());
    url.searchParams.set("start", String(startIndex));

    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      return {
        error:
          errorPayload?.error?.message ||
          "Google Custom Search request failed.",
      };
    }

    const data = (await response.json()) as CustomSearchResponse;
    if (Array.isArray(data.items)) {
      results.push(...data.items);
    }

    const nextPage = data.queries?.nextPage?.[0]?.startIndex;
    if (!nextPage) {
      break;
    }

    startIndex = nextPage;
    if (startIndex > pagesToFetch * RESULTS_PER_PAGE) {
      break;
    }
  }

  return { results };
};

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let statusCode = 500;
  let userId: string | null = null;
  const respond = (
    payload: unknown,
    status: number,
    init?: ResponseInit
  ) => {
    statusCode = status;
    return NextResponse.json(payload, { status, ...init });
  };

  try {
    userId = await requireUserId();
    if (!userId) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const rateLimit = checkRateLimit(
      `search:${userId}:${getClientIp(request)}`,
      10,
      60_000
    );
    if (!rateLimit.allowed) {
      return respond(
        { error: "Too many requests. Please try again shortly." },
        429,
        { headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    const body = (await request.json()) as {
      query?: string;
      city?: string | null;
      prompt?: string | null;
      sources?: unknown;
    };
    const { query, city, prompt } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return respond({ error: "Query is required." }, 400);
    }

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlan: true, creditsRemaining: true },
    });

    if (!account) {
      return respond({ error: "Account not found." }, 404);
    }

    const planId = account.subscriptionPlan as SubscriptionPlanId;
    const accountCredits = Number(account.creditsRemaining);
    if (accountCredits < CREDITS_PER_SEARCH) {
      return respond(
        {
          error:
            "You are out of credits. Buy credits or upgrade your plan to continue searching.",
          creditsRemaining: accountCredits,
        },
        402
      );
    }
    const contactLimit = Math.min(
      getPlanContactLimit(planId),
      MAX_RESULTS
    );

    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_CSE_ID;

    if (!apiKey || !searchEngineId) {
      return respond(
        { error: "Missing GOOGLE_API_KEY or GOOGLE_CSE_ID." },
        503
      );
    }

    const requestedSources = parseSources(body.sources);
    let activeSources =
      requestedSources.length > 0
        ? requestedSources
        : [...DEFAULT_SOURCES];

    const skipUpwork =
      shouldSkipUpwork(prompt) || shouldSkipUpwork(query);
    if (skipUpwork) {
      activeSources = activeSources.filter(
        (source) => source !== "upwork"
      );
    }

    activeSources = activeSources.filter((source) =>
      AVAILABLE_SOURCES.includes(source)
    );
    if (!activeSources.length) {
      activeSources = ["linkedin"];
    }

    const sourceQueries: Partial<Record<CandidateSource, string>> = {};
    const shouldPreserveOrder = activeSources.length === 1;
    activeSources.forEach((source) => {
      const config = SOURCE_CONFIG[source];
      const transformed = transformQueryForSource(query, source);
      sourceQueries[source] = rewriteSiteToken(transformed, config.siteToken);
    });

    const planMultiplier =
      planId === "AGENCY" ? 3 : planId === "PRO" ? 1.5 : 1;
    const targetPages = Math.max(
      1,
      Math.ceil(contactLimit / RESULTS_PER_PAGE)
    );

    const resolvePagesToFetch = (
      configPageBudget: number,
      activeSourceCount: number
    ) => {
      const boosted = Math.min(
        targetPages,
        Math.max(1, Math.ceil(configPageBudget * planMultiplier))
      );
      // Google CSE will not return beyond ~100 results per query.
      const capped = Math.min(boosted, MAX_GOOGLE_PAGES);
      if (planId === "AGENCY" && activeSourceCount > 1) {
        return capped;
      }
      return capped;
    };

    const sourceErrors: string[] = [];
    const sourceErrorDetails: Array<{
      source: CandidateSource;
      message: string;
    }> = [];
    const debugErrors =
      process.env.DEBUG_SEARCH_ERRORS === "true" ||
      process.env.NEXT_PUBLIC_DEBUG_SEARCH_ERRORS === "true";
    const perSourceResults = await Promise.all(
      activeSources.map(async (source) => {
        try {
          const config = SOURCE_CONFIG[source];
          const boostedPages = resolvePagesToFetch(
            config.pageBudget,
            activeSources.length
          );
          const { results, error } = await executeCustomSearch(
            sourceQueries[source]!,
            apiKey,
            searchEngineId,
            boostedPages
          );

          if (error || !results) {
            throw new Error(
              error || "Google Custom Search request failed."
            );
          }

          const parsed = mapSearchItemsToCandidates(
            results,
            source,
            config.filter
          );
          if (shouldPreserveOrder) {
            return parsed;
          }
          return sortByCity(parsed, city);
        } catch (error) {
          console.error(
            `Failed to fetch results for source ${source}`,
            error
          );
          sourceErrors.push(source);
          const message =
            error instanceof Error ? error.message : "Unknown search error.";
          sourceErrorDetails.push({ source, message });
          return [];
        }
      })
    );

    const finalResults = shouldPreserveOrder
      ? perSourceResults[0].slice(0, contactLimit)
      : interleaveBuckets(perSourceResults, contactLimit);
    const queryPayload: Partial<Record<CandidateSource, string>> = {};
    activeSources.forEach((source) => {
      if (sourceQueries[source]) {
        queryPayload[source] = sourceQueries[source]!;
      }
    });

    if (!finalResults.length) {
      return respond(
        {
          error:
            "Search provider temporarily unavailable. Please try again shortly.",
          details: debugErrors ? sourceErrorDetails : undefined,
        },
        503
      );
    }

    const deduction = await prisma.user.updateMany({
      where: {
        id: userId,
        creditsRemaining: { gte: CREDITS_PER_SEARCH },
      },
      data: {
        creditsRemaining: { decrement: CREDITS_PER_SEARCH },
      },
    });

    if (deduction.count === 0) {
      const latest = await prisma.user.findUnique({
        where: { id: userId },
        select: { creditsRemaining: true },
      });
      return respond(
        {
          error:
            "You are out of credits. Buy credits or upgrade your plan to continue searching.",
          creditsRemaining: latest ? Number(latest.creditsRemaining) : 0,
        },
        402
      );
    }

    return respond(
      {
      results: finalResults,
      queries: queryPayload,
      warnings: sourceErrors.length ? sourceErrors : undefined,
      },
      200
    );
  } catch (error) {
    console.error("Failed to fetch Google search results", error);
    return respond(
      { error: "Unexpected server error during Google search." },
      500
    );
  } finally {
    logApiRequest({
      request,
      route: "search",
      status: statusCode,
      durationMs: Date.now() - startedAt,
      userId,
    });
  }
}
