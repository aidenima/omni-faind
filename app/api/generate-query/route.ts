import { NextRequest, NextResponse } from "next/server";

type AiCompletionResponse = {
  choices?: {
    message?: {
      content?: string | null;
    };
  }[];
};

const OPENAI_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const AI_SYSTEM_PROMPT = `
You are an expert technical sourcer. Given a natural-language prompt (in English or Serbian),
produce an advanced Google query optimized for LinkedIn profiles.
Always follow these rules:
- The query must start with site:linkedin.com/in
- Translate every role, industry, and location from the user prompt into English before using it.
- If the prompt specifies a geography, include explicit location filters in the query (e.g., "Serbia" or "Belgrade") and add common synonyms or nearby cities when helpful.
- Wrap every multi word role, skill, industry, or location inside double quotes, and use OR groups for equivalent locations or titles when it helps match the prompt more closely.
- When the user specifies years of experience (e.g., "3+ years" or "5 godina iskustva"), include exact representations such as "3 years experience", "3 yrs", or "three years" and never invent phrases like "more than 3 years".
- Normalize technologies or frameworks to their commonly used form on professional profiles (e.g., ".NET" instead of "dotnet") before placing them in the query.
- If the prompt mentions exclusions, use operators like -country or -"keyword" to keep unwanted people out.
- If the prompt asks for owners/founders/C-level personas, explicitly include those owner/founder keywords in English.
- Keep the query concise but faithful to the user's requirements, including seniority, certifications, industries, and any other constraints.
- Only respond with JSON in the format { "query": "..." } and nothing else, and the query itself must be in English.
`;

const cleanAiJson = (content: string) =>
  content.replace(/```json/gi, "").replace(/```/g, "").trim();

const extractQueryFromAi = (content: string) => {
  try {
    const normalized = cleanAiJson(content);
    const parsed = JSON.parse(normalized);
    if (parsed && typeof parsed.query === "string") {
      return parsed.query.trim();
    }
  } catch (error) {
    console.warn("Failed to parse AI response", error);
  }
  return null;
};

const ensureLinkedInFilter = (query: string) => {
  if (!query.toLowerCase().includes("site:linkedin.com/in")) {
    return `site:linkedin.com/in ${query}`.trim();
  }
  return query.trim();
};

export async function POST(request: NextRequest) {
  try {
    const { prompt } = (await request.json()) as { prompt?: string };
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in environment." },
        { status: 503 }
      );
    }

    const response = await fetch(OPENAI_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT.trim() },
          { role: "user", content: prompt.trim() },
        ],
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorPayload?.error || "OpenAI request failed." },
        { status: response.status }
      );
    }

    const data = (await response.json()) as AiCompletionResponse;
    const aiMessage = data.choices?.[0]?.message?.content?.trim();

    if (!aiMessage) {
      return NextResponse.json(
        { error: "AI response is empty." },
        { status: 502 }
      );
    }

    const aiQuery = extractQueryFromAi(aiMessage);
    if (!aiQuery) {
      return NextResponse.json(
        { error: "AI response does not include a valid query." },
        { status: 422 }
      );
    }

    return NextResponse.json({ query: ensureLinkedInFilter(aiQuery) });
  } catch (error) {
    console.error("AI query generation failed", error);
    return NextResponse.json(
      { error: "Unexpected server error while generating query." },
      { status: 500 }
    );
  }
}
