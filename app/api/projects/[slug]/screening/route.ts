import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SUBSCRIPTION_PLAN,
  getPlanScreeningLimit,
  normalizeSubscriptionPlan,
} from "@/lib/billing/plans";
import { findProjectBySlug, requireUserId } from "@/app/api/projects/utils";

const CREDITS_PER_CV = 0.2;
const MAX_JOB_DESCRIPTION_LENGTH = 6000;
const MAX_CANDIDATE_DETAIL_LENGTH = 6000;
const MAX_CANDIDATE_NAME_LENGTH = 160;
const MODEL = "gpt-4.1-mini";
const DEBUG_SCREENING_ERRORS =
  process.env.DEBUG_SCREENING_ERRORS === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_SCREENING_ERRORS === "true";

type RouteParams = {
  slug: string;
};

type RouteContext = {
  params: RouteParams | Promise<RouteParams>;
};

type CandidateInput = {
  id: string;
  name: string;
  details: string;
  sourceLabel: string | null;
};

type AiCandidateResult = {
  id: string;
  name: string;
  fitScore: number;
  explanation: string;
};

const resolveSlugParam = async (contextParams: RouteContext["params"]) => {
  if (contextParams instanceof Promise) {
    const resolved = await contextParams;
    return resolved.slug;
  }
  return contextParams.slug;
};

const insufficientCreditsResponse = (creditsRemaining: number) =>
  NextResponse.json(
    {
      error:
        "Not enough credits for screening. Remove candidates or buy additional credits.",
      creditsRemaining,
    },
    { status: 402 }
  );

const sanitizeJobDescription = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_JOB_DESCRIPTION_LENGTH);
};

const sanitizeCandidateEntry = (value: unknown): CandidateInput | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim().slice(0, 80)
      : null;
  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim().slice(0, MAX_CANDIDATE_NAME_LENGTH)
      : "Candidate";
  const details =
    typeof raw.details === "string" && raw.details.trim()
      ? raw.details.trim().slice(0, MAX_CANDIDATE_DETAIL_LENGTH)
      : null;
  const sourceLabel =
    typeof raw.sourceLabel === "string" && raw.sourceLabel.trim()
      ? raw.sourceLabel.trim().slice(0, MAX_CANDIDATE_NAME_LENGTH)
      : null;
  if (!id || !details) {
    return null;
  }
  return {
    id,
    name,
    details,
    sourceLabel,
  };
};

const sanitizeCandidateList = (value: unknown, maxCandidates: number) => {
  if (!Array.isArray(value)) return null;
  const sanitized = value
    .map(sanitizeCandidateEntry)
    .filter((candidate): candidate is CandidateInput => Boolean(candidate));
  if (!sanitized.length || sanitized.length > maxCandidates) {
    return null;
  }
  return sanitized;
};

const buildPrompt = (
  jobDescription: string,
  candidates: CandidateInput[]
) => {
  const candidateBlocks = candidates
    .map((candidate, index) => {
      const header = [
        `Candidate #${index + 1}`,
        `CandidateId: ${candidate.id}`,
        `ProvidedName: ${candidate.name}`,
        `SourceLabel: ${candidate.sourceLabel ?? "N/A"}`,
      ].join("\n");
      return `${header}\nCV_TEXT:\n${candidate.details}`;
    })
    .join("\n\n");

  return [
    "JOB DESCRIPTION:",
    jobDescription,
    "",
    "CANDIDATE PROFILES:",
    candidateBlocks,
    "",
    `TASK:
Analyze how well each candidate matches the job description.
Return a strict JSON object with this exact structure:
    {
      "results": [
        {
          "id": "candidate-id",
          "name": "Candidate Name",
          "fitScore": 0-100 number (can include decimals),
          "explanation": "1-2 short sentences (max 35 words) explaining the score referencing the job requirements and CV details."
        }
      ]
    }

Scoring rules:
- Use 0-100 scores (decimals allowed). Reserve 95+ only for near-perfect matches.
- Use a dot for decimals (e.g., 97.84). Do not use commas as decimal separators.
- Keep explanations brief. If the output would be too long, shorten explanations instead of skipping candidates.
- If a CV clearly does not match the job (different tech stack, no relevant experience), keep fitScore <= 8 and explain why.
- Strong overlaps on required stacks, seniority, and years of experience should push scores above 70.
- Mention concrete reasoning (skills, years, seniority, domain) in explanations and reference gaps when lowering the score.
- You must return one entry per candidate id.`
      .replace(/\n{3,}/g, "\n\n"),
  ].join("\n");
};

