"use client";

import Image from "next/image";
import Link from "next/link";
import { PwaInstallCard } from "@/components/dashboard/pwa-install-card";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { signOut, useSession } from "next-auth/react";
import {
  DEFAULT_SUBSCRIPTION_PLAN,
  getPlanContactLimit,
  getPlanLabel,
  getPlanProjectLimit,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";
import {
  applyThemePreference,
  persistThemePreference,
  resolveStoredTheme,
  toggleThemeValue,
} from "@/lib/ui/theme";

type Language = "en" | "sr";

type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  createdAt: string;
};

type AccountSnapshot = {
  subscriptionPlan: SubscriptionPlanId;
  creditsRemaining: number;
  trialEndsAt: string | null;
  contactLimit: number;
};

type DeviceSession = {
  id: string;
  deviceId: string | null;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
};

const PROJECT_DESCRIPTION_LIMIT = 600;

const copy = {
  en: {
    header: "Projects",
    subheader:
      "Each plan has its own project limit. Every project keeps a dedicated sourcing & screening workspace.",
    planOverviewTitle: "Subscription overview",
    planLabel: "Plan",
    creditsLabel: "Credits remaining",
    trialLabel: "Trial status",
    trialActiveText: "Trial ends in",
    trialExpiredText: "Trial ended",
    planUsageTitle: "Usage rules",
    planCreditRule: "1 sourcing search = 1 credit",
    planOutreachRule: "1 AI outreach message = 0.2 credits",
    planContactRule: "Up to {count} contacts per sourcing run",
    planProjectRule: "Up to {count} active projects",
    emptyCta: "Create a project",
    newProject: "New project",
    limitReached: "Project limit reached ({count} projects for this plan).",
    modalTitle: "Create project",
    modalPlaceholder: "e.g. Senior .NET Developer",
    modalDescriptionLabel: "Project description",
    modalDescriptionPlaceholder:
      "Tell us what this project is for so the AI can personalize each outreach.",
    modalDescriptionHint:
      "Example: Sourcing 5 senior .NET developers in DACH to pitch our AI test automation platform.",
    cancel: "Cancel",
    save: "Save",
    createdLabel: "Created",
    open: "Open workspace",
    buyCredits: "Buy credits",
    sessionExpired: "Session expired. Please sign in again.",
  },
  sr: {
    header: "Projekti",
    subheader:
      "Tvoj plan odredjuje koliko aktivnih projekata mozes da imas. Svaki projekat ima sopstveni sourcing i screening prostor.",
    planOverviewTitle: "Pregled pretplate",
    planLabel: "Paket",
    creditsLabel: "Preostali krediti",
    trialLabel: "Trial status",
    trialActiveText: "Trial se zavrsava za",
    trialExpiredText: "Trial je istekao",
    planUsageTitle: "Pravila korišćenja",
    planCreditRule: "1 sourcing pretraga = 1 kredit",
    planOutreachRule: "1 AI outreach poruka = 0.2 kredita",
    planContactRule: "Do {count} kontakata po jednoj pretrazi",
    planProjectRule: "Do {count} aktivnih projekata",
    emptyCta: "Kreiraj projekat",
    newProject: "Novi projekat",
    limitReached: "Limit projekata je dostignut ({count} za ovaj paket).",
    modalTitle: "Kreiraj projekat",
    modalPlaceholder: "npr. Senior .NET Developer",
    modalDescriptionLabel: "Opis projekta",
    modalDescriptionPlaceholder:
      "Objasni zasto ti treba ovaj projekat i kome se obracas.",
    modalDescriptionHint:
      "Primer: Trazimo 5 senior .NET developera u DACH regionu da ponudimo AI platformu za automatizaciju testova.",
    cancel: "Otkaži",
    save: "Sačuvaj",
    createdLabel: "Kreirano",
    open: "Otvori workspace",
    buyCredits: "Kupi kredite",
    sessionExpired: "Sesija je istekla. Prijavi se ponovo.",
  },
} as const;

