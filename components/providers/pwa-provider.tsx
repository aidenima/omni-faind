"use client";

import { useEffect } from "react";

const SW_PATH = "/sw.js";

export function PwaProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!('serviceWorker' in navigator)) return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "::1";

    const isSecureContext = window.location.protocol === "https:" || isLocalhost;
    const isProd = process.env.NODE_ENV === "production";

    if (!isSecureContext || !isProd) return;

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    registerServiceWorker();
  }, []);

  return null;
}
