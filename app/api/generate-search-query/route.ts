import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/app/api/projects/utils";

const MODEL = "gpt-4.1-mini";
const CREDITS_PER_SEARCH = 1;
const OPENAI_TIMEOUT_MS = 20000;

const fetchWithTimeout = async (
  input: Parameters<typeof fetch>[0],
  init?: RequestInit,
  timeoutMs = OPENAI_TIMEOUT_MS
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const LINKEDIN_SYSTEM_PROMPT = `Pretvori korisnicki upit u optimalan Google sourcing query za LinkedIn.
Pravila:
1. Query uvek pocinje sa: site:linkedin.com/in (ili sa lokalizovanim domenom, npr. site:rs.linkedin.com/in kada je jasno da je lokacija u Srbiji).
2. Titlovi moraju biti prosireni na realne varijante (npr. "C developer" OR "C/C++ developer" OR "Embedded C" OR "C programmer" OR "Firmware engineer").
3. Lokacije moraju sadrzati sve relevantne varijacije (npr. "Nis" OR "Nis, Serbia" OR "Serbia North").
4. Minus filteri su uvek i iskljucivo: -"bootcamp" -"teacher" -"instructor" -"course".
5. Svaka OR grupa mora biti u zagradama: ("X" OR "Y").
6. Svaka dodatna komponenta (iskustvo, vestine, lokacije) mora se nalaziti u sopstvenim zagradama.
7. Vrati samo finalni query bez dodatnog teksta ili objasnjenja.
8. Ako korisnik izricito trazi da kandidati ne budu odredjene nacionalnosti i navede tu nacionalnost, dodaj odgovarajuce minus filtere (npr. -"Russian" -"Ukrainian"). U suprotnom ignorisi nacionalnosti.
9. Za entry-level ili profile do 2 godine iskustva koristi termine koje LinkedIn prepoznaje (npr. "junior", "intern", "trainee", "entry level") umesto fraza "0 years experience".
10. Ignorisi eksplicitno navodjenje godina (tipa "1 year experience") i usmeri se na realne titlove koji signaliziraju senioritet.
11. Kada korisnik navede grad skraceno (npr. "LA", "SF", "NYC") ili kratkim nazivom, u lokacijskoj OR grupi koristi iskljucivo taj zapis i eventualno jednu jasnu dopunu koja sigurno oznacava isti grad (npr. "Los Angeles" ili "California"). Nikada ne dodaj druge gradove, drzave ili regione koji nisu eksplicitno trazeni kako bi se izbegle pogresne lokacije.`;

const UPWORK_SYSTEM_PROMPT = `Pretvori korisnicki upit u optimalan Google sourcing query za Upwork freelancere.
Pravila:
1. Query uvek pocinje sa: site:upwork.com/freelancers
2. Titlovi i skillovi moraju biti prosireni na realne varijante (npr. "UX designer" OR "Product designer" OR "UI/UX designer").
3. Ako je lokacija pomenuta, dodaj je kao OR grupu (npr. ("Serbia" OR "Belgrade")).
4. Minus filteri su: -"agency" -"agencies" -"course" -"bootcamp" -"teacher" -"instructor".
5. Svaka OR grupa mora biti u zagradama.
6. Vrati samo finalni query bez dodatnog teksta ili objasnjenja.`;

const GITHUB_SYSTEM_PROMPT = `Pretvori korisnicki upit u optimalan Google sourcing query za GitHub profile.
Pravila:
1. Query uvek pocinje sa: site:github.com
2. Fokus na role/skill varijante kroz OR grupe.
3. Svaka OR grupa mora biti u zagradama.
4. Vrati samo finalni query bez dodatnog teksta ili objasnjenja.`;

const insufficientCreditsResponse = (creditsRemaining: number) =>
  NextResponse.json(
    {
      error:
        "You are out of credits. Buy credits or upgrade your plan to continue searching.",
      creditsRemaining,
    },
    { status: 402 }
  );

export async function POST(request: NextRequest) {
  try {
    const { prompt, platform } = (await request.json()) as {
      prompt?: string;
      platform?: string;
    };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }
    const normalizedPlatform =
      typeof platform === "string" ? platform.trim().toLowerCase() : "linkedin";
    const systemPrompt =
      normalizedPlatform === "upwork"
        ? UPWORK_SYSTEM_PROMPT
        : normalizedPlatform === "github"
        ? GITHUB_SYSTEM_PROMPT
        : LINKEDIN_SYSTEM_PROMPT;

    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditsRemaining: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

    const accountCredits = Number(account.creditsRemaining);

    if (accountCredits < CREDITS_PER_SEARCH) {
      return insufficientCreditsResponse(accountCredits);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY." },
        { status: 503 }
      );
    }

    const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_output_tokens: 512,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      return NextResponse.json(
        {
          error:
            errorPayload?.error?.message ||
            "OpenAI request failed while generating query.",
        },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };

    const aiText =
      data.output?.[0]?.content?.find((item) => typeof item.text === "string")
        ?.text || null;

    if (!aiText) {
      return NextResponse.json(
        { error: "OpenAI response did not contain query text." },
        { status: 502 }
      );
    }

    const query = aiText.trim();
    if (!query.toLowerCase().startsWith("site:")) {
      return NextResponse.json(
        { error: "Generated query did not follow the required format." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      query,
      creditsRemaining: accountCredits,
    });
  } catch (error) {
    console.error("Failed to generate AI query", error);
    return NextResponse.json(
      { error: "Unexpected error while generating AI query." },
      { status: 500 }
    );
  }
}
