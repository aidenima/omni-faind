"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Language = "en" | "sr";

type StepCopy = {
  label: string;
  title: string;
  detail: string;
};

type SeoCard = {
  title: string;
  body: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type PricingPlan = {
  name: string;
  monthlyPrice: number;
  description: string;
  monthlyCredits: number;
  creditFeature: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
};

type HomeCopy = {
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  heroNote: string;
  sectionTitle: string;
  sectionSubtitle: string;
  stepLabel: string;
  featuresTitle: string;
  feature1Title: string;
  feature1Body: string;
  feature2Title: string;
  feature2Body: string;
  feature3Title: string;
  feature3Body: string;
  langLabel: string;
  screeningSectionTitle: string;
  screeningSectionSubtitle: string;
  screeningLimitNote: string;
  pricingTitle: string;
  pricingSubtitle: string;
  pricingCta: string;
  pricingToggleLabel: string;
  pricingMonthly: string;
  pricingYearly: string;
  pricingDiscountNote: string;
  seoBadge: string;
  seoTitle: string;
  seoDescription: string;
  seoListTitle: string;
  seoListItems: string[];
  seoCards: SeoCard[];
  faqTitle: string;
  faqItems: FaqItem[];
  sourcingSteps: StepCopy[];
  screeningSteps: StepCopy[];
  pricingPlans: PricingPlan[];
};

const translations: Record<Language, Partial<HomeCopy>> = {
  en: {
    heroTitle: "Source smarter, screen faster, with AI on your team.",
    heroSubtitle:
      "Describe the talent or buyer you need in natural language. OmniFAIND interprets the intent, finds relevant profiles, and soon will run full AI screening for you.",
    heroCta: "Open dashboard",
    heroNote: "MVP preview · internal testing only",
    sectionTitle: "How it works",
    sectionSubtitle: "Three sourcing steps from prompt to candidates",
    stepLabel: "Step",
    featuresTitle: "Why OmniFAIND?",
    feature1Title: "Natural language prompts",
    feature1Body:
      "No boolean strings or manual filters. Just explain who you need—skills, seniority, location, exclusions—and OmniFAIND handles the rest.",
    feature2Title: "Automated search",
    feature2Body:
      "We analyze your prompt, run a targeted sourcing flow behind the scenes, and capture multiple pages of relevant profiles.",
    feature3Title: "AI Screening assistant",
    feature3Body:
      "Upload CVs or share existing candidate links and get structured summaries of fit, risks, and suggested next actions.",
    langLabel: "Language",
    screeningSectionTitle: "Screening workflow",
    screeningSectionSubtitle:
      "Create a role-specific project, upload CVs or share candidate links, and let AI rank the best matches.",
    screeningLimitNote: "MVP preview supports up to 10 CV uploads per project.",
    pricingTitle: "Pricing",
    pricingSubtitle: "Pick a plan that scales with your team and credits.",
    pricingCta: "Start free trial",
    pricingToggleLabel: "Billing",
    pricingMonthly: "Monthly",
    pricingYearly: "Yearly (-20%)",
    pricingDiscountNote: "Get an extra 20% savings with annual billing.",
    seoBadge: "AI sourcing for professional networks",
    seoTitle: "Built for recruiters and sales teams",
    seoDescription:
      "Live where your candidates and prospects are: professional networks, talent hubs, and marketplaces - without noisy tabs or scattered spreadsheets.",
    seoListTitle: "Works where you hire",
    seoListItems: [
      "Built for professional networks and talent hubs recruiters use every day.",
      "Optimized for the workflows you know from LinkedIn-style search, plus other communities and freelance marketplaces.",
      "Enrich profiles, score fits, and generate outreach in one place.",
    ],
    seoCards: [
      {
        title: "LinkedIn-style search, without the noise",
        body: "Structure pro-network searches with AI hints for role, seniority, and location. Less manual filtering, more qualified shortlists.",
      },
      {
        title: "Built for recruiters and sales teams",
        body: "Share context, reuse winning searches, and keep sourcing and outreach aligned across hiring and prospecting.",
      },
      {
        title: "AI scoring & outreach",
        body: "Score fit, rank leads, and generate channel-ready outreach in seconds - no copy/paste across tools.",
      },
    ],
    faqTitle: "FAQ",
    faqItems: [
      {
        question: "Can I use this alongside LinkedIn search?",
        answer:
          "Yes. We're designed to complement your sourcing on professional networks. Bring your queries, and we help structure, qualify, and reach out faster.",
      },
      {
        question: "Does it work with other talent hubs?",
        answer:
          "Yes. OmniFAIND supports public professional networks, freelance marketplaces, and developer communities so you can source broadly and screen in one workspace.",
      },
      {
        question: "Who is it for?",
        answer:
          "Recruiters, sourcers, and sales teams who need AI help to generate searches, score fits, and send outreach across professional networks.",
      },
    ],
    sourcingSteps: [
      {
        label: "01",
        title: "Write your prompt",
        detail:
          "Describe the candidate profile, location, and exclusions in plain language.",
      },
      {
        label: "02",
        title: "AI interprets the intent",
        detail:
          "OmniFAIND translates the requirements into a targeted search flow tuned to your filters.",
      },
      {
        label: "03",
        title: "Review candidates",
        detail:
          "Scan the curated list, save leads, and prepare for automated screening output.",
      },
    ],
    screeningSteps: [
      {
        label: "01",
        title: "Create a project",
        detail:
          "Name the assignment (e.g., .NET Developer), add the job description, and outline the success criteria.",
      },
      {
        label: "02",
        title: "Upload CVs or candidate links",
        detail:
          "Drop as many CVs as your plan allows or provide candidate profile links so the assistant can analyze them.",
      },
      {
        label: "03",
        title: "AI screening & ranking",
        detail:
          "Receive a ranked list with fit scores, contact info, and candidate summaries aligned to the brief.",
      },
    ],
    pricingPlans: [
      {
        name: "Starter",
        monthlyPrice: 27,
        monthlyCredits: 100,
        description:
          "Perfect for solo sourcers who need focused AI-assisted searches with AI outreach built in.",
        creditFeature:
          "{credits} credits (mix sourcing searches or CV analyses)",
        features: [
          "Up to 50 contacts per sourcing run",
          "Up to 2 active projects",
          "AI shortlist & skill extraction",
          "AI outreach suggestions",
          "CSV or XLSX export",
          "1 user seat",
          "Email support",
        ],
      },
      {
        name: "Pro",
        monthlyPrice: 98,
        monthlyCredits: 400,
        description:
          "Grow your pipeline with more credits, priority automation, and AI outreach suggestions.",
        creditFeature:
          "{credits} credits (mix sourcing searches or CV analyses)",
        features: [
          "Up to 90 contacts per sourcing run",
          "Up to 5 active projects",
          "Priority sourcing runs",
          "AI outreach suggestions",
          "CSV or XLSX export",
          "1 user seat",
          "Priority support",
        ],
        highlight: true,
        badge: "Popular",
      },
      {
        name: "Agency",
        monthlyPrice: 789,
        monthlyCredits: 5000,
        description:
          "Designed for agencies needing enterprise throughput, AI outreach orchestration, and white-glove care.",
        creditFeature:
          "{credits} credits (mix sourcing searches or CV analyses)",
        features: [
          "Up to 150 contacts per sourcing run",
          "Up to 20 active projects",
          "AI outreach suggestions",
          "CSV or XLSX export",
          "Dedicated sourcing pipeline",
          "Custom scoring models",
          "5 user seats",
          "SLA 99.9%",
          "Dedicated engineer",
          "Tailored onboarding & integrations",
          "Top-tier support",
        ],
      },
    ],
  },
  sr: {
    heroTitle: "Pametniji sourcing i screening uz AI koji radi uz tebe.",
    heroSubtitle:
      "Opisi prirodnim jezikom kog kandidata ili kupca trazis. OmniFAIND razume nameru, pronalazi relevantne profile i uskoro ce raditi kompletan AI screening umesto tebe.",
    heroCta: "Otvori dashboard",
    heroNote: "MVP prikaz · interno testiranje",
    sectionTitle: "Kako radi",
    sectionSubtitle: "Tri koraka od prompta do kandidata",
    stepLabel: "Korak",
    featuresTitle: "Zasto OmniFAIND?",
    feature1Title: "Prirodni jezik",
    feature1Body:
      "Bez boolean izraza i rucnog filtriranja. Recima opisi senioritet, lokaciju i ogranicenja, a OmniFAIND odradi ostalo.",
    feature2Title: "Automatizovana pretraga",
    feature2Body:
      "Razumemo tvoj prompt, pokrecemo fokusiranu potragu i hvatamo vise stranica relevantnih profila.",
    feature3Title: "AI screening asistent",
    feature3Body:
      "Upload-uj CV ili podeli link ka kandidatu i dobices strukturisan pregled uskladjenosti, rizika i sledecih koraka.",
    langLabel: "Jezik",
    screeningSectionTitle: "Screening proces",
    screeningSectionSubtitle:
      "Otvori projekat za odredjenu poziciju, ubaci CV-je ili podeli linkove ka kandidatima i prepusti AI-ju da rangira najbolje.",
    screeningLimitNote: "MVP podrzava do 10 CV-ova po projektu.",
    pricingTitle: "Paketi",
    pricingSubtitle: "Izaberi plan koji odgovara tvom timu i kreditima.",
    pricingCta: "Pokreni trial",
    pricingToggleLabel: "Naplaćivanje",
    pricingMonthly: "Mesečno",
    pricingYearly: "Godišnje (-20%)",
    pricingDiscountNote: "Uz godišnje plaćanje dobijaš dodatnih 20% popusta.",
    sourcingSteps: [
      {
        label: "01",
        title: "Upisi prompt",
        detail:
          "Opisi kandidat/klijenta, senioritet, lokaciju i sta zelis da izbegnes prirodnim jezikom.",
      },
      {
        label: "02",
        title: "AI tumaci nameru",
        detail:
          "OmniFAIND prevodi zahtev u fokusiranu pretragu i prilagodjava je tvojim filterima.",
      },
      {
        label: "03",
        title: "Pregled kandidata",
        detail:
          "Pregledaj listu profila, sacuvaj leadove i spremi se za automatizovane screening izvestaje.",
      },
    ],
    screeningSteps: [
      {
        label: "01",
        title: "Kreiraj projekat",
        detail:
          "Imenuj poziciju (npr. .NET Developer), dodaj oglas i naglasi sta je klijentu najbitnije.",
      },
      {
        label: "02",
        title: "Ubaci CV-je ili linkove ka kandidatima",
        detail:
          "Ubaci onoliko CV-jeva koliko plan dozvoljava ili podeli linkove ka kandidatima kako bi asistent mogao da ih obradi.",
      },
      {
        label: "03",
        title: "AI screening i rangiranje",
        detail:
          "Dobijas rang listu sa fit skorovima, kontakt podacima i sumarnim opisom kandidata uskladjenim sa zahtevima.",
      },
    ],
    seoBadge: "AI sourcing za profesionalne mreze",
    seoTitle: "Pravljeno za regrutere i prodajne timove",
    seoDescription:
      "Budi tamo gde su kandidati i leadovi: profesionalne mreze, talent hubovi i marketplace-i, bez gomile tabova i razbacanih tabela.",
    seoListTitle: "Radi gde ti zaposljavas",
    seoListItems: [
      "Pravljeno za profesionalne mreze i talent hubove koje regruteri koriste svakog dana.",
      "Optimizovano za tok rada koji poznajes iz LinkedIn pretrage, plus zajednice i freelance marketplace-e.",
      "Obogati profile, oceni uklapanje i generisi outreach na jednom mestu.",
    ],
    seoCards: [
      {
        title: "LinkedIn pretraga bez suma",
        body: "Strukturisi pretrage uz AI savete za rolu, senioritet i lokaciju. Manje rucnog filtriranja, vise kvalifikovanih shortlista.",
      },
      {
        title: "Za regrutere i prodaju",
        body: "Podeli kontekst, ponovo koristi uspesne pretrage i drzi sourcing i outreach uskladjenim u hiring i prodaji.",
      },
      {
        title: "AI scoring i outreach",
        body: "Oceni fit, rangiraj leadove i generisi poruke spremne za kanale za par sekundi, bez kopiranja izmedju alata.",
      },
    ],
    faqTitle: "Najcesca pitanja",
    faqItems: [
      {
        question: "Mogu li ovo da koristim paralelno sa LinkedIn pretragom?",
        answer:
          "Da. Pravljeni smo da dopunimo tvoju pretragu na profesionalnim mrezama. Donesi svoje upite, a mi ih strukturisemo, kvalifikujemo i ubrzavamo outreach.",
      },
      {
        question: "Da li radi sa drugim talent hubovima?",
        answer:
          "Da. OmniFAIND podrzava javne profesionalne mreze, freelance marketplace-e i dev zajednice, tako da mozes siroko da trazis i analiziras kandidate u jednom prostoru.",
      },
      {
        question: "Za koga je ovo?",
        answer:
          "Za regrutere, sourcere i prodajne timove kojima treba AI pomoc da generisu pretrage, ocene uklapanje i posalju outreach preko profesionalnih mreza.",
      },
    ],
    pricingPlans: [
      {
        name: "Starter",
        monthlyPrice: 27,
        monthlyCredits: 100,
        description:
          "Idealno za solo regrutere koji žele fokusirane AI pretrage i AI outreach predloge.",
        creditFeature:
          "{credits} kredita (kombinuj sourcing i analize CV-jeva)",
        features: [
          "Do 50 kontakata po sourcing pretrazi",
          "Do 2 aktivna projekta",
          "AI shortlist i ekstrakcija veština",
          "AI outreach predlozi poruka",
          "CSV ili XLSX eksport",
          "1 korisnik",
          "E-mail podrška",
        ],
      },
      {
        name: "Pro",
        monthlyPrice: 98,
        monthlyCredits: 400,
        description:
          "Širi pipeline uz više kredita, prioritetnu automatizaciju i AI outreach poruke.",
        creditFeature:
          "{credits} kredita (sourcing pretrage ili analizirani CV-jevi)",
        features: [
          "Do 90 kontakata po sourcing pretrazi",
          "Do 5 aktivnih projekata",
          "Prioritetne sourcing pretrage",
          "AI outreach predlozi poruka",
          "CSV ili XLSX eksport",
          "1 korisnik",
          "Prioritetna podrška",
        ],
        highlight: true,
        badge: "Popularno",
      },
      {
        name: "Agency",
        monthlyPrice: 789,
        monthlyCredits: 5000,
        description:
          "Za agencije kojima treba enterprise obim, AI outreach orkestracija i posvećena podrška.",
        creditFeature:
          "{credits} kredita (sourcing upiti ili analizirani CV-jevi)",
        features: [
          "Do 150 kontakata po sourcing pretrazi",
          "Do 20 aktivnih projekata",
          "AI outreach predlozi poruka",
          "CSV ili XLSX eksport",
          "Dedicated sourcing pipeline",
          "Custom scoring modeli",
          "5 korisnika",
          "SLA 99.9%",
          "Dedicated inženjer",
          "Onboarding i integracije po meri",
          "Najviši nivo podrške",
        ],
      },
    ],
  },
};

const featureIcons = ["⚙️", "🔍", "🤖"] as const;

export default function HomePage() {
  const [language, setLanguage] = useState<Language>("en");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const copy: HomeCopy = { ...translations.en, ...translations[language] };
  const heroChips =
    language === "en"
      ? ["AI sourcing", "Prompt-to-query rules", "Screening preview"]
      : ["AI pretraga", "Prompt u query pravila", "Screening u najavi"];
  const heroStats =
    language === "en"
      ? [
          {
            label: "Prompt once, run everywhere",
            value: "AI sourcing autopilot",
          },
          {
            label: "Screen & score faster",
            value: "CV analysis in seconds",
          },
          {
            label: "Credits that flex",
            value: "Mix sourcing + CV reviews",
          },
        ]
      : [
          {
            label: "Jedan prompt za sve kanale",
            value: "AI sourcing autopilot",
          },
          {
            label: "Brži screening",
            value: "Analiza CV-ja za par sekundi",
          },
          {
            label: "Fleks krediti",
            value: "Kombinuj sourcing i CV review",
          },
        ];
  const seoBadge = copy.seoBadge ?? translations.en.seoBadge;
  const seoTitle = copy.seoTitle ?? translations.en.seoTitle;
  const seoDescription =
    copy.seoDescription ?? translations.en.seoDescription;
  const seoListTitle = copy.seoListTitle ?? translations.en.seoListTitle;
  const seoListItems = copy.seoListItems ?? translations.en.seoListItems;
  const seoCards = copy.seoCards ?? translations.en.seoCards;
  const faqTitle = copy.faqTitle ?? translations.en.faqTitle;
  const faqItems = copy.faqItems ?? translations.en.faqItems;
  const featureCards = [
    {
      title: copy.feature1Title,
      body: copy.feature1Body,
      icon: featureIcons[0],
    },
    {
      title: copy.feature2Title,
      body: copy.feature2Body,
      icon: featureIcons[1],
    },
    {
      title: copy.feature3Title,
      body: copy.feature3Body,
      icon: featureIcons[2],
    },
  ];

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat(language === "en" ? "en-US" : "sr-RS", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `€${amount}`;
    }
  };

  const formatNumber = (value: number) => {
    try {
      return new Intl.NumberFormat(language === "en" ? "en-US" : "sr-RS").format(
        value
      );
    } catch {
      return `${value}`;
    }
  };

  const getPriceInfo = (plan: PricingPlan) => {
    if (billingCycle === "monthly") {
      const current = plan.monthlyPrice;
      return {
        main: `${formatCurrency(current)}`,
        original: `${formatCurrency(current * 2)}`,
        sub: language === "en" ? "per month" : "mesečno",
      };
    }
    const yearlyTotal = Math.round(plan.monthlyPrice * 12 * 0.8);
    return {
      main: `${formatCurrency(yearlyTotal)}`,
      original: `${formatCurrency(yearlyTotal * 2)}`,
      sub:
        language === "en"
          ? "per year (20% off)"
          : "godišnje (20% popusta)",
    };
  };

  const getCreditFeature = (plan: PricingPlan) => {
    const multiplier = billingCycle === "monthly" ? 1 : 12;
    const credits = plan.monthlyCredits * multiplier;
    const formattedCredits = formatNumber(credits);
    return plan.creditFeature.replace("{credits}", formattedCredits);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-x-0 top-0 z-0 h-[300px] bg-gradient-to-b from-sky-900/30 to-transparent blur-3xl" />
      <header className="relative z-20 flex items-center justify-between border-b border-slate-900/70 bg-slate-950/60 px-6 py-6 shadow-[0_10px_30px_rgba(2,6,23,0.5)] backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center" aria-label="OmniFAIND home">
            <Image
              src="/OmniFAIND-logo.png"
              alt="OmniFAIND logo"
              width={360}
              height={124}
              priority
              className="h-22 w-auto rounded-2xl border border-slate-800/70 bg-slate-950/80 px-4 py-3"
            />
          </Link>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>{copy.langLabel}</span>
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as Language)
            }
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="en">English</option>
            <option value="sr">Srpski</option>
          </select>
        </label>
      </header>

      <section className="relative z-10 overflow-hidden px-6 pb-16 pt-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.25),_transparent_55%)]" />
        <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-900/80 p-8 shadow-[0_10px_60px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sky-500/10 via-transparent to-emerald-400/10 opacity-60" />
            <div className="relative space-y-6 text-center">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                {heroChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-slate-700/70 bg-slate-950/50 px-3 py-1 text-slate-300 transition hover:-translate-y-1 hover:border-sky-400 hover:text-sky-200"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="text-base text-slate-300 md:text-lg">
                {copy.heroSubtitle}
              </p>
              <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
                <Link
                  href="/login"
                  className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-sky-500 px-6 py-3 font-medium text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-400 sm:w-auto"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 opacity-0 transition group-hover:opacity-100" />
                  <span className="relative">{copy.heroCta}</span>
                </Link>
              </div>
              <div className="grid gap-3 pt-6 text-left text-sm text-slate-300 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 text-center transition duration-300 hover:-translate-y-1 hover:border-sky-500/70"
                  >
                    <p className="text-2xl font-semibold text-slate-50">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-16">
        <div className="max-w-5xl mx-auto space-y-8">
          {false && (
            <div className="space-y-3 text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
              {copy.seoBadge}
            </p>
            <h2 className="text-3xl font-semibold text-slate-50">
              {copy.seoTitle}
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl mx-auto">
              Live where your candidates and prospects are: professional networks, talent hubs, and marketplaces—without noisy tabs or scattered spreadsheets.
            </p>
          </div>
          )}

          <div className="space-y-3 text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
              {seoBadge}
            </p>
            <h2 className="text-3xl font-semibold text-slate-50">
              {seoTitle}
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl mx-auto">
              {seoDescription}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-sky-900/20 p-6 space-y-4 shadow-[0_25px_80px_rgba(14,165,233,0.12)]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <h3 className="text-lg font-semibold text-slate-100">
                {seoListTitle}
              </h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-200">
              {seoListItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {false && (
            <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "LinkedIn-style search, without the noise",
                body: "Structure pro-network searches with AI hints for role, seniority, and location. Less manual filtering, more qualified shortlists.",
              },
              {
                title: "Built for recruiters and sales teams",
                body: "Share context, reuse winning searches, and keep sourcing and outreach aligned across hiring and prospecting.",
              },
              {
                title: "AI scoring & outreach",
                body: "Score fit, rank leads, and generate channel-ready outreach in seconds—no copy/paste across tools.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] hover:border-sky-500/60 transition"
              >
                <h3 className="text-base font-semibold text-slate-100">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-300 mt-2">{card.body}</p>
              </div>
            ))}
          </div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            {seoCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] hover:border-sky-500/60 transition"
              >
                <h3 className="text-base font-semibold text-slate-100">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-300 mt-2">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-16">
        <div className="max-w-5xl mx-auto space-y-8">
          {false && (
            <>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-50">FAQ</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <h3 className="text-base font-semibold text-slate-100">
                Can I use this alongside LinkedIn search?
              </h3>
              <p className="text-sm text-slate-300">
                Yes. We’re designed to complement your sourcing on professional networks. Bring your queries, and we help structure, qualify, and reach out faster.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <h3 className="text-base font-semibold text-slate-100">
                Does it work with other talent hubs?
              </h3>
              <p className="text-sm text-slate-300">
                Yes. OmniFAIND supports public professional networks, freelance marketplaces, and developer communities so you can source broadly and screen in one workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <h3 className="text-base font-semibold text-slate-100">
                Who is it for?
              </h3>
              <p className="text-sm text-slate-300">
                Recruiters, sourcers, and sales teams who need AI help to generate searches, score fits, and send outreach across professional networks.
              </p>
            </div>
          </div>
          </>
          )}

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-50">{faqTitle}</h2>
          </div>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <div
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2"
                key={item.question}
              >
                <h3 className="text-base font-semibold text-slate-100">
                  {item.question}
                </h3>
                <p className="text-sm text-slate-300">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-16">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <p className="text-sky-400 text-sm uppercase tracking-[0.3em]">
              {copy.sectionTitle}
            </p>
            <p className="text-xl text-slate-100">{copy.sectionSubtitle}</p>
          </div>
          <div className="grid gap-12 md:grid-cols-3 md:gap-6">
            {copy.sourcingSteps.map((step, index) => (
              <div
                key={step.label}
                className="group relative overflow-hidden rounded-2xl border border-slate-800/70 p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-500/70 hover:shadow-[0_20px_60px_rgba(14,165,233,0.15)]"
                style={{
                  background:
                    index % 2 === 0
                      ? "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(15,23,42,0.85))"
                      : "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(15,23,42,0.85))",
                }}
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100" />
                <div className="relative space-y-3">
                  <p className="text-xs uppercase tracking-widest text-slate-500">
                    {copy.stepLabel} {step.label}
                  </p>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-slate-300">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-16">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <p className="text-sky-400 text-sm uppercase tracking-[0.3em]">
              {copy.screeningSectionTitle}
            </p>
            <p className="text-xl text-slate-100">
              {copy.screeningSectionSubtitle}
            </p>
            <p className="text-xs text-slate-500">{copy.screeningLimitNote}</p>
          </div>
          <div className="grid gap-12 pt-10 md:grid-cols-3 md:gap-6 md:pt-6">
            {copy.screeningSteps.map((step, index) => (
              <div
                key={step.label}
                className="group relative overflow-hidden rounded-2xl border border-slate-800/70 p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-400/70 hover:shadow-[0_20px_60px_rgba(16,185,129,0.15)]"
                style={{
                  background:
                    index % 2 === 0
                      ? "linear-gradient(135deg, rgba(5,150,105,0.08), rgba(15,23,42,0.85))"
                      : "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(15,23,42,0.85))",
                }}
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100" />
                <div className="relative space-y-3">
                  <p className="text-xs uppercase tracking-widest text-slate-500">
                    {copy.stepLabel} {step.label}
                  </p>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-slate-300">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-16">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <p className="text-sky-400 text-sm uppercase tracking-[0.3em]">
              {copy.pricingTitle}
            </p>
            <p className="text-xl text-slate-100">{copy.pricingSubtitle}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {copy.pricingToggleLabel}
            </p>
            <div className="inline-flex rounded-full border border-slate-800 bg-slate-900/70 p-1">
              {(["monthly", "yearly"] as const).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`rounded-full px-4 py-1 text-sm font-medium transition ${
                    billingCycle === cycle
                      ? "bg-sky-500 text-slate-950"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  {cycle === "monthly"
                    ? copy.pricingMonthly
                    : copy.pricingYearly}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              {copy.pricingDiscountNote}
            </p>
          </div>
          <div className="grid gap-12 pt-10 md:grid-cols-3 md:gap-6 md:pt-6">
            {copy.pricingPlans.map((plan) => {
              const verticalOffset =
                plan.name === "Starter"
                  ? "-mt-12 md:mt-0"
                : plan.name === "Agency"
                  ? "-mt-2 md:mt-0"
                  : "mt-0";
              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col gap-5 rounded-3xl border bg-slate-900/80 p-6 shadow-[0_30px_80px_rgba(14,23,42,0.55)] ${verticalOffset} ${
                    plan.highlight
                      ? "border-2 border-sky-400/80 shadow-[0_35px_90px_rgba(14,165,233,0.3)]"
                      : "border-slate-800"
                  }`}
                >
                {plan.badge && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200 shadow-lg shadow-emerald-500/20">
                    {plan.badge}
                  </span>
                )}
                <div className="space-y-1 text-center">
                  <h3 className="text-sm uppercase tracking-[0.4em] text-slate-500">
                    {plan.name}
                  </h3>
                  <div className="flex justify-center">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full">
                      50% launch offer
                    </span>
                  </div>
                  <div className="space-y-1 text-center">
                    <div className="text-4xl font-bold text-slate-50">
                      {getPriceInfo(plan).main}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-200">
                      <span className="line-through decoration-2 decoration-slate-400">
                        {getPriceInfo(plan).original}
                      </span>
                      <span className="text-slate-400">Original</span>
                    </div>
                  </div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 pt-1">
                    {getPriceInfo(plan).sub}
                  </p>
                  <p className="text-sm text-slate-400">{plan.description}</p>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {[getCreditFeature(plan), ...plan.features].map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-auto inline-flex items-center justify-center rounded-2xl border border-sky-500/70 px-4 py-2 text-sm font-semibold text-slate-50 transition hover:bg-sky-500 hover:text-slate-950"
                >
                  {copy.pricingCta}
                </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-5xl mx-auto space-y-6">
          <p className="text-center text-sky-400 text-sm uppercase tracking-[0.3em]">
            {copy.featuresTitle}
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((card, index) => (
              <div
                key={card.title}
                className="group relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/70 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-500/70 hover:shadow-[0_25px_60px_rgba(15,118,255,0.15)]"
              >
                <div className="absolute inset-x-8 top-0 h-24 rounded-full bg-gradient-to-b from-sky-500/20 to-transparent blur-3xl opacity-0 transition group-hover:opacity-100" />
                <div className="relative space-y-3">
                  <div className="inline-flex items-center justify-center rounded-full border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-2xl">
                    {card.icon}
                  </div>
                  <h4 className="text-lg font-semibold text-slate-50">
                    {card.title}
                  </h4>
                  <p className="text-sm text-slate-400">{card.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      
      <footer className="relative z-10 px-6 py-8 border-t border-slate-900/60">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} OmniFAIND. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-sky-400 hover:text-sky-300 underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sky-400 hover:text-sky-300 underline-offset-4 hover:underline"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
