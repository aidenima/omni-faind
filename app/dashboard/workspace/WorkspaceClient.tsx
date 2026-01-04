"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useState,
  ChangeEvent,
  useRef,
  KeyboardEvent,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  DEFAULT_SUBSCRIPTION_PLAN,
  getPlanScreeningLimit,
  type SubscriptionPlanId,
  normalizeSubscriptionPlan,
} from "@/lib/billing/plans";
import {
  applyThemePreference,
  persistThemePreference,
  resolveStoredTheme,
  toggleThemeValue,
  type AppTheme,
} from "@/lib/ui/theme";
import type { SavedHistoryResult } from "@/types/search-history";
import * as XLSX from "xlsx";

type Language = "en" | "sr";

type DashboardCopy = {
  aiSourcingTagline: string;
  statusMessage: string;
  sectionTitle: string;
  sectionDescription: string;
  platformLabel: string;
  platformOptionLinkedIn: string;
  platformOptionUpwork: string;
  platformOptionGithub: string;
  examplesIntro: string;
  exampleConnector: string;
  exampleOne: string;
  exampleTwo: string;
  promptLabel: string;
  placeholder: string;
  generate: string;
  generating: string;
  languageLabel: string;
  errorNotice: string;
  searchPanelTitle: string;
  searchPanelDescription: string;
  searchPanelButton: string;
  candidateSectionTitle: string;
  candidateEmpty: string;
  candidateHint: string;
  paginationPrev: string;
  paginationNext: string;
  paginationLabel: string;
  paginationConnector: string;
  jobDescriptionLabel: string;
  jobDescriptionPlaceholder: string;
  jobTitleLabel: string;
  jobTitlePlaceholder: string;
  candidateUploadLabel: string;
  candidateNamePlaceholder: string;
  candidateDetailsPlaceholder: string;
  addCandidate: string;
  analyze: string;
  analyzing: string;
  analysisSectionTitle: string;
  analysisEmpty: string;
  fitScoreLabel: string;
  rankingLabel: string;
  reasonLabel: string;
  uploadCta: string;
  uploadHint: string;
  uploadLimitNote: string;
  uploadedFromFile: string;
  uploadProcessing: string;
  uploadError: string;
  analysisRequirementHint: string;
  analysisExportLabel: string;
  screeningHistoryTitle: string;
  screeningHistoryDescription: string;
  screeningHistoryEmpty: string;
};

type SearchPlatform = "linkedin" | "upwork" | "github";
type OutreachChannel = "linkedin" | "upwork" | "github";
type OutreachLanguage =
  | "en"
  | "sr"
  | "de"
  | "es"
  | "fr"
  | "it"
  | "zh"
  | "ja"
  | "fi"
  | "no"
  | "sv"
  | "nl"
  | "hu"
  | "ro"
  | "bg"
  | "mk"
  | "el"
  | "tr"
  | "ru"
  | "uk";

type OutreachLanguageOption = {
  value: OutreachLanguage;
  label: string;
};

type CandidateResult = {
  name: string;
  profileUrl: string;
  snippet?: string;
  source?: SearchPlatform;
};

type CandidateProfileInput = {
  id: string;
  name: string;
  details: string;
  sourceFileName?: string;
};

type CandidateFitResult = {
  id: string;
  name: string;
  fitScore: number;
  rank: number;
  explanation: string;
};

type ProjectMeta = {
  id: string;
  name: string;
  createdAt: number;
};

type SearchApiResponse = {
  results?: CandidateResult[];
};
type SearchApiErrorDetail = {
  source?: string;
  message?: string;
};
type SearchApiErrorResponse = {
  error?: string;
  details?: SearchApiErrorDetail[] | string | null;
};

type SearchHistoryEntry = {
  id: string;
  prompt: string;
  resultCount: number;
  createdAt: string;
  results: SavedHistoryResult[] | null;
};

type SearchQueryEntry = {
  platform: SearchPlatform;
  query: string;
};

type ScreeningHistoryEntry = {
  id: string;
  jobTitle?: string | null;
  jobDescription: string;
  candidateCount?: number;
  resultCount?: number;
  createdAt: string;
  results: CandidateFitResult[] | null;
};

const STORAGE_KEY = "omnifaind-projects";
const exportHeaders = ["Name", "LinkedIn URL", "Notes"];
const analysisExportHeaders = ["Rank", "Candidate", "Fit Score", "Reason"];
const debugSearchErrors =
  process.env.NEXT_PUBLIC_DEBUG_SEARCH_ERRORS === "true";
const outreachLanguageOptions: OutreachLanguageOption[] = [
  { value: "en", label: "English" },
  { value: "sr", label: "Serbian" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "it", label: "Italian" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "fi", label: "Finnish" },
  { value: "no", label: "Norwegian" },
  { value: "sv", label: "Swedish" },
  { value: "nl", label: "Dutch" },
  { value: "hu", label: "Hungarian" },
  { value: "ro", label: "Romanian" },
  { value: "bg", label: "Bulgarian" },
  { value: "mk", label: "Macedonian" },
  { value: "el", label: "Greek" },
  { value: "tr", label: "Turkish" },
  { value: "ru", label: "Russian" },
  { value: "uk", label: "Ukrainian" },
];

