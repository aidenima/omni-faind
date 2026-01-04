import { NextRequest, NextResponse } from "next/server";
import {
  findProjectBySlug,
  requireUserId,
} from "@/app/api/projects/utils";
import { prisma } from "@/lib/prisma";

type OutreachChannel = "linkedin" | "upwork" | "github";
type OutreachLanguage =
  | "en"
  | "sr"
  | "es"
  | "it"
  | "de"
  | "fr"
  | "zh"
  | "ja"
  | "nl"
  | "hu"
  | "sv"
  | "no"
  | "fi"
  | "bg"
  | "ro"
  | "ru"
  | "uk"
  | "mk"
  | "el"
  | "tr";

type CandidatePayload = {
  name: string;
  profileUrl: string;
  snippet: string | null;
  rawSnippet: string | null;
  source: string | null;
};

const MODEL = "gpt-4.1-mini";
const MAX_SNIPPET_LENGTH = 800;
const OUTREACH_CREDIT_COST = 0.2;

const CHANNEL_GUIDELINES: Record<OutreachChannel, string> = {
  linkedin:
    "Write as a concise LinkedIn DM (3-4 sentences). Reference one relevant achievement from the lead context and explain the value of the project. Close with a clear CTA for a short intro call or quick reply on LinkedIn.",
  upwork:
    "Write as an Upwork proposal. Highlight how the project description matches their skills, mention concrete next steps, and invite them to reply inside Upwork or schedule a chat.",
  github:
    "Write as a GitHub direct message or email referencing their open-source work. Mention what stood out from the lead context and invite them to connect for a collaboration conversation.",
};

const sanitizeString = (value: unknown, limit = 400) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, limit);
};

const sanitizeSnippet = (value: unknown) => {
  const sanitized = sanitizeString(value, MAX_SNIPPET_LENGTH);
  return sanitized ?? null;
};

const sanitizeChannel = (value: unknown): OutreachChannel | null => {
  if (value === "linkedin" || value === "upwork" || value === "github") {
    return value;
  }
  return null;
};

type LanguageGreetingConfig = {
  label: string;
  greetingMale: string;
  greetingFemale?: string;
  greetingNeutral?: string;
};

const LANGUAGE_CONFIG: Record<OutreachLanguage, LanguageGreetingConfig> = {
  en: { label: "English", greetingMale: "Hi", greetingNeutral: "Hi" },
  sr: {
    label: "Serbian",
    greetingMale: "Poštovani",
    greetingFemale: "Poštovana",
    greetingNeutral: "Zdravo",
  },
  es: { label: "Spanish", greetingMale: "Hola", greetingNeutral: "Hola" },
  it: { label: "Italian", greetingMale: "Ciao", greetingNeutral: "Ciao" },
  de: { label: "German", greetingMale: "Hallo", greetingNeutral: "Hallo" },
  fr: { label: "French", greetingMale: "Bonjour", greetingNeutral: "Bonjour" },
  zh: { label: "Chinese", greetingMale: "Ni hao", greetingNeutral: "Ni hao" },
  ja: {
    label: "Japanese",
    greetingMale: "Konnichiwa",
    greetingNeutral: "Konnichiwa",
  },
  nl: { label: "Dutch", greetingMale: "Hallo", greetingNeutral: "Hallo" },
  hu: { label: "Hungarian", greetingMale: "Szia", greetingNeutral: "Szia" },
  sv: { label: "Swedish", greetingMale: "Hej", greetingNeutral: "Hej" },
  no: { label: "Norwegian", greetingMale: "Hei", greetingNeutral: "Hei" },
  fi: { label: "Finnish", greetingMale: "Hei", greetingNeutral: "Hei" },
  bg: { label: "Bulgarian", greetingMale: "Здравейте", greetingNeutral: "Здравейте" },
  ro: { label: "Romanian", greetingMale: "Salut", greetingNeutral: "Salut" },
  ru: { label: "Russian", greetingMale: "Здравствуйте", greetingNeutral: "Здравствуйте" },
  uk: { label: "Ukrainian", greetingMale: "Привіт", greetingNeutral: "Привіт" },
  mk: { label: "Macedonian", greetingMale: "Поздрав", greetingNeutral: "Поздрав" },
  el: { label: "Greek", greetingMale: "Γεια σας", greetingNeutral: "Γεια σας" },
  tr: { label: "Turkish", greetingMale: "Merhaba", greetingNeutral: "Merhaba" },
};