const buildAiRequest = (
  jobDescription: string,
  candidates: CandidateInput[]
) => ({
  model: MODEL,
  text: { format: { type: "json_object" } },
  input: [
    {
      role: "system",
      content:
        "You are OmniFAIND's senior technical recruiter. Evaluate how well each CV matches the job description and respond with strict JSON only, no markdown or extra text.",
    },
    {
      role: "user",
      content: buildPrompt(jobDescription, candidates),
    },
  ],
  max_output_tokens: Math.min(
    5000,
    Math.max(1200, 600 + candidates.length * 120)
  ),
  temperature: 0,
});

const extractJsonContent = (payload: unknown) => {
  if (
    payload &&
    typeof payload === "object" &&
    "output" in payload &&
    Array.isArray((payload as { output: unknown }).output)
  ) {
    const outputArray = (payload as { output: Array<{ content?: unknown }> })
      .output;
    const content = outputArray[0]?.content;
    if (Array.isArray(content)) {
      for (const item of content) {
        if (
          item &&
          typeof item === "object" &&
          "text" in item &&
          typeof (item as { text?: string }).text === "string"
        ) {
          return (item as { text: string }).text;
        }
        if (item && typeof item === "object" && "json" in item) {
          const jsonPayload = (item as { json?: unknown }).json;
          if (jsonPayload && typeof jsonPayload === "object") {
            return JSON.stringify(jsonPayload);
          }
        }
      }
    }
  }
  if (
    payload &&
    typeof payload === "object" &&
    "output_text" in payload &&
    typeof (payload as { output_text?: string }).output_text === "string"
  ) {
    return (payload as { output_text: string }).output_text;
  }
  return null;
};

const parseAiResults = (rawText: string | null) => {
  if (!rawText) {
    throw new Error("AI response did not contain any text.");
  }
  let parsed: unknown;
  try {
    const trimmed = rawText.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const payloadText = fencedMatch ? fencedMatch[1].trim() : trimmed;
    const normalizedPayload = payloadText.replace(/(\d),(\d)/g, "$1.$2");
    const start = normalizedPayload.indexOf("{");
    const end = normalizedPayload.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      parsed = JSON.parse(normalizedPayload.slice(start, end + 1));
    } else {
      parsed = JSON.parse(normalizedPayload);
    }
  } catch {
    try {
      const trimmed = rawText.trim();
      const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const payloadText = fencedMatch ? fencedMatch[1].trim() : trimmed;
      const normalizedPayload = payloadText.replace(/(\d),(\d)/g, "$1.$2");
      const lastObjectEnd = normalizedPayload.lastIndexOf("}");
      const resultsIndex = normalizedPayload.indexOf('"results"');
      const arrayStart = normalizedPayload.indexOf("[", resultsIndex);
      if (resultsIndex !== -1 && arrayStart !== -1 && lastObjectEnd !== -1) {
        const repaired = `${normalizedPayload.slice(
          0,
          lastObjectEnd + 1
        )}]}`
          .replace(/,?\s*]}$/, "]}");
        parsed = JSON.parse(repaired);
      } else {
        throw new Error("Unable to repair JSON.");
      }
    } catch {
      if (DEBUG_SCREENING_ERRORS) {
        throw new Error(
          `AI response is not valid JSON. Raw: ${rawText.slice(0, 1200)}`
        );
      }
      throw new Error("AI response is not valid JSON.");
    }
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("results" in parsed) ||
    !Array.isArray((parsed as { results: unknown }).results)
  ) {
    throw new Error("AI response is missing the results array.");
  }
  const entries = (parsed as { results: unknown }).results as unknown[];
  return entries
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const raw = entry as Record<string, unknown>;
      const id =
        typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : null;
      const name =
        typeof raw.name === "string" && raw.name.trim()
          ? raw.name.trim().slice(0, MAX_CANDIDATE_NAME_LENGTH)
          : "Candidate";
      const fitScore =
        typeof raw.fitScore === "number" && Number.isFinite(raw.fitScore)
          ? Math.min(100, Math.max(0, raw.fitScore))
          : null;
      const explanation =
        typeof raw.explanation === "string" && raw.explanation.trim()
          ? raw.explanation.trim()
          : null;
      if (!id || fitScore === null || !explanation) {
        return null;
      }
      return { id, name, fitScore, explanation } as AiCandidateResult;
    })
    .filter((entry): entry is AiCandidateResult => Boolean(entry));
};