const buildCsvContent = (candidates: CandidateResult[]) => {
  const rows = candidates.map((candidate) => [
    candidate.name.replace(/"/g, '""'),
    candidate.profileUrl.replace(/"/g, '""'),
    (candidate.snippet || "").replace(/"/g, '""'),
  ]);

  const lines = [exportHeaders, ...rows].map((row) =>
    row.map((cell) => `"${cell}"`).join(",")
  );

  return `\uFEFF${lines.join("\n")}`;
};

const buildAnalysisCsvContent = (results: CandidateFitResult[]) => {
  const rows = results.map((result) => [
    String(result.rank),
    result.name.replace(/"/g, '""'),
    String(result.fitScore),
    result.explanation.replace(/"/g, '""'),
  ]);

  const lines = [analysisExportHeaders, ...rows].map((row) =>
    row.map((cell) => `"${cell}"`).join(",")
  );

  return `\uFEFF${lines.join("\n")}`;
};

const buildXlsxBlob = (
  sheetName: string,
  headers: string[],
  rows: Array<Array<string | number>>
) => {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const arrayBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });
  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

const downloadBlob = (
  content: string,
  fileName: string,
  type = "text/csv;charset=utf-8;"
) => {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadFileBlob = (blob: Blob, fileName: string) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadCsv = (candidates: CandidateResult[]) => {
  if (!candidates.length) return;
  const csv = buildCsvContent(candidates);
  downloadBlob(csv, "omnifaind-candidates.csv");
};

const downloadXlsx = (candidates: CandidateResult[]) => {
  if (!candidates.length) return;
  const rows = candidates.map((candidate) => [
    candidate.name,
    candidate.profileUrl,
    candidate.snippet || "",
  ]);
  const blob = buildXlsxBlob("Candidates", exportHeaders, rows);
  downloadFileBlob(blob, "omnifaind-candidates.xlsx");
};

const translations: Record<Language, DashboardCopy> = {
  en: {
    aiSourcingTagline: "AI sourcing dashboard",
    statusMessage: "MVP - Sourcing module - Screening coming soon",
    sectionTitle: "Sourcing panel",
    sectionDescription:
      "Describe what you're looking for in natural language.",
    platformLabel: "Where to find",
    platformOptionLinkedIn: "LinkedIn",
    platformOptionUpwork: "Upwork",
    platformOptionGithub: "GitHub",
    examplesIntro: "For example:",
    exampleConnector: "or",
    exampleOne: '"I need a senior C++ developer in the US, Las Vegas"',
    exampleTwo:
      '"Find owners of metal machining companies in Germany."',
    promptLabel: "Your request (prompt)",
    placeholder: 'e.g. "I need a React developer in Belgrade"',
    generate: "Generate search",
    generating: "Preparing...",
    languageLabel: "Language",
    errorNotice:
      "We had to fall back to a basic query or cached data because an AI or Google search call failed.",
    searchPanelTitle: "Search is ready",
    searchPanelDescription:
      "Open the search in a new tab to review results or copy the query for later.",
    searchPanelButton: "Open search",
    candidateSectionTitle: "Search results",
    candidateEmpty:
      "No matching profiles yet. Adjust the prompt and try again.",
    candidateHint: "",
    paginationPrev: "Previous",
    paginationNext: "Next",
    paginationLabel: "Page",
    paginationConnector: "of",
    jobTitleLabel: "Job title",
    jobTitlePlaceholder: "e.g. Senior .NET Developer",
    jobDescriptionLabel: "Job description & requirements",
    jobDescriptionPlaceholder:
      "Describe the role, seniority, domain knowledge, must-have certifications, etc.",
    candidateUploadLabel: "Paste CV details",
    candidateNamePlaceholder: "Candidate name",
    candidateDetailsPlaceholder: "Paste CV text or summary",
    addCandidate: "Add candidate",
    analyze: "Analyze candidates",
    analyzing: "Analyzing...",
    analysisSectionTitle: "AI fit analysis",
    analysisEmpty:
      "Add at least one CV and analyze the fit to see ranked insights.",
    fitScoreLabel: "Fit score",
    rankingLabel: "Rank",
    reasonLabel: "Score rationale",
    analysisRequirementHint:
      "Add a job description and at least one CV before running analysis.",
    analysisExportLabel: "Download ranked list",
    uploadCta: "Upload CV (PDF/DOCX)",
    uploadHint:
      "Drop up to {count} CV files or paste LinkedIn URLs / text snippets manually.",
    uploadLimitNote: "Max {count} files per project in this preview.",
    uploadedFromFile: "Imported from file",
    uploadProcessing: "Reading CV...",
    uploadError: "Unable to read this file. Try another CV.",
    screeningHistoryTitle: "Screening history",
    screeningHistoryDescription: "Your last 50 screening runs for this project.",
    screeningHistoryEmpty: "No past screenings yet.",
  },
  sr: {
    aiSourcingTagline: "AI sourcing kontrolna tabla",
    statusMessage: "MVP - Sourcing modul - Screening stize uskoro",
    sectionTitle: "Sourcing panel",
    sectionDescription: "Unesi sta trazis prirodnim jezikom.",
    platformLabel: "Gde da trazimo",
    platformOptionLinkedIn: "LinkedIn",
    platformOptionUpwork: "Upwork",
    platformOptionGithub: "GitHub",
    examplesIntro: "Na primer:",
    exampleConnector: "ili",
    exampleOne:
      '"Treba mi senior C++ developer u SAD-u, Las Vegas"',
    exampleTwo:
      '"Nadji mi vlasnike firmi za obradu metala u Nemackoj."',
    promptLabel: "Tvoj upit (prompt)",
    placeholder: 'Npr. "Treba mi React developer u Beogradu"',
    generate: "Generisi pretragu",
    generating: "Generisem...",
    languageLabel: "Jezik",
    errorNotice:
      "Prebacili smo se na rezervni upit ili kesirane podatke jer AI ili pretraga nisu uspeli.",
    searchPanelTitle: "Pretraga je spremna",
    searchPanelDescription:
      "Otvori pretragu u novom tabu ili sacuvaj generisani upit za kasnije.",
    searchPanelButton: "Otvori pretragu",
    candidateSectionTitle: "Search results",
    candidateEmpty:
      "Nismo pronasli profile za ovaj upit. Podesi prompt i probaj ponovo.",
    candidateHint: "",
    paginationPrev: "Prethodna",
    paginationNext: "Sledeca",
    paginationLabel: "Strana",
    paginationConnector: "od",
    jobTitleLabel: "Naziv pozicije",
    jobTitlePlaceholder: "npr. Senior .NET Developer",
    jobDescriptionLabel: "Opis posla i zahtevi",
    jobDescriptionPlaceholder:
      "Opi\u0161i rolu, senioritet, domen, obavezne sertifikate itd.",
    candidateUploadLabel: "Nalepi CV detalje",
    candidateNamePlaceholder: "Ime kandidata",
    candidateDetailsPlaceholder: "Nalepi CV tekst ili sa\u017eetak",
    addCandidate: "Dodaj kandidata",
    analyze: "Analiziraj kandidate",
    analyzing: "Analiziram...",
    analysisSectionTitle: "AI analiza uklapanja",
    analysisEmpty:
      "Dodaj makar jedan CV i pokreni analizu da bi video rangiranje.",
    fitScoreLabel: "Fit skor",
    rankingLabel: "Rang",
    reasonLabel: "Obrazlo\u017eenje ocene",
    analysisRequirementHint:
      "Dodaj opis posla i makar jedan CV pre pokretanja analize.",
    analysisExportLabel: "Preuzmi rang listu",
    uploadCta: "Otpremi CV (PDF/DOCX)",
    uploadHint:
      "Ubaci do {count} CV fajlova ili nalepi LinkedIn URL / tekst ru\u010dno.",
    uploadLimitNote: "Maksimalno {count} fajlova u ovom prikazu.",
    uploadedFromFile: "Uvezeno iz fajla",
    uploadProcessing: "Ucitavam CV...",
    uploadError: "Ne mozemo da procitamo ovaj fajl. Probaj drugi CV.",
    screeningHistoryTitle: "Istorija screening-a",
    screeningHistoryDescription: "Poslednjih 50 screening pokretanja za ovaj projekat.",
    screeningHistoryEmpty: "Nema prethodnih screening-a.",
  },
};

const fillers = [
  "treba mi",
  "treba nam",
  "trebaju mi",
  "potrebna mi je",
  "potrebna nam je",
  "potrebno mi je",
  "potrebno nam je",
  "potrebni su mi",
  "potrebni su nam",
  "nadji mi",
  "na\u0111i mi",
  "pronadji mi",
  "prona\u0111i mi",
  "trazim",
  "tra\u017eim",
  "zelim",
  "\u017delim",
  "hocu",
  "ho\u0107u",
  "molim te",
  "nisu",
  "nije",
  "da nije",
  "da nisu",
  "ko nije",
  "ko nisu",
  "i need",
  "we need",
  "looking for",
  "find me",
  "need a",
  "need an",
];

const locationMap: Record<string, string> = {
  beograd: "Belgrade",
  beogradu: "Belgrade",
  belgrade: "Belgrade",
  "novi sad": "Novi Sad",
  "novom sadu": "Novi Sad",
  srbija: "Serbia",
  srbiji: "Serbia",
  srbiju: "Serbia",
  serbia: "Serbia",
  hrvatska: "Croatia",
  hrvatskoj: "Croatia",
  croatia: "Croatia",
  bosna: "Bosnia",
  bih: "Bosnia and Herzegovina",
  "bosnia and herzegovina": "Bosnia and Herzegovina",
  sarajevo: "Sarajevo",
  zagreb: "Zagreb",
  "banja luka": "Banja Luka",
  nemacka: "Germany",
  "nema\u010dka": "Germany",
  austrija: "Austria",
  italija: "Italy",
  spanija: "Spain",
  spain: "Spain",
  francuska: "France",
  london: "London",
  "las vegas": "Las Vegas",
  "san francisco": "San Francisco",
  "new york": "New York",
  usa: "USA",
  sad: "USA",
  nis: "Ni\u0161",
  "ni\u0161": "Ni\u0161",
  nisu: "Ni\u0161",
  "ni\u0161u": "Ni\u0161",
  nisa: "Ni\u0161",
  "ni\u0161a": "Ni\u0161",
  europe: "Europe",
  evropa: "Europe",
};

const locationVariants: Record<string, string[]> = {
  serbia: ["Serbia", "Srbija", "Republic of Serbia", "Srbija, Evropa"],
  belgrade: [
    "Belgrade",
    "Beograd",
    "Belgrade, Serbia",
    "Beograd, Srbija",
    "???????",
  ],
  "novi sad": [
    "Novi Sad",
    "Novi Sad, Serbia",
    "???? ???",
  ],
  nis: [
    "Ni?",
    "Nis",
    "Ni?, Serbia",
    "Nis, Serbia",
    "???",
  ],
  "ni?": [
    "Ni?",
    "Nis",
    "Ni?, Serbia",
    "Nis, Serbia",
    "???",
  ],
  croatia: ["Croatia", "Hrvatska"],
  bosnia: ["Bosnia", "Bosnia and Herzegovina", "BiH"],
  bih: ["Bosnia", "Bosnia and Herzegovina", "BiH"],
  europe: [
    "Europe",
    "European Union",
    "EU",
    "Germany",
    "France",
    "Spain",
    "Italy",
    "Belgium",
    "Netherlands",
    "Poland",
    "Austria",
    "Switzerland",
    "Norway",
    "Sweden",
    "Finland",
    "Denmark",
    "Ireland",
    "Portugal",
    "Hungary",
    "Czech Republic",
    "Slovakia",
    "Slovenia",
    "Romania",
    "Bulgaria",
    "Greece",
    "Croatia",
    "Serbia",
    "Bosnia",
    "Montenegro",
    "North Macedonia",
    "Albania",
  ],
  evropa: [
    "Europe",
    "European Union",
    "Evropa",
    "EU",
    "Nema?ka",
    "Francuska",
    "Italija",
    "?panija",
    "Holandija",
    "Belgija",
    "Poljska",
    "Austrija",
    "?vajcarska",
    "Norve?ka",
    "?vedska",
    "Finska",
    "Danska",
    "Irska",
    "Portugal",
    "Ma?arska",
    "?e?ka",
    "Slova?ka",
    "Slovenija",
    "Rumunija",
    "Bugarska",
    "Gr?ka",
    "Hrvatska",
    "Srbija",
    "Bosna",
    "Crna Gora",
    "Severna Makedonija",
    "Albanija",
  ],
};

const locationCountryMap: Record<string, string> = {
  belgrade: "Serbia",
  "novi sad": "Serbia",
  nis: "Serbia",
  "ni?": "Serbia",
  "banja luka": "Bosnia and Herzegovina",
  sarajevo: "Bosnia and Herzegovina",
  zagreb: "Croatia",
  "las vegas": "USA",
  "san francisco": "USA",
  "new york": "USA",
  london: "United Kingdom",
};

const cyrillicLocationMap: Record<string, string> = {
  belgrade: "???????",
  "novi sad": "???? ???",
  nis: "???",
  "ni?": "???",
};

const bilingualKeywordMap: Record<string, string> = {
  programer: "developer",
  programera: "developer",
  programeri: "developers",
  programerka: "developer",
  iskustvo: "experience",
  godine: "years",
  godina: "years",
  godinama: "years",
  vlasnik: "owner",
  vlasnika: "owner",
  vlasnike: "owners",
  vlasnici: "owners",
  osnivac: "founder",
  osnivaca: "founder",
  osnivaci: "founders",
  klinika: "clinic",
  klinike: "clinics",
  ordinacija: "practice",
  ordinacije: "practices",
  poliklinika: "clinic",
  poliklinike: "clinics",
  startap: "startup",
  kompanija: "company",
  kompanije: "companies",
  firma: "company",
  firme: "companies",
  biznis: "business",
};

const institutionMap: Record<string, string> = {
  "elektronski faks": '"Faculty of Electronic Engineering" "Niš"',
  "elektronski fakultet": '"Faculty of Electronic Engineering" "Niš"',
  "elektronski fakultet niš": '"Faculty of Electronic Engineering" "Niš"',
  "elektrotehnicki fakultet": '"Faculty of Electrical Engineering" "Belgrade"',
  "elektrotehnički fakultet": '"Faculty of Electrical Engineering" "Belgrade"',
  etf: '"Faculty of Electrical Engineering" "Belgrade"',
};

const ownerKeywords = [
  "owner",
  "owners",
  "founder",
  "founders",
  "cofounder",
  "co-founder",
];

const ownerEntityKeywords = [
  "clinic",
  "clinics",
  "practice",
  "practices",
  "medical practice",
  "medical practices",
  "startup",
  "startups",
  "company",
  "companies",
  "business",
  "businesses",
];

const numberWordMap: Record<number, string> = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
};

const keywordSynonyms: Record<string, string[]> = {
  "react developer": [
    "React Developer",
    "React.js",
    "ReactJS",
    "Frontend Developer",
    "Front-end Developer",
  ],
  ".net developer": [
    ".NET Developer",
    ".NET Engineer",
    "Dotnet Developer",
    "C# Developer",
  ],
  "net developer": [
    ".NET Developer",
    ".NET Engineer",
    "Dotnet Developer",
    "C# Developer",
  ],
};

const jobTitleHints = [
  "developer",
  "engineer",
  "tester",
  "architect",
  "designer",
  "consultant",
  "specialist",
  "scientist",
  "analyst",
  "manager",
  "lead",
  "programmer",
];

const defaultExclusions = ["bootcamp", "teacher", "course", "instructor"];

const educatorKeywords = [
  "teacher",
  "instructor",
  "professor",
  "lecturer",
  "coach",
  "trainer",
  "mentor",
  "edukator",
  "educator",
  "school",
];

const nationalityKeywords = [
  "russia",
  "russian",
  "russians",
  "rusija",
  "ruski",
  "ukraine",
  "ukrainian",
  "ukrainians",
  "ukrajina",
  "ukrajinski",
  "belarus",
  "belarusian",
];

const entryLevelTerms = ["junior", "intern", "trainee", "entry level"];

const jobTitleVariants: Record<string, string[]> = {
  "c developer": [
    "C developer",
    "C/C++ developer",
    "Embedded C engineer",
    "Firmware engineer",
    "C programmer",
  ],
  ".net developer": [
    ".NET developer",
    ".NET engineer",
    "Dotnet developer",
    "C# developer",
    "Microsoft stack engineer",
  ],
  "c# developer": [
    "C# developer",
    "C# engineer",
    ".NET developer",
    ".NET engineer",
  ],
  "c++ developer": [
    "C++ developer",
    "C/C++ developer",
    "C++ engineer",
    "C++ programmer",
    "Embedded C++",
  ],
  "react developer": [
    "React developer",
    "React.js developer",
    "React engineer",
    "ReactJS developer",
    "Frontend developer",
    "Front-end developer",
  ],
  "qa tester": [
    "QA tester",
    "QA engineer",
    "Quality assurance engineer",
    "Software tester",
    "Test engineer",
  ],
  "qa engineer": [
    "QA engineer",
    "QA tester",
    "Quality assurance engineer",
    "Software tester",
    "SDET",
  ],
  "java engineer": [
    "Java engineer",
    "Java developer",
    "Java software engineer",
    "Java backend engineer",
    "J2EE developer",
  ],
  "java developer": [
    "Java developer",
    "Java engineer",
    "Java software engineer",
    "J2EE developer",
  ],
  "javascript developer": [
    "JavaScript developer",
    "JavaScript engineer",
    "Frontend developer",
    "Front-end engineer",
  ],
  "frontend developer": [
    "Frontend developer",
    "Front-end developer",
    "Frontend engineer",
    "Front-end engineer",
    "UI developer",
  ],
  "backend developer": [
    "Backend developer",
    "Back-end developer",
    "Backend engineer",
    "Back-end engineer",
    "Server-side developer",
  ],
  "python developer": [
    "Python developer",
    "Python engineer",
    "Backend Python developer",
    "Django developer",
  ],
  "golang developer": [
    "Golang developer",
    "Go developer",
    "Go engineer",
    "Golang engineer",
  ],
  "data scientist": [
    "Data scientist",
    "ML engineer",
    "Machine learning engineer",
    "AI scientist",
  ],
};

const candidateSeeds: CandidateResult[] = [
  { name: "Ana Petrovic", profileUrl: "https://www.linkedin.com/in/ana-petrovic" },
  { name: "Marko Kostic", profileUrl: "https://www.linkedin.com/in/marko-kostic" },
  { name: "Milica Obradovic", profileUrl: "https://www.linkedin.com/in/milica-obradovic" },
  { name: "Nikola Jovanovic", profileUrl: "https://www.linkedin.com/in/nikola-jovanovic" },
  { name: "Sara Ristic", profileUrl: "https://www.linkedin.com/in/sara-ristic" },
  { name: "Petar Vukovic", profileUrl: "https://www.linkedin.com/in/petar-vukovic" },
];

const RESULTS_PER_PAGE = 10;
const CV_DETAIL_LIMIT = 15000;
const JOB_DESCRIPTION_LIMIT = 6000;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toAscii = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj")
    .replace(/Đ/g, "Dj");

const ownerKeywordPattern = ownerKeywords
  .map((word) => escapeRegex(word))
  .join("|");
const ownerEntityPattern = ownerEntityKeywords
  .map((word) => escapeRegex(word))
  .join("|");

const buildExperienceVariants = (keyword: string) => {
  const match = keyword.match(/(\d+)\s*(?:years?|yrs?)/i);
  if (match) {
    const value = parseInt(match[1], 10);
    if (value <= 2) {
      return entryLevelTerms;
    }
    const word = numberWordMap[value];
    return word ? [`${word} years`, `${word} experience`] : [];
  }

  const lower = keyword.toLowerCase();
  if (
    /junior|intern|trainee|entry\s*level/i.test(lower) ||
    /0\s*-\s*2\s*years/i.test(lower)
  ) {
    return entryLevelTerms;
  }

  return [];
};

const reorderOwnership = (value: string) => {
  let normalized = value;
  const ownerEntityRegex = new RegExp(
    `\\b(${ownerKeywordPattern})\\s+(${ownerEntityPattern})\\b`,
    "gi"
  );
  normalized = normalized.replace(ownerEntityRegex, (_, ownerWord, entity) => {
    return `${entity} ${ownerWord}`;
  });

  return normalized;
};

const quoteTerm = (term: string) => {
  const trimmed = term.trim();
  if (!trimmed) return "";
  if (/^".*"$/.test(trimmed)) return trimmed;
  const sanitized = trimmed.replace(/"/g, "");
  return `"${sanitized}"`;
};

const buildOrGroup = (terms: string[]) => {
  const deduped = Array.from(
    new Set(terms.map((term) => quoteTerm(term)).filter(Boolean))
  );
  if (!deduped.length) return "";
  if (deduped.length === 1) return `(${deduped[0]})`;
  return `(${deduped.join(" OR ")})`;
};

const expandKeyword = (keyword: string) => {
  const lower = keyword.toLowerCase();
  if (keywordSynonyms[lower]) {
    return buildOrGroup([keyword, ...keywordSynonyms[lower]]);
  }
  const experienceVariants = buildExperienceVariants(keyword);
  if (experienceVariants.length) {
    return buildOrGroup(experienceVariants);
  }
  return quoteTerm(keyword);
};

const expandJobTitle = (title: string) => {
  const lower = title.toLowerCase();
  if (jobTitleVariants[lower]) {
    return [...jobTitleVariants[lower], title];
  }
  const sanitized = lower.replace(/\s+/g, " ").trim();
  const modifiers =
    sanitized.match(/\b(junior|senior|medior|mid|jr|sr)\b/g) || [];
  const base = sanitized
    .replace(/\b(junior|senior|medior|mid|jr|sr)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (base && jobTitleVariants[base]) {
    const formattedModifiers = modifiers.map((modifier) =>
      modifier.length <= 2
        ? modifier.toUpperCase()
        : modifier.charAt(0).toUpperCase() + modifier.slice(1).toLowerCase()
    );
    const baseVariants = jobTitleVariants[base];
    const combined = formattedModifiers.length
      ? baseVariants.map(
          (variant) => `${formattedModifiers.join(" ")} ${variant}`
        )
      : [];
    return [...baseVariants, ...combined, title];
  }
  return [title];
};

const isJobTitleKeyword = (value: string) => {
  const lower = value.toLowerCase();
  return jobTitleHints.some((hint) => lower.includes(hint));
};

const expandSkillTerms = (terms: string[]) => {
  const variants = new Set<string>();
  terms.forEach((term) => {
    const lower = term.toLowerCase();
    if (keywordSynonyms[lower]) {
      keywordSynonyms[lower].forEach((synonym) => variants.add(synonym));
    }
    variants.add(term);
  });
  return variants;
};

const generateLocationVariants = (value: string) => {
  const normalized = value.toLowerCase();
  const canonical = locationMap[normalized] || value;
  const ascii = toAscii(canonical);
  const variants = new Set<string>();
  const manual =
    locationVariants[normalized] ||
    locationVariants[canonical.toLowerCase()] ||
    [];
  manual.forEach((variant) => variants.add(variant));
  variants.add(canonical);
  variants.add(ascii);
  const country =
    locationCountryMap[normalized] ||
    locationCountryMap[canonical.toLowerCase()];
  if (country) {
    variants.add(`${canonical}, ${country}`);
    if (ascii && ascii !== canonical) {
      variants.add(`${ascii}, ${country}`);
    }
  }
  const cyrillic =
    cyrillicLocationMap[normalized] ||
    cyrillicLocationMap[canonical.toLowerCase()];
  if (cyrillic) {
    variants.add(cyrillic);
  }
  return Array.from(variants).filter(Boolean);
};

const extractNegativeTerms = (prompt: string) => {
  const negatives: string[] = [];
  const patterns = [
    /\bbez\s+([^\s,.;]+)/gi,
    /\bwithout\s+([^\s,.;]+)/gi,
    /\bexclude\s+([^\s,.;]+)/gi,
    /\biskljuci\s+([^\s,.;]+)/gi,
  ];
  patterns.forEach((regex) => {
    let match;
    // eslint-disable-next-line no-cond-assign
    while ((match = regex.exec(prompt))) {
      negatives.push(match[1]);
    }
  });
  return negatives;
};

const findEmbeddedLocation = (value: string) => {
  const lower = value.toLowerCase();
  for (const key of Object.keys(locationMap)) {
    if (lower.includes(key)) {
      return locationMap[key];
    }
  }
  return null;
};

const extractJobTitlesFromPrompt = (prompt: string) => {
  const titles = new Set<string>();
  const pattern = new RegExp(
    `([A-Za-z0-9+#./\\-\\s]{2,}?(?:${jobTitleHints.join("|")}))`,
    "gi"
  );
  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = pattern.exec(prompt))) {
    const title = match[1].trim();
    if (title) {
      titles.add(title);
    }
  }
  return titles;
};

const buildJobTitleGroup = (titles: Set<string>) => {
  if (!titles.size) return "";
  const variants = new Set<string>();
  titles.forEach((title) => {
    expandJobTitle(title).forEach((variant) => variants.add(variant));
  });
  return buildOrGroup(Array.from(variants));
};

const buildSkillGroup = (skills: Set<string>) => {
  if (!skills.size) return "";
  const variants = expandSkillTerms(Array.from(skills));
  return buildOrGroup(Array.from(variants));
};

const buildLocationGroup = (locations: Set<string>) => {
  if (!locations.size) return "";
  const variants = new Set<string>();
  locations.forEach((location) => {
    generateLocationVariants(location).forEach((variant) => variants.add(variant));
  });
  return buildOrGroup(Array.from(variants));
};

const buildExperienceGroup = (experiences: Set<string>) => {
  if (!experiences.size) return "";
  const variants = new Set<string>();
  experiences.forEach((experience) => {
    const expanded = buildExperienceVariants(experience);
    if (expanded.length) {
      expanded.forEach((item) => variants.add(item));
    } else {
      variants.add(experience);
    }
  });
  return buildOrGroup(Array.from(variants));
};

const buildSitePrefix = (prompt: string, locationGroup: string | null) => {
  const detectedCountry = detectCountryFromPrompt(prompt);
  if (detectedCountry) {
    const lower = detectedCountry.toLowerCase();
    if (countryDomainMap[lower]) {
      return `site:${countryDomainMap[lower]}/in`;
    }
  }
  if (locationGroup) {
    const lower = locationGroup.toLowerCase();
    for (const [key, domain] of Object.entries(countryDomainMap)) {
      if (lower.includes(key)) {
        return `site:${domain}/in`;
      }
    }
  }
  return "site:linkedin.com/in";
};

const createMockCandidates = (prompt: string) => {
  const keyword =
    prompt
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z0-9]/gi, "").toLowerCase())
      .find((word) => word.length > 3) || "talent";

  return candidateSeeds.map((candidate, index) => ({
    name: candidate.name,
    profileUrl: `${candidate.profileUrl}-${slugify(keyword)}-${index + 1}`,
  }));
};

const mergeCandidateLists = (lists: CandidateResult[][]) => {
  const pointers = lists.map(() => 0);
  const merged: CandidateResult[] = [];
  let added = true;

  while (added) {
    added = false;
    lists.forEach((list, index) => {
      const pointer = pointers[index];
      if (pointer < list.length) {
        merged.push(list[pointer]);
        pointers[index] = pointer + 1;
        added = true;
      }
    });
  }

  const seen = new Set<string>();
  return merged.filter((candidate) => {
    if (seen.has(candidate.profileUrl)) return false;
    seen.add(candidate.profileUrl);
    return true;
  });
};

const buildSpecializedQuery = (rawPrompt: string) => {
  const normalizedPrompt = toAscii(rawPrompt).replace(/\s+/g, " ").trim();
  if (!normalizedPrompt) return "";

  let workingPrompt = normalizedPrompt;

  fillers.forEach((phrase) => {
    const pattern = new RegExp(`^${escapeRegex(phrase)}\\s+`, "i");
    workingPrompt = workingPrompt.replace(pattern, "");
  });

  workingPrompt = workingPrompt.replace(/\s+/g, " ").trim();
  if (!workingPrompt) return "";

  const cleanedPrompt = workingPrompt
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2019/g, "'")
    .replace(/[?!]/g, " ");

  const initialNegativeTerms = Array.from(
    new Set(
      extractNegativeTerms(cleanedPrompt)
        .map((term) => term.trim())
        .filter(Boolean)
    )
  );
  const filteredNegativeTerms: string[] = [];
  initialNegativeTerms.forEach((term) => {
    const lower = term.toLowerCase();
    if (nationalityKeywords.some((keyword) => lower.includes(keyword))) {
      return;
    }
    if (
      !filteredNegativeTerms.some(
        (existing) => existing.toLowerCase() === lower
      )
    ) {
      filteredNegativeTerms.push(term);
    }
  });
  const negativeSet = new Set(
    filteredNegativeTerms.map((term) => term.toLowerCase())
  );
  const wantsEducators = educatorKeywords.some((keyword) =>
    cleanedPrompt.toLowerCase().includes(keyword)
  );
  const finalNegativeTerms = [...filteredNegativeTerms];
  if (!wantsEducators) {
    defaultExclusions.forEach((term) => {
      if (!negativeSet.has(term.toLowerCase())) {
        negativeSet.add(term.toLowerCase());
        finalNegativeTerms.push(term);
      }
    });
  }

  const segments = cleanedPrompt
    .split(/[,.;]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const keywords: string[] = [];

  const pushSegment = (value: string) => {
    const trimmed = value.replace(/^[-:]+/, "").trim();
    if (trimmed) keywords.push(trimmed);
  };

  if (!segments.length) {
    pushSegment(cleanedPrompt);
  } else {
    segments.forEach((segment) => {
      const pieces = segment
        .split(/\b(?:in|u)\b/i)
        .map((piece) => piece.trim())
        .filter(Boolean);

      if (pieces.length) {
        pieces.forEach(pushSegment);
      } else {
        pushSegment(segment);
      }
    });
  }

  const normalizedKeywords = keywords
    .map((keyword) => {
      let result = keyword.replace(/"/g, "");

      Object.entries(locationMap).forEach(([key, value]) => {
        const pattern = new RegExp(`\\b${escapeRegex(key)}\\b`, "gi");
        result = result.replace(pattern, value);
      });

      Object.entries(bilingualKeywordMap).forEach(([key, value]) => {
        const pattern = new RegExp(`\\b${escapeRegex(key)}\\b`, "gi");
        result = result.replace(pattern, value);
      });

      Object.entries(institutionMap).forEach(([key, value]) => {
        const pattern = new RegExp(`\\b${escapeRegex(key)}\\b`, "gi");
        result = result.replace(pattern, value);
      });

      result = reorderOwnership(result);
      return result.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);

  const dedupedKeywords: string[] = [];
  const seenKeywords = new Set<string>();

  normalizedKeywords.forEach((keyword) => {
    const identifier = keyword.toLowerCase();
    if (seenKeywords.has(identifier)) return;
    seenKeywords.add(identifier);
    dedupedKeywords.push(keyword);
  });

  const jobTitles = new Set<string>();
  const skillTerms = new Set<string>();
  const locationTerms = new Set<string>();
  const experienceTerms = new Set<string>();

  dedupedKeywords.forEach((keyword) => {
    let candidate = keyword
      .replace(/^(?:bez|without|exclude|iskljuci)\s+/i, "")
      .trim();
    if (!candidate) return;
    const lower = candidate.toLowerCase();
    if (negativeSet.has(lower)) return;

    if (locationMap[lower] || locationVariants[lower]) {
      const canonical = locationMap[lower] || candidate;
      locationTerms.add(canonical);
      return;
    }

    if (locationCountryMap[lower]) {
      locationTerms.add(candidate);
      return;
    }

    const embeddedLocation = findEmbeddedLocation(candidate);
    if (embeddedLocation) {
      locationTerms.add(embeddedLocation);
      return;
    }

    if (/\d+\s*(?:\+?\s*)?(?:years?|yrs?)/i.test(candidate)) {
      experienceTerms.add(candidate);
      return;
    }

    if (isJobTitleKeyword(candidate)) {
      jobTitles.add(candidate);
      candidate
        .split(/\s+/)
        .map((token) => token.replace(/[^A-Za-z0-9+#./-]/g, ""))
        .filter(
          (token) =>
            token &&
            !jobTitleHints.some((hint) =>
              token.toLowerCase().includes(hint)
            )
        )
        .forEach((token) => skillTerms.add(token));
      return;
    }

    skillTerms.add(candidate);
  });

  if (!locationTerms.size) {
    const fallbackCity = detectCityFromPrompt(cleanedPrompt);
    if (fallbackCity) {
      locationTerms.add(fallbackCity);
    }
  }

  if (!jobTitles.size && skillTerms.size) {
    const firstSkill = skillTerms.values().next();
    if (!firstSkill.done && firstSkill.value) {
      jobTitles.add(firstSkill.value);
      skillTerms.delete(firstSkill.value);
    }
  }

  if (!jobTitles.size) {
    const fallbackTitles = extractJobTitlesFromPrompt(cleanedPrompt);
    fallbackTitles.forEach((title) => jobTitles.add(title));
  }

  let jobTitleGroup = buildJobTitleGroup(jobTitles);
  if (!jobTitleGroup) {
    jobTitleGroup = buildOrGroup([cleanedPrompt]);
  }

  let skillGroup = buildSkillGroup(skillTerms);
  if (!skillGroup) {
    skillGroup = jobTitleGroup;
  }

  const locationGroup = buildLocationGroup(locationTerms);
  const experienceGroup = buildExperienceGroup(experienceTerms);

  const querySections: string[] = [];
  if (jobTitleGroup) querySections.push(jobTitleGroup);
  if (skillGroup) querySections.push(skillGroup);
  if (locationGroup) querySections.push(locationGroup);
  if (experienceGroup) querySections.push(experienceGroup);

  const negativePart = finalNegativeTerms
    .map((term) => `-${quoteTerm(term)}`)
    .join(" ");

  const finalQuery = `site:linkedin.com/in ${querySections.join(" ")}${
    negativePart ? ` ${negativePart}` : ""
  }`;

  return finalQuery.trim();
};

const detectCityFromPrompt = (prompt: string) => {
  const lowerPrompt = prompt.toLowerCase();
  for (const key of Object.keys(locationMap)) {
    if (lowerPrompt.includes(key)) {
      return locationMap[key];
    }
  }
  return null;
};

const detectCountryFromPrompt = (prompt: string) => {
  const lowerPrompt = prompt.toLowerCase();
  for (const key of Object.keys(locationCountryMap)) {
    if (lowerPrompt.includes(key)) {
      return locationCountryMap[key];
    }
  }
  const city = detectCityFromPrompt(prompt);
  if (city) {
    const lowerCity = city.toLowerCase();
    if (locationCountryMap[lowerCity]) {
      return locationCountryMap[lowerCity];
    }
  }
  return null;
};

const countryDomainMap: Record<string, string> = {
  serbia: "rs.linkedin.com",
  srbija: "rs.linkedin.com",
  croatia: "hr.linkedin.com",
  hrvatska: "hr.linkedin.com",
  "bosnia and herzegovina": "ba.linkedin.com",
  bih: "ba.linkedin.com",
  "north macedonia": "mk.linkedin.com",
  macedonia: "mk.linkedin.com",
  belgrade: "rs.linkedin.com",
  "novi sad": "rs.linkedin.com",
  nis: "rs.linkedin.com",
  "niš": "rs.linkedin.com",
  turkey: "tr.linkedin.com",
  turska: "tr.linkedin.com",
  germany: "de.linkedin.com",
  italy: "it.linkedin.com",
  spain: "es.linkedin.com",
  france: "fr.linkedin.com",
  usa: "www.linkedin.com",
  "united states": "www.linkedin.com",
  canada: "ca.linkedin.com",
  "united kingdom": "uk.linkedin.com",
  uk: "uk.linkedin.com",
  greece: "gr.linkedin.com",
};

const fetchCandidatesForQuery = async ({
  query,
  city,
  sources,
  prompt,
}: {
  query: string;
  city?: string | null;
  sources?: SearchPlatform[];
  prompt?: string | null;
}) => {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, city, sources, prompt }),
  });

  const payload = (await response.json().catch(() => null)) as
    | SearchApiResponse
    | SearchApiErrorResponse
    | null;

  if (!response.ok) {
    const errorPayload = payload as SearchApiErrorResponse | null;
    let errorMessage =
      errorPayload?.error || "Google search request failed.";
    if (debugSearchErrors && errorPayload?.details) {
      const details = errorPayload.details;
      let detailMessage = "";
      if (typeof details === "string") {
        detailMessage = details;
      } else if (Array.isArray(details)) {
        detailMessage = details
          .map((item) => {
            if (!item) return "";
            const source = item.source ? `${item.source}: ` : "";
            const message = item.message || "";
            return `${source}${message}`.trim();
          })
          .filter(Boolean)
          .join(" | ");
      }
      if (detailMessage) {
        errorMessage = `${errorMessage} | Debug: ${detailMessage}`;
      }
    }
    throw new Error(errorMessage);
  }

  const results = (payload as SearchApiResponse | null)?.results;
  return Array.isArray(results) ? results : [];
};

const extractKeywords = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^\w+#. ]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3);
};

const mockAnalyzeCandidates = async (
  jobDescription: string,
  candidates: CandidateProfileInput[]
): Promise<CandidateFitResult[]> => {
  const jobKeywords = Array.from(new Set(extractKeywords(jobDescription)));
  const meaningfulCandidates = candidates.filter(
    (candidate) => candidate.name.trim() && candidate.details.trim()
  );

  await new Promise((resolve) => setTimeout(resolve, 900));

  const results = meaningfulCandidates.map((candidate) => {
    const candidateKeywords = extractKeywords(
      `${candidate.name} ${candidate.details}`
    );

    const overlap = candidateKeywords.filter((keyword) =>
      jobKeywords.includes(keyword)
    );

    const keywordCoverage = jobKeywords.length
      ? overlap.length / jobKeywords.length
      : 0;

    const hasSenioritySignal = candidateKeywords.some((word) =>
      ["senior", "lead", "expert", "architect", "principal"].includes(word)
    );
    const specializationBonus = hasSenioritySignal ? 10 : 0;
    const leadershipSignals = candidateKeywords.some((word) =>
      ["lead", "leader", "manager", "director", "architect", "principal"].includes(
        word
      )
    );
    const experienceMatch = candidate.details.match(/(\d+)\s*(?:years?|yrs?)/i);
    const experienceYears = experienceMatch ? Number(experienceMatch[1]) || 0 : 0;
    const experienceBonus = Math.min(experienceYears * 0.6, 12); // up to +12
    const missingPenalty = Math.max(0, (jobKeywords.length - overlap.length) * 1.5);

    const rawScore =
      10 + // base
      keywordCoverage * 80 + // coverage weight
      specializationBonus +
      experienceBonus +
      (leadershipSignals ? 4 : 0) -
      missingPenalty;

    const fitScore = Number(Math.max(0, Math.min(100, rawScore)).toFixed(1));

    const coveragePercent = Math.round(keywordCoverage * 100);
    const prominentKeywords = overlap.slice(0, 4);
    const missingKeywords = jobKeywords
      .filter((keyword) => !overlap.includes(keyword))
      .slice(0, 4);
    const explanationParts: string[] = [];
    if (prominentKeywords.length) {
      explanationParts.push(
        `Strong alignment on ${prominentKeywords.join(", ")}`
      );
    }
    if (coveragePercent > 0) {
      explanationParts.push(`Covers roughly ${coveragePercent}% of role keywords`);
    }
    if (experienceMatch) {
      explanationParts.push(`${experienceMatch[1]} years of experience mentioned`);
    }
    if (leadershipSignals || specializationBonus > 0) {
      explanationParts.push("Signals senior or leadership responsibilities");
    }
    if (coveragePercent < 50 && missingKeywords.length) {
      explanationParts.push(
        `Still missing key terms such as ${missingKeywords.join(", ")}, keeping the score moderate`
      );
    }

    const explanation = explanationParts.length
      ? `${explanationParts.join(". ")}.`
      : "Limited overlap detected. Manual review recommended.";

    return {
      id: candidate.id,
      name: candidate.name.trim(),
      fitScore,
      rank: 0,
      explanation,
    };
  });

  results.sort((a, b) => b.fitScore - a.fitScore);
  return results.map((result, index) => ({
    ...result,
    rank: index + 1,
  }));
};

const cleanCvText = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizeFileName = (fileName: string) => {
  const base = fileName.replace(/\.[^.]+$/, "");
  const cleaned = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "Candidate";
};

const guessCandidateName = (text: string, fallback?: string) => {
  const normalizedLines = text
    .split(/\n+/)
    .map((line) => line.replace(/[^A-Za-z\u00C0-\u017F' -]/g, "").trim())
    .filter(Boolean);

  const directMatch = normalizedLines.find((line) =>
    /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/.test(line)
  );
  if (directMatch) return directMatch;

  if (fallback) {
    const normalizedFallback = fallback
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (normalizedFallback) {
      return normalizedFallback
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    }
  }
  return "Candidate";
};

const readFileContent = async (file: File) => {
  if (file.text) {
    return file.text();
  }
  const buffer = await file.arrayBuffer();
  return new TextDecoder().decode(buffer);
};

const isPdfFile = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

const parseCandidateFile = async (file: File) => {
  if (isPdfFile(file)) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/parse-cv", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          text?: string;
          name?: string;
        };
        if (payload?.text) {
          const cleaned = cleanCvText(payload.text).slice(0, CV_DETAIL_LIMIT);
          return {
            name: normalizeFileName(file.name).slice(0, 120),
            details: cleaned,
            sourceFileName: file.name,
          };
        }
      } else {
        const errorPayload = await response.json().catch(() => null);
        console.error(
          "PDF parser error",
          errorPayload?.error || response.statusText
        );
      }
    } catch (error) {
      console.error("Failed to parse PDF via PyPDF2", error);
    }
  }

  const rawContent = await readFileContent(file);
  const cleaned = cleanCvText(rawContent).slice(0, CV_DETAIL_LIMIT);
  const name = normalizeFileName(file.name).slice(0, 120);
  return {
    name,
    details: cleaned,
    sourceFileName: file.name,
  };
};