const sanitizeLanguage = (value: unknown): OutreachLanguage =>
  typeof value === "string" && value in LANGUAGE_CONFIG
    ? (value as OutreachLanguage)
    : "en";

const applySerbianVocative = (name: string, isFemale: boolean) => {
  const trimmed = name.trim();
  if (!trimmed) return name;

  if (isFemale) {
    if (/ica$/i.test(trimmed)) {
      return trimmed.replace(/ica$/i, "ice");
    }
    if (/ka$/i.test(trimmed)) {
      return trimmed.replace(/ka$/i, "ke");
    }
    if (/ra$/i.test(trimmed)) {
      return trimmed.replace(/ra$/i, "ro");
    }
    if (/na$/i.test(trimmed)) {
      return trimmed.replace(/na$/i, "no");
    }
    if (/la$/i.test(trimmed)) {
      return trimmed.replace(/la$/i, "lo");
    }
    if (/a$/i.test(trimmed)) {
      return `${trimmed.slice(0, -1)}o`;
    }
    return trimmed;
  }

  if (/([aeiou])$/i.test(trimmed)) {
    if (/a$/i.test(trimmed)) {
      return `${trimmed.slice(0, -1)}e`;
    }
    return trimmed;
  }

  if (/ar$/i.test(trimmed)) {
    if (trimmed.length <= 5) {
      return `${trimmed.slice(0, -2)}re`;
    }
    return `${trimmed}e`;
  }

  if (/k$/i.test(trimmed) || /g$/i.test(trimmed)) {
    return `${trimmed}u`;
  }

  if (
    /(n|m|r|š|ć|ž|č|đ|j)$/i.test(trimmed) ||
    /(in|en|on)$/i.test(trimmed)
  ) {
    return `${trimmed}e`;
  }

  return `${trimmed}e`;
};

const applyLocalizedNameCase = (
  language: OutreachLanguage,
  firstName: string,
  isFemale: boolean
) => {
  if (language === "sr") {
    return applySerbianVocative(firstName, isFemale);
  }
  return firstName;
};

const buildGreetingPrefix = (
  language: OutreachLanguage,
  isFemale: boolean
) => {
  const config = LANGUAGE_CONFIG[language] ?? LANGUAGE_CONFIG.en;
  if (isFemale && config.greetingFemale) {
    return config.greetingFemale;
  }
  return config.greetingMale || config.greetingNeutral || "Hi";
};

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zа-яășțёїіјѓћќўњљџ]+/g, "");

const isLikelyFemaleName = (firstName: string) => {
  const normalized = normalizeName(firstName);
  if (!normalized) return false;
  const FEMALE_SUFFIXES = [
    "a",
    "ia",
    "ya",
    "na",
    "ta",
    "ra",
    "la",
    "sa",
    "za",
    "sha",
    "nja",
    "ija",
  ];
  return FEMALE_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
};


const sanitizeCandidate = (value: unknown): CandidatePayload | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const name = sanitizeString(raw.name, 160);
  const profileUrl = sanitizeString(raw.profileUrl, 500);
  if (!name || !profileUrl) {
    return null;
  }
  return {
    name,
    profileUrl,
    snippet: sanitizeSnippet(raw.snippet),
    rawSnippet: sanitizeSnippet(raw.rawSnippet),
    source: sanitizeString(raw.source, 40),
  };
};