const mergeAiResults = (
  candidates: CandidateInput[],
  aiResults: AiCandidateResult[]
) => {
  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const usedIds = new Set<string>();

  const merged = aiResults
    .map((result) => {
      const candidate = candidateMap.get(result.id);
      if (!candidate) {
        return null;
      }
      usedIds.add(result.id);
      return {
        id: candidate.id,
        name: candidate.name || result.name,
        fitScore: result.fitScore,
        explanation: result.explanation.slice(0, 600),
      };
    })
    .filter((entry): entry is AiCandidateResult => Boolean(entry));

  const missing = candidates
    .filter((candidate) => !usedIds.has(candidate.id))
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      fitScore: 8,
      explanation:
        "AI response did not include this candidate. Please rerun screening for a fresh evaluation.",
    }));

  const combined = [...merged, ...missing];
  combined.sort((a, b) => {
    if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
    return a.name.localeCompare(b.name);
  });

  return combined.map((entry, index) => ({
    id: entry.id,
    name: entry.name,
    fitScore: entry.fitScore,
    rank: index + 1,
    explanation: entry.explanation,
  }));
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
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
        { error: "Job description is required for screening." },
        { status: 400 }
      );
    }

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditsRemaining: true, subscriptionPlan: true },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const planId =
      normalizeSubscriptionPlan(account.subscriptionPlan) ??
      DEFAULT_SUBSCRIPTION_PLAN;
    const maxCandidates = getPlanScreeningLimit(planId);
    const candidateList = sanitizeCandidateList(
      payload?.candidates,
      maxCandidates
    );

    if (!candidateList) {
      return NextResponse.json(
        {
          error: `Provide between 1 and ${maxCandidates} candidates, each with an id and CV text.`,
        },
        { status: 400 }
      );
    }

    const candidateCount = candidateList.length;
    const creditsNeeded = Number(
      (candidateCount * CREDITS_PER_CV).toFixed(2)
    );

    const accountCredits = Number(account.creditsRemaining);
    if (accountCredits + 1e-6 < creditsNeeded) {
      return insufficientCreditsResponse(accountCredits);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY." },
        { status: 503 }
      );
    }

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildAiRequest(jobDescription, candidateList)),
    });

    if (!aiResponse.ok) {
      const errorPayload = await aiResponse.json().catch(() => null);
      return NextResponse.json(
        {
          error:
            errorPayload?.error?.message ||
            "AI service failed while analyzing candidates.",
        },
        { status: aiResponse.status }
      );
    }

    const aiPayload = await aiResponse.json().catch(() => null);
    const aiText = extractJsonContent(aiPayload);
    const aiResults = parseAiResults(aiText);
    if (!aiResults.length) {
      throw new Error("AI response did not include any candidate scores.");
    }

    const deduction = await prisma.user.updateMany({
      where: {
        id: userId,
        creditsRemaining: { gte: creditsNeeded },
      },
      data: {
        creditsRemaining: { decrement: creditsNeeded },
      },
    });

    if (deduction.count === 0) {
      const latest = await prisma.user.findUnique({
        where: { id: userId },
        select: { creditsRemaining: true },
      });
      return insufficientCreditsResponse(
        latest ? Number(latest.creditsRemaining) : 0
      );
    }

    const mergedResults = mergeAiResults(candidateList, aiResults);

    const updatedCredits = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditsRemaining: true },
    });

    return NextResponse.json({
      results: mergedResults,
      creditsRemaining: updatedCredits
        ? Number(updatedCredits.creditsRemaining)
        : 0,
    });
  } catch (error) {
    console.error("Failed to analyze candidates", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while analyzing candidates.",
      },
      { status: 500 }
    );
  }
}