const formatDate = (value: string, language: Language) => {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }
  try {
    return new Intl.DateTimeFormat(
      language === "en" ? "en-US" : "sr-RS",
      { dateStyle: "medium" }
    ).format(timestamp);
  } catch {
    return timestamp.toLocaleDateString();
  }
};

const describeDevice = (session: DeviceSession) => {
  if (session.deviceName) return session.deviceName;
  if (session.deviceId) return `Device ${session.deviceId.slice(0, 8)}`;
  if (session.userAgent)
    return session.userAgent.split(" ").slice(0, 3).join(" ");
  return "Unknown device";
};

export default function DashboardHomePage() {
  const [language] = useState<Language>("en");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isThemeResolved, setIsThemeResolved] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectInput, setProjectInput] = useState("");
  const [projectDescriptionInput, setProjectDescriptionInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const { data: session } = useSession();
  const activePlanId: SubscriptionPlanId =
    (session?.user?.subscriptionPlan as SubscriptionPlanId | undefined) ??
    DEFAULT_SUBSCRIPTION_PLAN;
  const sessionTrialEndsAt =
    session?.user?.trialEndsAt != null
      ? new Date(session.user.trialEndsAt).toISOString()
      : null;
  const [accountSnapshot, setAccountSnapshot] = useState<AccountSnapshot>({
    subscriptionPlan: activePlanId,
    creditsRemaining: session?.user?.creditsRemaining ?? 0,
    trialEndsAt: sessionTrialEndsAt,
    contactLimit: getPlanContactLimit(activePlanId),
  });
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [isAccountRefreshing, setIsAccountRefreshing] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const planDisplayName = getPlanLabel(accountSnapshot.subscriptionPlan);
  const creditsRemaining = accountSnapshot.creditsRemaining;
  const formatCredits = (value: number) =>
    Number.isInteger(value) ? value.toString() : value.toFixed(1);
  const creditsDisplay = formatCredits(creditsRemaining);
  const trialEndsAt = accountSnapshot.trialEndsAt
    ? new Date(accountSnapshot.trialEndsAt)
    : null;
  const now = Date.now();
  const trialMillisRemaining =
    trialEndsAt?.getTime() != null ? trialEndsAt.getTime() - now : null;
  const isTrialActive =
    typeof trialMillisRemaining === "number" && trialMillisRemaining > 0;
  const trialDaysRemaining = isTrialActive
    ? Math.max(
        0,
        Math.ceil((trialMillisRemaining as number) / (1000 * 60 * 60 * 24))
      )
    : 0;

  const t = copy[language];

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/projects", {
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as
        | { projects?: Project[]; error?: string }
        | null;
      if (response.status === 401) {
        throw new Error(t.sessionExpired);
      }
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load projects.");
      }
      const fetchedProjects = Array.isArray(payload?.projects)
        ? payload?.projects
        : [];
      setProjects(fetchedProjects);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load projects."
      );
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [t.sessionExpired]);

  const fetchDeviceSessions = useCallback(async () => {
    setDeviceLoading(true);
    setDeviceError(null);
    try {
      const response = await fetch("/api/account/sessions", {
        credentials: "include",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to load devices.");
      }
      const data = await response.json();
      setDeviceSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (error) {
      setDeviceError(
        error instanceof Error ? error.message : "Unable to load devices."
      );
    } finally {
      setDeviceLoading(false);
    }
  }, []);

  const revokeDeviceSession = useCallback(
    async (sessionId: string) => {
      try {
        const response = await fetch("/api/account/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sessionId }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to revoke device.");
        }
        fetchDeviceSessions();
      } catch (error) {
        setDeviceError(
          error instanceof Error ? error.message : "Unable to revoke device."
        );
      }
    },
    [fetchDeviceSessions]
  );

  const renameDeviceSession = useCallback(
    async (sessionId: string, deviceName: string) => {
      try {
        const response = await fetch("/api/account/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sessionId, action: "rename", deviceName }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to rename device.");
        }
        fetchDeviceSessions();
      } catch (error) {
        setDeviceError(
          error instanceof Error ? error.message : "Unable to rename device."
        );
        throw error;
      }
    },
    [fetchDeviceSessions]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const projectLimit = getPlanProjectLimit(accountSnapshot.subscriptionPlan);

  const handleProjectSave = async () => {
    if (!projectInput.trim() || !projectDescriptionInput.trim()) return;
    if (projects.length >= projectLimit || isSaving) return;
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectInput.trim(),
          description: projectDescriptionInput
            .trim()
            .slice(0, PROJECT_DESCRIPTION_LIMIT),
        }),
      });
      const payload = await response.json().catch(() => null);
      const createdProject = payload?.project as Project | undefined;
      if (!response.ok || !createdProject) {
        throw new Error(payload?.error || "Unable to create project.");
      }
      setProjects((prev) => [...prev, createdProject]);
      setProjectInput("");
      setProjectDescriptionInput("");
      setIsModalOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to create project."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const removeProject = async (slug: string) => {
    if (!slug) return;
    setDeletingSlug(slug);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/projects/${slug}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to delete project.");
      }
      setProjects((prev) => prev.filter((project) => project.slug !== slug));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete project."
      );
    } finally {
      setDeletingSlug((current) => (current === slug ? null : current));
    }
  };

  const trialEndDateLabel = trialEndsAt
    ? formatDate(trialEndsAt.toISOString(), language)
    : null;
  const trialStatusText = isTrialActive
    ? `${t.trialActiveText} ${trialDaysRemaining} ${
        language === "en" ? "days" : "dana"
      }${trialEndDateLabel ? ` - ${trialEndDateLabel}` : ""}`
    : t.trialExpiredText;

  const handleThemeToggle = () => {
    setTheme((current) => toggleThemeValue(current));
  };

  useEffect(() => {
    const resolved = resolveStoredTheme();
    setTheme(resolved as "dark" | "light");
    setIsThemeResolved(true);
  }, []);

  useEffect(() => {
    if (!isThemeResolved) return;
    applyThemePreference(theme);
    persistThemePreference(theme);
  }, [theme, isThemeResolved]);

  const userDisplayName = session?.user?.name || session?.user?.email || "Account";

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const isUnmountedRef = useRef(false);
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  const fetchAccountSnapshot = useCallback(async () => {
    if (!session?.user?.id) {
      if (!isUnmountedRef.current) {
        setIsAccountRefreshing(false);
      }
      return;
    }
    setIsAccountRefreshing(true);
    setAccountError(null);
    try {
      const response = await fetch("/api/account", {
        method: "GET",
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.account) {
        throw new Error(payload?.error || "Unable to load account details.");
      }
      if (isUnmountedRef.current) return;
      const nextPlanId =
        (payload.account.subscriptionPlan as SubscriptionPlanId | undefined) ??
        DEFAULT_SUBSCRIPTION_PLAN;
      setAccountSnapshot({
        subscriptionPlan: nextPlanId,
        creditsRemaining: payload.account.creditsRemaining ?? 0,
        trialEndsAt: payload.account.trialEndsAt ?? null,
        contactLimit:
          payload.account.contactLimit ?? getPlanContactLimit(nextPlanId),
      });
    } catch (error) {
      if (isUnmountedRef.current) return;
      setAccountError(
        error instanceof Error
          ? error.message
          : "Unable to refresh account details."
      );
    } finally {
      if (!isUnmountedRef.current) {
        setIsAccountRefreshing(false);
      }
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchAccountSnapshot();
  }, [fetchAccountSnapshot]);

  useEffect(() => {
    fetchDeviceSessions();
  }, [fetchDeviceSessions]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const handleVisibility = () => {
      if (!document.hidden) {
        fetchAccountSnapshot();
      }
    };
    const intervalId = window.setInterval(fetchAccountSnapshot, 15000);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchAccountSnapshot, session?.user?.id]);

  const handleProjectInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleProjectSave();
    }
  };

  return (
    <main className="app-shell min-h-screen bg-slate-950 text-slate-50">
      <header className="flex flex-col gap-4 border-b border-slate-800 bg-slate-950/70 px-6 py-4 shadow-[0_8px_25px_rgba(2,6,23,0.6)] backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Image
              src="/OmniFAIND-logo.png"
              alt="OmniFAIND"
              width={140}
              height={36}
              priority
              className="h-10 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] invert-0 dark:invert brightness-110"
            />
          </Link>
          <div>
            <p className="text-sm text-slate-400">Signed in as</p>
            <p className="text-lg font-semibold text-slate-50">
              {userDisplayName}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleThemeToggle}
            className="inline-flex items-center justify-center rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-500 hover:text-sky-100"
          >
            {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          </button>
          <button
            onClick={handleSignOut}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-rose-500 hover:text-rose-300 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <PwaInstallCard language={language} theme={theme} />
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {t.planOverviewTitle}
              </p>
              <p className="text-lg font-semibold text-slate-50">
                {t.planLabel}: {planDisplayName}
              </p>
              <p className="text-xs text-slate-400">
                {t.trialLabel}: {trialStatusText}
              </p>
              {accountError && (
                <p className="text-[11px] text-amber-300">{accountError}</p>
              )}
            </div>
            <div className="text-left md:text-right">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {t.creditsLabel}
              </p>
              <p className="text-3xl font-semibold text-emerald-400">
                {creditsDisplay}
              </p>
              {isAccountRefreshing && (
                <p className="text-[11px] text-slate-500">Refreshing...</p>
              )}
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center justify-center rounded-md border border-sky-500/70 px-4 py-2 text-sm font-medium text-slate-50 transition hover:bg-sky-500 hover:text-slate-950"
            >
              {t.buyCredits}
            </Link>
          </div>
          <div className="text-xs text-slate-400 space-y-1 pt-3 border-t border-slate-800">
            <p className="font-semibold text-slate-200">{t.planUsageTitle}</p>
            <p>{t.planCreditRule}</p>
            <p>{t.planOutreachRule}</p>
            <p>
              {t.planContactRule.replace(
                "{count}",
                String(accountSnapshot.contactLimit)
              )}
            </p>
            <p>
              {t.planProjectRule.replace("{count}", projectLimit.toString())}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-inner shadow-slate-900/40">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Devices · max 2
                </p>
                <p className="text-sm text-slate-300">
                  Sign-ins are locked to two devices. Remove an old device to
                  free a slot.
                </p>
                {deviceError && (
                  <p className="text-[11px] text-amber-300">{deviceError}</p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {deviceSessions.length === 0 && (
                <p className="text-sm text-slate-400">No active devices.</p>
              )}
              {deviceSessions.map((device) => (
                <div
                  key={device.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{describeDevice(device)}</p>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={() => {
                        setRenameSessionId(device.id);
                        setRenameInput((device.deviceName || describeDevice(device)).slice(0, 60));
                      }}
                      className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-500 hover:text-sky-100"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => revokeDeviceSession(device.id)}
                      className="ml-auto rounded-md border border-rose-500/60 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500 hover:text-slate-950"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">
                {t.header}
              </h1>
              <p className="text-sm text-slate-400 max-w-2xl">{t.subheader}</p>
            </div>
            {projects.length < projectLimit && (
              <button
                onClick={() => {
                  setProjectInput("");
                  setProjectDescriptionInput("");
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 disabled:cursor-not-allowed"
              >
                <span aria-hidden>＋</span>
                {t.newProject}
              </button>
            )}
          </div>

          {errorMessage && (
            <p className="text-sm text-rose-400" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading projects...</p>
            ) : projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
                {t.emptyCta}
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-lg shadow-black/20"
                >
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        {t.createdLabel}:{" "}
                        {formatDate(project.createdAt, language)}
                      </p>
                      <h3 className="text-base font-semibold text-slate-50">
                        {project.name}
                      </h3>
                      <p className="text-sm text-slate-300">
                        {project.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/workspace?projectId=${project.slug}`}
                      className="flex-1 inline-flex items-center justify-center rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-medium px-4 py-2 transition-colors"
                    >
                      {t.open}
                    </Link>
                    <button
                      onClick={() => removeProject(project.slug)}
                      disabled={deletingSlug === project.slug}
                      className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:border-rose-500 hover:text-rose-300 transition-colors disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                    >
                      {deletingSlug === project.slug
                        ? language === "en"
                          ? "Removing..."
                          : "Brišem..."
                        : language === "en"
                        ? "Remove"
                        : "Obriši"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-50">
              {t.modalTitle}
            </h2>
            <input
              value={projectInput}
              onChange={(event) => setProjectInput(event.target.value)}
              onKeyDown={handleProjectInputKey}
              placeholder={t.modalPlaceholder}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                {t.modalDescriptionLabel}
              </label>
              <textarea
                value={projectDescriptionInput}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setProjectDescriptionInput(
                    event.target.value.slice(0, PROJECT_DESCRIPTION_LIMIT)
                  )
                }
                placeholder={t.modalDescriptionPlaceholder}
                rows={4}
                maxLength={PROJECT_DESCRIPTION_LIMIT}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                <p>{t.modalDescriptionHint}</p>
                <p className="text-right">
                  {projectDescriptionInput.length}/{PROJECT_DESCRIPTION_LIMIT}
                </p>
              </div>
            </div>
            {projects.length >= projectLimit && (
              <p className="text-xs text-rose-400">
                {t.limitReached.replace("{count}", projectLimit.toString())}
              </p>
            )}
            {formError && (
              <p className="text-xs text-rose-300" role="alert">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-sm text-slate-500 hover:text-sky-600 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleProjectSave}
                className="rounded-md bg-sky-500 hover:bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
                disabled={
                  !projectInput.trim() ||
                  !projectDescriptionInput.trim() ||
                  projects.length >= projectLimit ||
                  isSaving
                }
              >
                {isSaving
                  ? language === "en"
                    ? "Saving..."
                    : "Čuvam..."
                  : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {renameSessionId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-50">
                Rename device
              </h2>
              <button
                onClick={() => {
                  setRenameSessionId(null);
                  setRenameInput("");
                }}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-slate-400">
              Set a friendly name to recognize this device when you sign in.
            </p>
            <input
              value={renameInput}
              onChange={(event) => setRenameInput(event.target.value.slice(0, 60))}
              placeholder="e.g. MacBook Pro, Pixel 8, Work laptop"
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              maxLength={60}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRenameSessionId(null);
                  setRenameInput("");
                }}
                className="text-sm text-slate-500 hover:text-sky-400 transition-colors"
                disabled={renameSaving}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!renameSessionId) return;
                  const trimmed = renameInput.trim();
                  if (!trimmed) {
                    setDeviceError("Device name cannot be empty.");
                    return;
                  }
                  setRenameSaving(true);
                  try {
                    await renameDeviceSession(renameSessionId, trimmed);
                    setRenameSessionId(null);
                    setRenameInput("");
                  } catch {
                    // error already set via renameDeviceSession
                  } finally {
                    setRenameSaving(false);
                  }
                }}
                className="rounded-md bg-sky-500 hover:bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
                disabled={renameSaving || !renameInput.trim()}
              >
                {renameSaving ? "Saving..." : "Save"}
              </button>
            </div>
            {deviceError && (
              <p className="text-xs text-rose-300" role="alert">
                {deviceError}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