const deriveFirstName = (fullName: string) => {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return "there";
  }
  const tokens = trimmed.split(/\s+/);
  for (const token of tokens) {
    const cleaned = token.replace(/[^\p{L}'-]/gu, "");
    if (cleaned) {
      return cleaned;
    }
  }
  return trimmed;
};

const buildUserPrompt = ({
  projectName,
  projectDescription,
  candidate,
  channel,
  language,
}: {
  projectName: string;
  projectDescription: string;
  candidate: CandidatePayload;
  channel: OutreachChannel;
  language: OutreachLanguage;
}) => {
  const snippet =
    candidate.snippet || candidate.rawSnippet || "No additional summary provided.";
  const config = LANGUAGE_CONFIG[language] ?? LANGUAGE_CONFIG.en;
  const languageLabel = config.label;
  const firstName = deriveFirstName(candidate.name);
  const isFemale = isLikelyFemaleName(firstName);
  const localizedName = applyLocalizedNameCase(language, firstName, isFemale);
  const greeting = `${buildGreetingPrefix(language, isFemale)} ${localizedName}`;
  const localizedGrammarGuideline =
    language === "sr"
      ? "SerbianGrammarGuideline: Use correct Serbian cases (vocative for names like 'Božidare', 'Milice') and idiomatic terminology (npr. 'mašinci' umesto 'mašinisti')."
      : "";

  return `
Write a personalized cold outreach message.
Output language: ${languageLabel}
Greeting: Start the message with "${greeting}"
LeadFirstName: ${firstName}
LeadFullName: ${candidate.name}
LeadProfile: ${candidate.profileUrl}
LeadSource: ${candidate.source ?? "unknown"}
LeadSummary: ${snippet}

ProjectName: ${projectName}
ProjectDescription: ${projectDescription}

Channel: ${channel}
ChannelGuidelines: ${CHANNEL_GUIDELINES[channel]}
${localizedGrammarGuideline}
ToneGuideline: Keep the tone warm, human, and conversational—avoid stiff corporate phrases or AI clichés.

Rules:
1. Address the lead using only the provided first name (never mention the last name).
2. Keep the note under 120 words.
3. Reference one detail from the project description and one detail from the lead summary.
4. Close with a specific CTA that fits the channel (e.g., connect here, reply on Upwork, schedule a call).
5. Do not include markdown, bullet lists, or emojis. Return plain text with 2-4 short sentences.
6. Apply the correct grammatical case for the greeting in languages that require it (e.g., vocative in Serbian).`.trim();
};

type RouteParams = {
  slug: string;
};

type RouteContext = {
  params: Promise<RouteParams> | RouteParams;
};

const resolveSlugParam = async (contextParams: RouteContext["params"]) => {
  if (contextParams instanceof Promise) {
    const resolved = await contextParams;
    return resolved.slug;
  }
  return contextParams.slug;
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

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditsRemaining: true },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const accountCredits = Number(account.creditsRemaining);

    if (accountCredits < OUTREACH_CREDIT_COST) {
      return NextResponse.json(
        {
          error:
            "You are out of credits. Buy credits or upgrade your plan to continue generating outreach.",
          creditsRemaining: accountCredits,
        },
        { status: 402 }
      );
    }

    const payload = await request.json().catch(() => null);
    const channel = sanitizeChannel(payload?.channel);
    if (!channel) {
      return NextResponse.json(
        { error: "A valid outreach channel is required." },
        { status: 400 }
      );
    }

    const candidate = sanitizeCandidate(payload?.candidate);
    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate name and profile URL are required." },
        { status: 400 }
      );
    }

    const language = sanitizeLanguage(payload?.language);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY." },
        { status: 503 }
      );
    }

    const systemPrompt = `You are OmniFAIND's outreach assistant. Craft concise, personalized cold messages based on the provided project and lead context. Always follow the rules exactly and keep the tone confident yet respectful.`;
    const userPrompt = buildUserPrompt({
      projectName: project.name,
      projectDescription: project.description,
      candidate,
      channel,
      language,
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_output_tokens: 400,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      return NextResponse.json(
        {
          error:
            errorPayload?.error?.message ||
            "OpenAI request failed while generating outreach.",
        },
        { status: response.status }
      );
    }

    const data = (await response.json().catch(() => null)) as {
      output?: Array<{ content?: Array<{ text?: string }> }>;
    } | null;

    const aiText =
      data?.output?.[0]?.content?.find((item) => typeof item.text === "string")
        ?.text || null;

    if (!aiText) {
      return NextResponse.json(
        { error: "AI response did not contain outreach text." },
        { status: 502 }
      );
    }

    const deduction = await prisma.user.updateMany({
      where: {
        id: userId,
        creditsRemaining: { gte: OUTREACH_CREDIT_COST },
      },
      data: {
        creditsRemaining: { decrement: OUTREACH_CREDIT_COST },
      },
    });

    if (deduction.count === 0) {
      const latest = await prisma.user.findUnique({
        where: { id: userId },
        select: { creditsRemaining: true },
      });
      return NextResponse.json(
        {
          error:
            "You are out of credits. Buy credits or upgrade your plan to continue generating outreach.",
          creditsRemaining: latest ? Number(latest.creditsRemaining) : 0,
        },
        { status: 402 }
      );
    }

    const updatedCredits = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditsRemaining: true },
    });

    return NextResponse.json({
      message: aiText.trim(),
      creditsRemaining: updatedCredits
        ? Number(updatedCredits.creditsRemaining)
        : 0,
    });
  } catch (error) {
    console.error("Failed to generate outreach message", error);
    return NextResponse.json(
      { error: "Unexpected error while generating outreach." },
      { status: 500 }
    );
  }
}