const parseJobDescriptionFile = async (file: File) => {
  if (isPdfFile(file)) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/parse-cv", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const payload = (await response.json()) as { text?: string };
        if (payload?.text) {
          return cleanCvText(payload.text).slice(0, JOB_DESCRIPTION_LIMIT);
        }
      } else {
        const errorPayload = await response.json().catch(() => null);
        console.error(
          "PDF parser error",
          errorPayload?.error || response.statusText
        );
      }
    } catch (error) {
      console.error("Failed to parse job description PDF", error);
    }
  }

  const rawContent = await readFileContent(file);
  return cleanCvText(rawContent).slice(0, JOB_DESCRIPTION_LIMIT);
};

export default function ProjectWorkspacePage() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get("projectId");
  const { data: session } = useSession();

  const [language] = useState<Language>("en");
  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [theme, setTheme] = useState<AppTheme>("dark");
  const [isThemeResolved, setIsThemeResolved] = useState(false);
  const [accountCredits, setAccountCredits] = useState<number | null>(null);
  const [planId, setPlanId] = useState<SubscriptionPlanId>(
    normalizeSubscriptionPlan(
      (session?.user as { subscriptionPlan?: SubscriptionPlanId | null } | null)
        ?.subscriptionPlan
    ) ?? DEFAULT_SUBSCRIPTION_PLAN
  );
  const [prompt, setPrompt] = useState("");
  const [searchQueries, setSearchQueries] = useState<SearchQueryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"sourcing" | "screening">(
    "sourcing"
  );
  const [searchPlatforms, setSearchPlatforms] = useState<SearchPlatform[]>([
    "linkedin",
  ]);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [candidateProfiles, setCandidateProfiles] = useState<
    CandidateProfileInput[]
  >([{ id: "candidate-1", name: "", details: "", sourceFileName: undefined }]);
  const [analysisResults, setAnalysisResults] = useState<CandidateFitResult[]>(
    []
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploadingJobDescription, setIsUploadingJobDescription] =
    useState(false);
  const [jobDescriptionUploadStatus, setJobDescriptionUploadStatus] =
    useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(
    () => new Set()
  );
  const [screeningHistory, setScreeningHistory] = useState<
    ScreeningHistoryEntry[]
  >([]);
  const [isScreeningHistoryLoading, setIsScreeningHistoryLoading] =
    useState(false);
  const [screeningHistoryError, setScreeningHistoryError] = useState<
    string | null
  >(null);
  const [expandedScreeningHistoryIds, setExpandedScreeningHistoryIds] =
    useState<Set<string>>(() => new Set());
  const [outreachCandidate, setOutreachCandidate] =
    useState<CandidateResult | null>(null);
  const [outreachChannel, setOutreachChannel] =
    useState<OutreachChannel>("linkedin");
  const [outreachLanguage, setOutreachLanguage] =
    useState<OutreachLanguage>("en");
  const [outreachMessage, setOutreachMessage] = useState("");
  const [isOutreachOpen, setIsOutreachOpen] = useState(false);
  const [isOutreachLoading, setIsOutreachLoading] = useState(false);
  const [outreachError, setOutreachError] = useState<string | null>(null);
  const [outreachCopied, setOutreachCopied] = useState(false);
  const cvInputRef = useRef<HTMLInputElement | null>(null);
  const jobDescriptionInputRef = useRef<HTMLInputElement | null>(null);
  const isUnmountedRef = useRef(false);

  const creditsRemainingRaw =
    (
      session?.user as {
        creditsRemaining?: number;
        name?: string | null;
        email?: string | null;
        subscriptionPlan?: SubscriptionPlanId | null;
      } | null
    )?.creditsRemaining ?? 0;
  const searchResultLimit =
    planId === "AGENCY" ? 90 : planId === "PRO" ? 70 : 50;
  const maxAnalysisCandidates = getPlanScreeningLimit(planId);

  useEffect(() => {
    const resolved = resolveStoredTheme();
    setTheme(resolved);
    setIsThemeResolved(true);
  }, []);

  useEffect(() => {
    if (!isThemeResolved) return;
    applyThemePreference(theme);
    persistThemePreference(theme);
  }, [theme, isThemeResolved]);

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  const fetchAccount = useCallback(async () => {
    try {
      const response = await fetch("/api/account", {
        method: "GET",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            account?: {
              creditsRemaining?: number;
              subscriptionPlan?: SubscriptionPlanId | null;
            };
            error?: string;
          }
        | null;
      if (!response.ok || !payload?.account) {
        throw new Error(payload?.error || "Failed to load account");
      }
      if (isUnmountedRef.current) return;
      setAccountCredits(payload.account.creditsRemaining ?? 0);
      const nextPlan =
        normalizeSubscriptionPlan(payload.account.subscriptionPlan) ??
        DEFAULT_SUBSCRIPTION_PLAN;
      setPlanId(nextPlan);
    } catch {
      if (isUnmountedRef.current) return;
      setAccountCredits(creditsRemainingRaw);
      setPlanId(
        normalizeSubscriptionPlan(
          (session?.user as { subscriptionPlan?: SubscriptionPlanId | null } | null)
            ?.subscriptionPlan
        ) ?? DEFAULT_SUBSCRIPTION_PLAN
      );
    }
  }, [creditsRemainingRaw, session?.user]);

  const fetchHistory = useCallback(async () => {
    if (!projectId) return;
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/search-history?limit=50`,
        { credentials: "include" }
      );
      const payload = (await response.json().catch(() => null)) as
        | { history?: SearchHistoryEntry[]; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load search history.");
      }
      const historyEntries = Array.isArray(payload?.history)
        ? payload?.history
        : [];
      if (!isUnmountedRef.current) {
        setSearchHistory(historyEntries);
      }
    } catch (error) {
      if (!isUnmountedRef.current) {
        setHistoryError(
          error instanceof Error
            ? error.message
            : language === "en"
            ? "Failed to load search history."
            : "Neuspesno ucitavanje istorije pretraga."
        );
      }
    } finally {
      if (!isUnmountedRef.current) {
        setIsHistoryLoading(false);
      }
    }
  }, [language, projectId]);

  const fetchScreeningHistory = useCallback(async () => {
    if (!projectId) return;
    setIsScreeningHistoryLoading(true);
    setScreeningHistoryError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/screening-history?limit=50`,
        { credentials: "include" }
      );
      const payload = (await response.json().catch(() => null)) as
        | { history?: ScreeningHistoryEntry[]; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load screening history.");
      }
      const historyEntries = Array.isArray(payload?.history)
        ? payload?.history
        : [];
      if (!isUnmountedRef.current) {
        setScreeningHistory(historyEntries);
      }
    } catch (error) {
      if (!isUnmountedRef.current) {
        setScreeningHistoryError(
          error instanceof Error
            ? error.message
            : language === "en"
            ? "Failed to load screening history."
            : "Neuspesno ucitavanje istorije screening-a."
        );
      }
    } finally {
      if (!isUnmountedRef.current) {
        setIsScreeningHistoryLoading(false);
      }
    }
  }, [language, projectId]);

  const handleDeleteHistory = useCallback(
    async (entryId: string) => {
      if (!projectId) return;
      try {
        const response = await fetch(
          `/api/projects/${projectId}/search-history`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ entryId }),
          }
        );
        const payload = (await response.json().catch(() => null)) as
          | { success?: boolean; error?: string }
          | null;
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || "Failed to delete history entry.");
        }
        if (!isUnmountedRef.current) {
          setSearchHistory((prev) => prev.filter((item) => item.id !== entryId));
          setExpandedHistoryIds((prev) => {
            const next = new Set(prev);
            next.delete(entryId);
            return next;
          });
        }
      } catch (error) {
        if (!isUnmountedRef.current) {
          setHistoryError(
            error instanceof Error
              ? error.message
              : language === "en"
              ? "Failed to delete history entry."
              : "Neuspesno brisanje istorije."
          );
        }
      }
    },
    [language, projectId]
  );

  const handleDeleteScreeningHistory = useCallback(
    async (entryId: string) => {
      if (!projectId) return;
      try {
        const response = await fetch(
          `/api/projects/${projectId}/screening-history`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ entryId }),
          }
        );
        const payload = (await response.json().catch(() => null)) as
          | { success?: boolean; error?: string }
          | null;
        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.error || "Failed to delete screening history entry."
          );
        }
        if (!isUnmountedRef.current) {
          setScreeningHistory((prev) =>
            prev.filter((item) => item.id !== entryId)
          );
          setExpandedScreeningHistoryIds((prev) => {
            const next = new Set(prev);
            next.delete(entryId);
            return next;
          });
        }
      } catch (error) {
        if (!isUnmountedRef.current) {
          setScreeningHistoryError(
            error instanceof Error
              ? error.message
              : language === "en"
              ? "Failed to delete screening history entry."
              : "Neuspesno brisanje istorije screening-a."
          );
        }
      }
    },
    [language, projectId]
  );

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    fetchHistory();
    fetchScreeningHistory();
  }, [fetchHistory, fetchScreeningHistory]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        fetchAccount();
        fetchHistory();
        fetchScreeningHistory();
      }
    };
    const intervalId = window.setInterval(() => {
      fetchAccount();
      fetchHistory();
      fetchScreeningHistory();
    }, 15000);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchAccount, fetchHistory, fetchScreeningHistory]);

  useEffect(() => {
    let isActive = true;

    const fetchProject = async () => {
      if (!projectId) {
        if (isActive) {
          setProject(null);
          setProjectError(null);
          setIsProjectLoading(false);
        }
        return;
      }

      if (typeof window === "undefined") return;

      setIsProjectLoading(true);
      setProjectError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          credentials: "include",
        });

        const payload = (await response.json().catch(() => null)) as
          | { project?: ProjectMeta; error?: string }
          | null;

        if (!response.ok) {
          const message =
            payload?.error ||
            (response.status === 404
              ? language === "en"
                ? "Project not found."
                : "Projekat nije pronadjen."
              : language === "en"
              ? "Failed to load project."
              : "Neuspesno ucitavanje projekta.");
          throw new Error(message);
        }

        if (!payload?.project) {
          throw new Error(
            language === "en" ? "Project not found." : "Projekat nije pronadjen."
          );
        }

        if (isActive) {
          setProject(payload.project);
        }
      } catch (error) {
        if (isActive) {
          setProject(null);
          setProjectError(
            error instanceof Error
              ? error.message
              : language === "en"
              ? "Failed to load project."
              : "Neuspesno ucitavanje projekta."
          );
        }
      } finally {
        if (isActive) {
          setIsProjectLoading(false);
        }
      }
    };

    fetchProject();

    return () => {
      isActive = false;
    };
  }, [projectId, language]);

  useEffect(() => {
    if (!copyStatus) return;
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => setCopyStatus(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  useEffect(() => {
    if (!outreachCopied) return;
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => setOutreachCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [outreachCopied]);

  useEffect(() => {
    if (!analysisError) return;
    setAnalysisError(null);
  }, [jobDescription, candidateProfiles]);

  useEffect(() => {
    if (!uploadStatus) return;
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => setUploadStatus(null), 2500);
    return () => window.clearTimeout(timer);
  }, [uploadStatus]);

  useEffect(() => {
    if (!jobDescriptionUploadStatus) return;
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(
      () => setJobDescriptionUploadStatus(null),
      2500
    );
    return () => window.clearTimeout(timer);
  }, [jobDescriptionUploadStatus]);

  const t = translations[language];
  const creditsValue = accountCredits ?? creditsRemainingRaw;
  const creditsDisplay = Number.isInteger(creditsValue)
    ? creditsValue.toString()
    : creditsValue.toFixed(1);
  const userDisplayName =
    (session?.user as { name?: string | null; email?: string | null } | null)
      ?.name ||
    (session?.user as { email?: string | null } | null)?.email ||
    "Account";
  const themeToggleLabel =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  const totalPages = Math.max(
    1,
    Math.ceil(candidates.length / RESULTS_PER_PAGE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * RESULTS_PER_PAGE;
  const paginatedCandidates = candidates.slice(
    startIndex,
    startIndex + RESULTS_PER_PAGE
  );
  const hasPagination = candidates.length > RESULTS_PER_PAGE;
  const hasSearchQueries = searchQueries.length > 0;
  const showSearchQueries = false;
  const shouldShowSearchQueries = showSearchQueries && hasSearchQueries;
  const hasValidCandidateProfiles = candidateProfiles.some(
    (candidate) => candidate.name.trim() && candidate.details.trim()
  );
  const canAnalyzeCandidates =
    Boolean(jobDescription.trim()) && hasValidCandidateProfiles;
  const isAnalyzeBlocked = !canAnalyzeCandidates;
  const candidateSlotsRemaining =
    Math.max(0, maxAnalysisCandidates - candidateProfiles.length);

  const toggleSearchPlatform = (platform: SearchPlatform) => {
    setSearchPlatforms((prev) => {
      const hasPlatform = prev.includes(platform);
      if (hasPlatform) {
        if (prev.length === 1) return prev; // require at least one active
        return prev.filter((item) => item !== platform);
      }
      return [...prev, platform];
    });
  };

  const handleToggleTheme = () => {
    if (!isThemeResolved) return;
    setTheme((current) => toggleThemeValue(current));
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      const hasPrompt = prompt.trim().length > 0;
      if (isLoading || !hasPrompt) return;
      event.preventDefault();
      void handleGenerate();
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const resolveOutreachChannel = (
    source?: SearchPlatform
  ): OutreachChannel => {
    if (source === "upwork" || source === "github") {
      return source;
    }
    return "linkedin";
  };

  const handleOpenOutreach = (candidate: CandidateResult) => {
    setOutreachCandidate(candidate);
    setOutreachChannel(resolveOutreachChannel(candidate.source));
    setOutreachLanguage(language === "sr" ? "sr" : "en");
    setOutreachMessage("");
    setOutreachError(null);
    setOutreachCopied(false);
    setIsOutreachOpen(true);
  };

  const handleCloseOutreach = () => {
    setIsOutreachOpen(false);
    setOutreachMessage("");
    setOutreachError(null);
    setOutreachCandidate(null);
  };

  const handleGenerateOutreach = async () => {
    if (!projectId || !outreachCandidate) return;
    setIsOutreachLoading(true);
    setOutreachError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/outreach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          channel: outreachChannel,
          language: outreachLanguage,
          candidate: {
            name: outreachCandidate.name,
            profileUrl: outreachCandidate.profileUrl,
            snippet: outreachCandidate.snippet ?? null,
            rawSnippet: outreachCandidate.snippet ?? null,
            source: outreachCandidate.source ?? null,
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; creditsRemaining?: number; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to generate outreach.");
      }

      setOutreachMessage(payload?.message?.trim() ?? "");
      if (typeof payload?.creditsRemaining === "number") {
        setAccountCredits(payload.creditsRemaining);
      }
    } catch (error) {
      setOutreachError(
        error instanceof Error ? error.message : "Failed to generate outreach."
      );
    } finally {
      setIsOutreachLoading(false);
    }
  };

  const handleCopyOutreach = async () => {
    if (!outreachMessage) return;
    try {
      await navigator.clipboard.writeText(outreachMessage);
      setOutreachCopied(true);
    } catch (error) {
      console.error("Failed to copy outreach message", error);
    }
  };

  const recordSearchHistory = useCallback(
    async ({
      promptValue,
      queries,
      results,
    }: {
      promptValue: string;
      queries: SearchQueryEntry[];
      results: CandidateResult[];
    }) => {
      if (!projectId) return;
      try {
        const historyResults: SavedHistoryResult[] = results.slice(0, 90).map(
          (item) =>
            ({
              name: item.name,
              profileUrl: item.profileUrl,
              snippet: item.snippet ?? null,
              rawSnippet: item.snippet ?? null,
              source: item.source ?? "unknown",
            } satisfies SavedHistoryResult)
        );
        const queryMap = queries.reduce<Record<string, string>>(
          (acc, entry) => {
            acc[entry.platform] = entry.query;
            return acc;
          },
          {}
        );
        await fetch(`/api/projects/${projectId}/search-history`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            prompt: promptValue,
            queries: queryMap,
            resultCount: results.length,
            results: historyResults,
          }),
        });
      } catch (error) {
        console.error("Failed to record search history", error);
      }
    },
    [projectId]
  );

  const recordScreeningHistory = useCallback(
    async ({
      jobTitleValue,
      jobDescriptionValue,
      candidates,
      results,
    }: {
      jobTitleValue: string | null;
      jobDescriptionValue: string;
      candidates: CandidateProfileInput[];
      results: CandidateFitResult[];
    }) => {
      if (!projectId) return;
      try {
        const historyResults = results.slice(0, 90).map((item) => ({
          id: item.id,
          name: item.name,
          fitScore: item.fitScore,
          rank: item.rank,
          explanation: item.explanation,
        }));
        await fetch(`/api/projects/${projectId}/screening-history`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            jobTitle: jobTitleValue,
            jobDescription: jobDescriptionValue,
            candidateCount: candidates.length,
            resultCount: results.length,
            results: historyResults,
          }),
        });
        void fetchScreeningHistory();
      } catch (error) {
        console.error("Failed to record screening history", error);
      }
    },
    [fetchScreeningHistory, projectId]
  );

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSearchQueries([]);
    setCandidates([]);
    setCurrentPage(1);

    const detectedCity = detectCityFromPrompt(trimmedPrompt);
    const platformsToSearch = searchPlatforms.length
      ? searchPlatforms
      : (["linkedin"] as SearchPlatform[]);

    const buildFallbackQueryForPlatform = (platform: SearchPlatform) => {
      if (platform === "linkedin") {
        return (
          buildSpecializedQuery(trimmedPrompt) ||
          `${buildSitePrefix(trimmedPrompt, null)} ${trimmedPrompt}`
        );
      }
      if (platform === "upwork") {
        return `site:upwork.com/freelancers ${trimmedPrompt}`;
      }
      return `site:github.com ${trimmedPrompt}`;
    };

    try {
      const generatedQueries = await Promise.all(
        platformsToSearch.map(async (platform) => {
          const fallbackQuery = buildFallbackQueryForPlatform(platform);
          let finalQuery = fallbackQuery;
          try {
            const response = await fetch("/api/generate-search-query", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ prompt: trimmedPrompt, platform }),
            });

            if (!response.ok) {
              const errorPayload = await response.json().catch(() => null);
              throw new Error(
                errorPayload?.error || "AI service returned an error."
              );
            }

            const data = await response.json();
            if (data?.query && typeof data.query === "string") {
              finalQuery = data.query.trim();
            } else {
              throw new Error("AI response is missing the query text.");
            }
          } catch (error) {
            console.error(error);
            const message =
              error instanceof Error ? error.message : "Unknown AI error.";
            setErrorMessage((prev) => (prev ? `${prev} | ${message}` : message));
          }

          return { platform, query: finalQuery };
        })
      );

      setSearchQueries(generatedQueries);

      const candidateResults = await Promise.allSettled(
        generatedQueries.map(async (entry) => {
          const city = entry.platform === "linkedin" ? detectedCity : null;
          const results = await fetchCandidatesForQuery({
            query: entry.query,
            city,
            sources: [entry.platform],
            prompt: trimmedPrompt,
          });
          return results.map((candidate) => ({
            ...candidate,
            source: entry.platform,
          }));
        })
      );

      const fallbackCandidates = createMockCandidates(trimmedPrompt);
      const candidateBuckets = generatedQueries.map((entry, index) => {
        const result = candidateResults[index];
        if (result.status === "fulfilled") {
          return result.value;
        }
        const message =
          result.reason instanceof Error
            ? result.reason.message
            : "Unknown Google search error.";
        setErrorMessage((prev) => (prev ? `${prev} | ${message}` : message));
        return fallbackCandidates.map((candidate) => ({
          ...candidate,
          source: entry.platform,
        }));
      });

      const mixedCandidates = mergeCandidateLists(candidateBuckets).slice(
        0,
        searchResultLimit
      );

      setCandidates(mixedCandidates);
      setCurrentPage(1);
      await recordSearchHistory({
        promptValue: trimmedPrompt,
        queries: generatedQueries,
        results: mixedCandidates,
      });
      fetchHistory();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleExport = (format: "csv" | "xlsx") => {
    if (!candidates.length) return;
    if (format === "csv") {
      downloadCsv(candidates);
    } else {
      downloadXlsx(candidates);
    }
  };

  const handleAnalysisExport = (format: "csv" | "xlsx") => {
    if (!analysisResults.length) return;
    if (format === "csv") {
      const csv = buildAnalysisCsvContent(analysisResults);
      downloadBlob(csv, "omnifaind-fit-analysis.csv");
    } else {
      const rows = analysisResults.map((result) => [
        result.rank,
        result.name,
        result.fitScore,
        result.explanation,
      ]);
      const blob = buildXlsxBlob("Analysis", analysisExportHeaders, rows);
      downloadFileBlob(blob, "omnifaind-fit-analysis.xlsx");
    }
  };

  const handleCopyQuery = async (query: string) => {
    if (!query) return;
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(query);
      setCopyStatus(language === "en" ? "Copied" : "Kopirano");
    } catch {
      setCopyStatus(
        language === "en"
          ? "Unable to copy query"
          : "Ne mozemo da kopiramo upit"
      );
    }
  };

  const handleAddCandidateProfile = () => {
    if (candidateProfiles.length >= maxAnalysisCandidates) return;
    const id = `candidate-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    setCandidateProfiles((prev) => [
      ...prev,
      { id, name: "", details: "", sourceFileName: undefined },
    ]);
  };

  const handleCandidateFieldChange = (
    id: string,
    field: "name" | "details",
    value: string
  ) => {
    setCandidateProfiles((prev) =>
      prev.map((candidate) =>
        candidate.id === id ? { ...candidate, [field]: value } : candidate
      )
    );
  };

  const handleRemoveCandidateProfile = (id: string) => {
    setCandidateProfiles((prev) => {
      if (prev.length === 1) {
        return [
          {
            ...prev[0],
            name: "",
            details: "",
            sourceFileName: undefined,
          },
        ];
      }
      return prev.filter((candidate) => candidate.id !== id);
    });
  };

  const handleAnalyzeCandidates = async () => {
    if (isAnalyzing) return;
    const normalizedJobTitle = jobTitle.trim();
    const normalizedJob = jobDescription.trim();
    const validCandidates = candidateProfiles.filter(
      (candidate) => candidate.name.trim() && candidate.details.trim()
    );

    if (!projectId) {
      setAnalysisError(
        language === "en"
          ? "Project not loaded. Refresh and try again."
          : "Projekat nije ucitan. Osvezi i probaj ponovo."
      );
      return;
    }

    if (!normalizedJob || !validCandidates.length) {
      setAnalysisError(
        language === "en"
          ? "Add a job description and at least one CV before analyzing."
          : "Dodaj opis posla i makar jedan CV pre analize."
      );
      return;
    }

    if (validCandidates.length > maxAnalysisCandidates) {
      setAnalysisError(
        language === "en"
          ? `Candidate limit reached (${maxAnalysisCandidates}).`
          : `Limit kandidata je ${maxAnalysisCandidates}.`
      );
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/screening`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          jobDescription: normalizedJob,
          candidates: validCandidates.map((candidate) => ({
            id: candidate.id,
            name: candidate.name,
            details: candidate.details,
            sourceLabel: candidate.sourceFileName ?? null,
          })),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { results?: CandidateFitResult[]; creditsRemaining?: number; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "AI analysis failed. Try again.");
      }

      if (!payload?.results || !Array.isArray(payload.results)) {
        throw new Error(
          language === "en"
            ? "AI response did not include results."
            : "AI odgovor nije vratio rezultate."
        );
      }

      setAnalysisResults(payload.results);
      if (typeof payload.creditsRemaining === "number") {
        setAccountCredits(payload.creditsRemaining);
      }
      void recordScreeningHistory({
        jobTitleValue: normalizedJobTitle || null,
        jobDescriptionValue: normalizedJob,
        candidates: validCandidates,
        results: payload.results,
      });
    } catch (error) {
      console.error(error);
      setAnalysisError(
        error instanceof Error
          ? error.message
          : language === "en"
          ? "AI analysis failed. Try again."
          : "AI analiza nije uspela. Pokusaj ponovo."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const fileList = input.files ? Array.from(input.files) : [];
    input.value = "";
    if (!fileList.length) return;

    const availableSlots = maxAnalysisCandidates - candidateProfiles.length;
    if (availableSlots <= 0) {
      setUploadStatus(
        language === "en"
          ? "Candidate limit reached."
          : "Dosegnut je limit kandidata."
      );
      return;
    }

    const files = fileList.slice(0, availableSlots);
    setIsUploadingCv(true);
    setUploadStatus(t.uploadProcessing);

    const generated: CandidateProfileInput[] = [];

    for (const file of files) {
      try {
        const parsed = await parseCandidateFile(file);
        generated.push({
          id: `candidate-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          name: parsed.name,
          details: parsed.details,
          sourceFileName: parsed.sourceFileName,
        });
      } catch (error) {
        console.error("Failed to parse CV file", error);
        setUploadStatus(t.uploadError);
      }
    }

    if (generated.length) {
      setCandidateProfiles((prev) => {
        const next = [...prev];
        generated.forEach((candidate) => {
          const emptyIndex = next.findIndex(
            (item) => !item.name.trim() && !item.details.trim()
          );
          if (emptyIndex !== -1) {
            next[emptyIndex] = candidate;
          } else if (next.length < maxAnalysisCandidates) {
            next.push(candidate);
          }
        });
        return next;
      });
      const successMessage =
        language === "en"
          ? `Imported ${generated.length} ${
              generated.length === 1 ? "CV" : "CVs"
            }.`
          : `Uvezeno ${generated.length} ${
              generated.length === 1 ? "CV" : "CV-a"
            }.`;
      setUploadStatus(successMessage);
    }

    setIsUploadingCv(false);
  };

  const handleJobDescriptionUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.target;
    const file = input.files ? input.files[0] : null;
    input.value = "";
    if (!file) return;

    setIsUploadingJobDescription(true);
    setJobDescriptionUploadStatus(
      language === "en"
        ? "Reading job description..."
        : "Ucitavam opis posla..."
    );

    try {
      const text = await parseJobDescriptionFile(file);
      if (!text.trim()) {
        throw new Error("Empty job description.");
      }
      setJobDescription(text);
      setJobDescriptionUploadStatus(
        language === "en"
          ? "Job description loaded."
          : "Opis posla je ucitan."
      );
    } catch (error) {
      console.error("Failed to parse job description file", error);
      setJobDescriptionUploadStatus(
        language === "en"
          ? "Unable to read job description."
          : "Ne mozemo da procitamo opis posla."
      );
    } finally {
      setIsUploadingJobDescription(false);
    }
  };

  const triggerJobDescriptionUploadPicker = () => {
    if (isUploadingJobDescription) return;
    jobDescriptionInputRef.current?.click();
  };

  const triggerCvUploadPicker = () => {
    if (
      candidateProfiles.length >= maxAnalysisCandidates ||
      isUploadingCv
    ) {
      setUploadStatus(
        language === "en"
          ? "Candidate limit reached."
          : "Dosegnut je limit kandidata."
      );
      return;
    }
    cvInputRef.current?.click();
  };

  if (isProjectLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-4 max-w-md">
          <p className="text-sm text-slate-300">
            {language === "en" ? "Loading project..." : "Ucitavam projekat..."}
          </p>
        </div>
      </main>
    );
  }

  if (!projectId || !project) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-4 max-w-md">
          <p className="text-sm text-slate-300">
            {projectError ||
              (language === "en"
                ? "Project not found. Go back to your dashboard."
                : "Projekat nije pronadjen. Vrati se na dashboard.")}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-50 hover:border-sky-500"
          >
            {language === "en" ? "Back to dashboard" : "Nazad na dashboard"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-4 sm:px-6 py-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Back to OmniFAIND home">
            <Image
              src="/OmniFAIND-logo.png"
              alt="OmniFAIND logo"
              width={160}
              height={54}
              className="h-12 w-auto rounded-xl border border-slate-800/70 bg-slate-950/80 px-4 py-2"
              priority
            />
          </Link>
          <p className="font-semibold text-sm text-slate-50">OmniFAIND</p>
        </div>

        <div className="flex flex-col items-start gap-2 text-sm text-slate-200 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Credits
            </span>
            <span className="text-2xl font-semibold text-emerald-400">
              {creditsDisplay}
            </span>
          </div>
          <button
            onClick={() => router.push("/dashboard/billing")}
            className="inline-flex items-center justify-center rounded-md border border-sky-500/70 px-3 py-2 text-sm font-medium text-slate-50 transition hover:bg-sky-500 hover:text-slate-950"
          >
            Buy credits
          </button>
          <button
            onClick={handleToggleTheme}
            disabled={!isThemeResolved}
            className="inline-flex items-center justify-center rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-50 hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
          >
            {themeToggleLabel}
          </button>
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <span className="font-medium truncate max-w-[180px]">{userDisplayName}</span>
            <button
              onClick={handleSignOut}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-50 hover:border-rose-500 hover:text-rose-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
              {language === "en" ? "Project" : "Projekat"}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold">
              {project.name}
            </h1>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs text-slate-400 hover:text-slate-100"
          >
            {language === "en" ? "← Projects" : "← Projekti"}
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          {["sourcing", "screening"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as "sourcing" | "screening")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-slate-800 text-slate-50 border border-slate-700"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {tab === "sourcing" ? "Sourcing" : "Screening"}
            </button>
          ))}
        </div>

        {activeTab === "sourcing" ? (
          <>
            <section className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-semibold">
                {t.sectionTitle}
              </h2>
              <p className="text-sm text-slate-400 max-w-2xl">
                {t.sectionDescription} {t.examplesIntro}{" "}
                <span className="text-sky-400">{t.exampleOne}</span>{" "}
                {t.exampleConnector}{" "}
                <span className="text-sky-400">{t.exampleTwo}</span>
              </p>
            </section>

            <section className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[260px,1fr] md:items-start">
                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium text-slate-200"
                  >
                    {t.platformLabel}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: "linkedin", label: t.platformOptionLinkedIn },
                      { key: "upwork", label: t.platformOptionUpwork },
                      { key: "github", label: t.platformOptionGithub },
                    ] as { key: SearchPlatform; label: string }[]).map(
                      (option) => {
                        const isActive = searchPlatforms.includes(option.key);
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => toggleSearchPlatform(option.key)}
                            disabled={isLoading}
                            className={`rounded-full border px-4 py-2 text-sm transition ${
                              isActive
                                ? "border-sky-500 bg-sky-500/15 text-slate-100 shadow-[0_0_0_1px_rgba(14,165,233,0.2)]"
                                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-sky-500 hover:text-sky-100"
                            }`}
                            aria-pressed={isActive}
                          >
                            {option.label}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="prompt-input"
                    className="block text-sm font-medium text-slate-200"
                  >
                    {t.promptLabel} (
                    <span className="text-slate-400 text-xs">{project.name}</span>
                    )
                  </label>
                  <div className="flex flex-col md:flex-row gap-3">
                    <textarea
                      id="prompt-input"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handlePromptKeyDown}
                      placeholder={t.placeholder}
                      rows={3}
                      className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isLoading}
                    />
                    <div className="flex flex-col gap-2 w-full md:w-48">
                      <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-200"
                      >
                        {isLoading ? t.generating : t.generate}
                      </button>
                      <button
                        onClick={() => setPrompt("")}
                        disabled={isLoading || !prompt}
                        className="text-xs text-slate-400 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600 text-left md:text-center"
                      >
                        {language === "en" ? "Clear prompt" : "Ocisti upit"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {errorMessage && (
              <div className="rounded-2xl border border-amber-600 bg-amber-500/10 p-4 space-y-2">
                <p className="text-sm font-medium text-amber-200">
                  {t.errorNotice}
                </p>
                <p className="text-xs font-mono text-amber-100 break-all">
                  {errorMessage}
                </p>
              </div>
            )}

            {shouldShowSearchQueries && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {t.searchPanelTitle}
                  </p>
                  <p className="text-sm text-slate-400">
                    {t.searchPanelDescription}
                  </p>
                </div>
                {copyStatus && (
                  <p className="text-xs text-slate-500">{copyStatus}</p>
                )}
                <div className="space-y-3">
                  {searchQueries.map((entry) => (
                    <div
                      key={entry.platform}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          {entry.platform === "linkedin"
                            ? "LinkedIn"
                            : entry.platform === "upwork"
                            ? "Upwork"
                            : "GitHub"}
                        </span>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(
                              entry.query
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-3 py-1 text-slate-950 transition-colors hover:bg-emerald-400"
                          >
                            {t.searchPanelButton}
                          </a>
                          <button
                            onClick={() => handleCopyQuery(entry.query)}
                            className="inline-flex items-center justify-center rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-sky-500 hover:text-sky-200"
                          >
                            {language === "en" ? "Copy query" : "Kopiraj upit"}
                          </button>
                        </div>
                      </div>
                      <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3 font-mono text-xs text-slate-200 break-words">
                        {entry.query}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-50">
                    {t.candidateSectionTitle}
                  </h3>
                  <p className="text-xs text-slate-400">{t.candidateHint}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => handleExport("csv")}
                    disabled={!candidates.length}
                    className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                  >
                    CSV
                  </button>
                    <button
                      onClick={() => handleExport("xlsx")}
                      disabled={!candidates.length}
                      className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                    >
                      XLSX
                    </button>
                </div>
              </div>

              {candidates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-400">
                  {t.candidateEmpty}
                </div>
              ) : (
                <>
                  <ol className="space-y-3" start={startIndex + 1}>
                    {paginatedCandidates.map((candidate, index) => (
                      <li
                        key={candidate.profileUrl}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-50">
                              {startIndex + index + 1}.{" "}
                              <a
                                href={candidate.profileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-400 hover:text-sky-300"
                              >
                                {candidate.name}
                              </a>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <a
                              href={candidate.profileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-sky-500 hover:text-sky-200 whitespace-nowrap"
                            >
                              {language === "en" ? "See more" : "Pogledaj"}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleOpenOutreach(candidate)}
                              className="rounded-md bg-emerald-500 px-3 py-1 text-slate-950 hover:bg-emerald-400 whitespace-nowrap"
                            >
                              AI outreach
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {hasPagination && (
                    <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
                      <p>
                        {t.paginationLabel} {safePage} {t.paginationConnector}{" "}
                        {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handlePrevPage}
                          disabled={safePage === 1}
                          className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                        >
                          {t.paginationPrev}
                        </button>
                        <button
                          onClick={handleNextPage}
                          disabled={safePage === totalPages}
                          className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                        >
                          {t.paginationNext}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {language === "en" ? "Search history" : "Istorija pretraga"}
                  </p>
                  <p className="text-sm text-slate-400">
                    {language === "en"
                      ? "Your last 50 searches for this project."
                      : "Poslednjih 50 pretraga za ovaj projekat."}
                  </p>
                </div>
                <button
                  onClick={fetchHistory}
                  disabled={isHistoryLoading}
                  className="text-xs text-slate-400 hover:text-slate-100 disabled:text-slate-600"
                >
                  {isHistoryLoading
                    ? language === "en"
                      ? "Refreshing..."
                      : "Osvezavam..."
                    : language === "en"
                    ? "Refresh"
                    : "Osvezi"}
                </button>
              </div>

              {historyError && (
                <p className="text-xs text-rose-300">{historyError}</p>
              )}

              {isHistoryLoading ? (
                <p className="text-sm text-slate-400">
                  {language === "en" ? "Loading history..." : "Ucitavam istoriju..."}
                </p>
              ) : searchHistory.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {language === "en"
                    ? "No past searches yet."
                    : "Nema sacuvanih pretraga."}
                </p>
              ) : (
                <div className="space-y-3">
                  {searchHistory.map((entry) => {
                    const isExpanded = expandedHistoryIds.has(entry.id);
                    const created = new Date(entry.createdAt);
                    const createdLabel = Number.isNaN(created.getTime())
                      ? entry.createdAt
                      : created.toLocaleString();
                    return (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-2"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-100">
                              {entry.prompt}
                            </p>
                            <p className="text-xs text-slate-500">
                              {createdLabel} •{" "}
                              {(entry.resultCount ?? 0).toLocaleString()}{" "}
                              {language === "en" ? "results" : "rezultata"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              onClick={() => {
                                setExpandedHistoryIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(entry.id)) {
                                    next.delete(entry.id);
                                  } else {
                                    next.add(entry.id);
                                  }
                                  return next;
                                });
                              }}
                              className="text-sky-300 hover:text-sky-100"
                            >
                              {isExpanded
                                ? language === "en"
                                  ? "Hide results"
                                  : "Sakrij rezultate"
                                : language === "en"
                                ? "View results"
                                : "Prikazi rezultate"}
                            </button>
                            <button
                              onClick={() => handleDeleteHistory(entry.id)}
                              className="text-rose-300 hover:text-rose-200"
                            >
                              {language === "en" ? "Delete" : "Obrisi"}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="max-h-72 overflow-y-auto pr-2 space-y-2">
                            {entry.results && entry.results.length ? (
                              entry.results.map((result, index) => (
                                <div
                                  key={`${entry.id}-${index}`}
                                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-3"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="space-y-1">
                                      <p className="text-sm font-semibold text-slate-100">
                                        {result.name}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() =>
                                        window.open(result.profileUrl, "_blank")
                                      }
                                      className="shrink-0 rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-sky-500 hover:text-sky-200 whitespace-nowrap"
                                    >
                                      {language === "en"
                                        ? "See more"
                                        : "Pogledaj"}
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500">
                                {language === "en"
                                  ? "No saved profiles for this search."
                                  : "Nema sacuvanih profila za ovu pretragu."}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-50">
                  {t.jobDescriptionLabel}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === "en"
                    ? "Outline expectations so the AI can score candidates accurately."
                    : "Opi\u0161i sve uslove kako bi AI ta\u010dno rangirao kandidate."}
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  {t.jobTitleLabel}
                </label>
                <input
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  placeholder={t.jobTitlePlaceholder}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder={t.jobDescriptionPlaceholder}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                rows={4}
              />
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  onClick={triggerJobDescriptionUploadPicker}
                  disabled={isUploadingJobDescription}
                  className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm transition-colors ${
                    isUploadingJobDescription
                      ? "border-slate-800 text-slate-600 cursor-not-allowed"
                      : "border-slate-700 text-slate-200 hover:border-sky-500 hover:text-sky-200"
                  }`}
                >
                  {language === "en"
                    ? "Upload job description (PDF)"
                    : "Otpremi opis posla (PDF)"}
                </button>
                <input
                  id="job-description-upload-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  ref={jobDescriptionInputRef}
                  disabled={isUploadingJobDescription}
                  onChange={handleJobDescriptionUpload}
                />
                {jobDescriptionUploadStatus && (
                  <span className="text-xs text-slate-500">
                    {jobDescriptionUploadStatus}
                  </span>
                )}
              </div>
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 p-4 space-y-2">
                <p className="text-sm text-slate-300">
                  {t.uploadHint.replace(
                    "{count}",
                    maxAnalysisCandidates.toString()
                  )}
                </p>
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={triggerCvUploadPicker}
                    className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm transition-colors ${
                      candidateProfiles.length >= maxAnalysisCandidates ||
                      isUploadingCv
                        ? "border-slate-800 text-slate-600 cursor-not-allowed"
                        : "border-slate-700 text-slate-200 hover:border-sky-500 hover:text-sky-200"
                    }`}
                    disabled={
                      candidateProfiles.length >= maxAnalysisCandidates ||
                      isUploadingCv
                    }
                  >
                    {isUploadingCv ? t.uploadProcessing : t.uploadCta}
                  </button>
                  <input
                    id="cv-upload-input"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    ref={cvInputRef}
                    disabled={
                      candidateProfiles.length >= maxAnalysisCandidates ||
                      isUploadingCv
                    }
                    onChange={handleCvUpload}
                  />
                  <span className="text-xs text-slate-500">
                    {t.uploadLimitNote.replace(
                      "{count}",
                      maxAnalysisCandidates.toString()
                    )}
                  </span>
                </div>
                {uploadStatus && (
                  <p className="text-xs text-slate-400">{uploadStatus}</p>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-medium text-slate-200">
                    {t.candidateUploadLabel}
                  </p>
                  <span className="text-xs text-slate-500">
                    {candidateProfiles.length}/{maxAnalysisCandidates}
                  </span>
                </div>
                <div className="space-y-3">
                  {candidateProfiles.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-3"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                          value={candidate.name}
                          onChange={(event) =>
                            handleCandidateFieldChange(
                              candidate.id,
                              "name",
                              event.target.value
                            )
                          }
                          placeholder={t.candidateNamePlaceholder}
                          className="flex-1 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <button
                          onClick={() => handleRemoveCandidateProfile(candidate.id)}
                          className="text-xs text-slate-500 hover:text-rose-300"
                        >
                          {language === "en" ? "Remove" : "Ukloni"}
                        </button>
                      </div>
                      {candidate.sourceFileName && (
                        <p className="text-xs text-slate-500">
                          {t.uploadedFromFile}: {candidate.sourceFileName}
                        </p>
                      )}
                      {!candidate.sourceFileName && (
                        <textarea
                          value={candidate.details}
                          onChange={(event) =>
                            handleCandidateFieldChange(
                              candidate.id,
                              "details",
                              event.target.value
                            )
                          }
                          placeholder={t.candidateDetailsPlaceholder}
                          className="w-full rounded-md border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          rows={3}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <button
                    onClick={handleAddCandidateProfile}
                    disabled={candidateProfiles.length >= maxAnalysisCandidates}
                    className="inline-flex items-center justify-center rounded-md border border-slate-800 px-4 py-2 text-sm text-slate-200 hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                  >
                    {t.addCandidate}
                    {candidateSlotsRemaining > 0
                      ? ` (+${candidateSlotsRemaining})`
                      : ""}
                  </button>
                  <button
                    onClick={handleAnalyzeCandidates}
                    disabled={isAnalyzing}
                    aria-disabled={isAnalyzeBlocked}
                    className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      isAnalyzeBlocked && !isAnalyzing
                        ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                        : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    } ${isAnalyzing ? "cursor-wait bg-emerald-600 text-slate-950" : ""}`}
                  >
                    {isAnalyzing ? t.analyzing : t.analyze}
                  </button>
                </div>
                {isAnalyzeBlocked && !isAnalyzing && (
                  <p className="text-xs text-slate-500">
                    {t.analysisRequirementHint}
                  </p>
                )}
                {analysisError && (
                  <p className="text-xs text-rose-300">{analysisError}</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-50">
                    {t.analysisSectionTitle}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === "en"
                      ? "Ranking prioritizes skill overlap and seniority cues."
                      : "Rangiranje daje prednost poklapanju skilova i senioritetu."}
                  </p>
                </div>
                {analysisResults.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="text-slate-500">
                      {t.analysisExportLabel}
                    </span>
                    <button
                      onClick={() => handleAnalysisExport("csv")}
                      className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-sky-500 hover:text-sky-200"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => handleAnalysisExport("xlsx")}
                      className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-sky-500 hover:text-sky-200"
                    >
                      XLSX
                    </button>
                    <button
                      onClick={() => setAnalysisResults([])}
                      className="text-slate-400 hover:text-slate-100"
                    >
                      {language === "en" ? "Clear results" : "Ocisti rezultate"}
                    </button>
                  </div>
                )}
              </div>
              {analysisResults.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-400">
                  {t.analysisEmpty}
                </div>
              ) : (
                <div className="space-y-3">
                  {analysisResults.map((result) => (
                    <div
                      key={result.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                            {t.rankingLabel} {result.rank}
                          </p>
                          <p className="text-lg font-semibold text-slate-50">
                            {result.name}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xs text-slate-500">
                            {t.fitScoreLabel}
                          </p>
                          <p className="text-2xl font-semibold text-emerald-400">
                            {result.fitScore.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300">
                        <span className="font-semibold text-slate-200">
                          {t.reasonLabel}:
                        </span>{" "}
                        {result.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {t.screeningHistoryTitle}
                  </p>
                  <p className="text-sm text-slate-400">
                    {t.screeningHistoryDescription}
                  </p>
                </div>
                <button
                  onClick={fetchScreeningHistory}
                  disabled={isScreeningHistoryLoading}
                  className="text-xs text-slate-400 hover:text-slate-100 disabled:text-slate-600"
                >
                  {isScreeningHistoryLoading
                    ? language === "en"
                      ? "Refreshing..."
                      : "Osvezavam..."
                    : language === "en"
                    ? "Refresh"
                    : "Osvezi"}
                </button>
              </div>

              {isScreeningHistoryLoading ? (
                <p className="text-sm text-slate-400">
                  {language === "en"
                    ? "Loading history..."
                    : "Ucitavam istoriju..."}
                </p>
              ) : screeningHistory.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {t.screeningHistoryEmpty}
                </p>
              ) : (
                <div className="space-y-3">
                  {screeningHistory.map((entry) => {
                    const isExpanded = expandedScreeningHistoryIds.has(entry.id);
                    const created = new Date(entry.createdAt);
                    const createdLabel = Number.isNaN(created.getTime())
                      ? entry.createdAt
                      : created.toLocaleString();
                    const resultCount =
                      entry.resultCount ?? entry.results?.length ?? 0;
                    const candidateCount = entry.candidateCount ?? 0;
                    const title =
                      entry.jobTitle && entry.jobTitle.trim().length > 0
                        ? entry.jobTitle
                        : t.jobTitlePlaceholder;
                    return (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-2"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-100">
                              {title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {createdLabel} ·{" "}
                              {candidateCount.toLocaleString()}{" "}
                              {language === "en"
                                ? "candidates"
                                : "kandidata"}{" "}
                              · {resultCount.toLocaleString()}{" "}
                              {language === "en" ? "results" : "rezultata"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              onClick={() => {
                                setExpandedScreeningHistoryIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(entry.id)) {
                                    next.delete(entry.id);
                                  } else {
                                    next.add(entry.id);
                                  }
                                  return next;
                                });
                              }}
                              className="text-sky-300 hover:text-sky-100"
                            >
                              {isExpanded
                                ? language === "en"
                                  ? "Hide results"
                                  : "Sakrij rezultate"
                                : language === "en"
                                ? "View results"
                                : "Prikazi rezultate"}
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteScreeningHistory(entry.id)
                              }
                              className="text-rose-300 hover:text-rose-200"
                            >
                              {language === "en" ? "Delete" : "Obrisi"}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="max-h-72 overflow-y-auto pr-2 space-y-2">
                            {entry.results && entry.results.length ? (
                              entry.results.map((result) => (
                                <div
                                  key={`${entry.id}-${result.id}`}
                                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-3"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="space-y-1">
                                      <p className="text-sm font-semibold text-slate-100">
                                        #{result.rank} · {result.name}
                                      </p>
                                      <p className="text-xs text-slate-400">
                                        {result.explanation}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-slate-500">
                                        {t.fitScoreLabel}
                                      </p>
                                      <p className="text-lg font-semibold text-emerald-400">
                                        {result.fitScore.toFixed(1)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500">
                                {language === "en"
                                  ? "No saved results for this screening."
                                  : "Nema sacuvanih rezultata za ovaj screening."}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
      {isOutreachOpen && outreachCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-3 py-4 sm:px-4 sm:py-6">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  AI outreach
                </p>
                <h3 className="text-lg font-semibold text-slate-100">
                  {outreachCandidate.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === "en" ? "Source" : "Izvor"}:{" "}
                  {outreachChannel === "upwork"
                    ? "Upwork"
                    : outreachChannel === "github"
                    ? "GitHub"
                    : "LinkedIn"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseOutreach}
                className="self-start text-xs text-slate-400 hover:text-slate-100"
              >
                {language === "en" ? "Close" : "Zatvori"}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.2fr_auto] md:items-end">
              <label className="space-y-2 text-xs text-slate-400">
                <span>{language === "en" ? "Language" : "Jezik"}</span>
                <select
                  value={outreachLanguage}
                  onChange={(event) =>
                    setOutreachLanguage(event.target.value as OutreachLanguage)
                  }
                  className="w-full rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {outreachLanguageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={handleGenerateOutreach}
                disabled={isOutreachLoading}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isOutreachLoading
                    ? "bg-slate-800 text-slate-500 cursor-wait"
                    : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                }`}
              >
                {isOutreachLoading
                  ? language === "en"
                    ? "Generating..."
                    : "Generisem..."
                  : language === "en"
                  ? "Generate message"
                  : "Generisi poruku"}
              </button>
            </div>

            {outreachError && (
              <p className="text-xs text-rose-300">{outreachError}</p>
            )}

            <textarea
              value={outreachMessage}
              readOnly
              placeholder={
                language === "en"
                  ? "Your outreach message will appear here."
                  : "Poruka ce se prikazati ovde."
              }
              className="min-h-[160px] w-full rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={handleCopyOutreach}
                disabled={!outreachMessage}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
              >
                {outreachCopied
                  ? language === "en"
                    ? "Copied!"
                    : "Kopirano!"
                  : language === "en"
                  ? "Copy message"
                  : "Kopiraj poruku"}
              </button>
              <button
                type="button"
                onClick={handleCloseOutreach}
                className="text-slate-400 hover:text-slate-100"
              >
                {language === "en" ? "Close" : "Zatvori"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

