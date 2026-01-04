"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Language = "en" | "sr";
type Theme = "dark" | "light";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const copy: Record<Language, Record<string, string>> = {
  en: {
    title: "Install OmniFAIND on your phone",
    subtitle: "Scan the code or tap Add to Home Screen to install the app on your phone.",
    buttonPrompt: "Add to Home Screen",
    buttonOpen: "Install app on your phone",
    statusReady: "",
    statusInstalled: "App added. Check your home screen.",
    statusUnavailable: "Install prompt not available yet. Open the site in your browser to trigger it.",
    iosNote: "On iOS, open the site, tap Share > Add to Home Screen.",
    qrLabel: "Scan to open app on your phone",
  },
  sr: {
    title: "Instaliraj OmniFAIND na telefonu",
    subtitle: "Skeniraj kod ili klikni Add to Home Screen da instaliras aplikaciju na telefon.",
    buttonPrompt: "Add to Home Screen",
    buttonOpen: "Otvori sajt za instalaciju",
    statusReady: "",
    statusInstalled: "Aplikacija je dodata. Pogledaj home screen.",
    statusUnavailable: "Instalacioni dijalog jos nije dostupan. Otvori sajt u pregledacu da ga aktiviras.",
    iosNote: "Na iOS-u otvori sajt, Share > Add to Home Screen.",
    qrLabel: "Skeniraj da otvoris app na telefonu",
  },
};

const resolveBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (typeof window === "undefined") {
    return envUrl || "https://omnifaind.com";
  }
  if (window.location.origin) return window.location.origin;
  return envUrl || "https://omnifaind.com";
};

export function PwaInstallCard({
  language = "en",
  theme = "dark",
}: {
  language: Language;
  theme?: Theme;
}) {
  const t = copy[language];
  const isLight = theme === "light";
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "installed">("idle");
  const [installing, setInstalling] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState(() => `${resolveBaseUrl()}/`);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(display-mode: standalone)");
    const checkMode = () => {
      const isStandaloneMode =
        media.matches || (typeof navigator !== "undefined" && (navigator as unknown as { standalone?: boolean }).standalone);
      setIsStandalone(Boolean(isStandaloneMode));
    };
    checkMode();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", checkMode);
      return () => media.removeEventListener("change", checkMode);
    }
    // Fallback for older browsers
    // eslint-disable-next-line deprecation/deprecation
    media.addListener(checkMode);
    return () => {
      // eslint-disable-next-line deprecation/deprecation
      media.removeListener(checkMode);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    const nextUrl = `${resolveBaseUrl()}/`;
    setTargetUrl(nextUrl);
    QRCode.toDataURL(nextUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: isLight ? "#0f172a" : "#0ea5e9",
        light: isLight ? "#f8fafc" : "#0b1224",
      },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [isLight]);

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setStatus("ready");
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setStatus("installed");
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setInstalling(true);
    try {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setStatus(choice?.outcome === "accepted" ? "installed" : "idle");
    } finally {
      setInstalling(false);
      setInstallPrompt(null);
    }
  };

  const statusText =
    status === "installed"
      ? t.statusInstalled
      : status === "ready"
      ? t.statusReady
      : t.statusUnavailable;

  const containerClasses = isLight
    ? "rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-5 shadow-[0_15px_40px_rgba(14,165,233,0.08)]"
    : "rounded-2xl border border-sky-900/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 shadow-[0_15px_40px_rgba(14,165,233,0.12)]";

  const qrBoxClasses = isLight
    ? "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
    : "flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3";

  const textPrimary = isLight ? "text-slate-900" : "text-slate-50";
  const textSecondary = isLight ? "text-slate-600" : "text-slate-200";
  const textTertiary = isLight ? "text-slate-500" : "text-slate-400";

  if (isStandalone) return null;

  return (
    <section className={containerClasses}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-500">
            {t.title}
          </p>
          <p className={`text-sm ${textSecondary}`}>{t.subtitle}</p>
          {statusText && <p className={`text-xs ${textTertiary}`}>{statusText}</p>}
          {isIos && <p className="text-xs text-amber-500">{t.iosNote}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 disabled:opacity-70"
              disabled={installing}
            >
              {installPrompt ? t.buttonPrompt : t.buttonOpen}
            </button>
          </div>
        </div>
        <div className={qrBoxClasses}>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR code to open OmniFAIND"
              className="h-32 w-32 rounded-lg border border-slate-200 bg-white p-2 shadow-inner"
            />
          ) : (
            <div className="h-32 w-32 rounded-lg border border-dashed border-slate-300 bg-slate-100" />
          )}
          <div className={`space-y-1 text-sm ${textPrimary}`}>
            <p className="font-semibold text-sky-600">{t.qrLabel}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
