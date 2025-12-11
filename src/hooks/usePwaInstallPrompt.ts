"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const DISMISSED_KEY = "duha_pwa_install_dismissed";

function getInitialDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DISMISSED_KEY) === "true";
}

export interface UsePwaInstallPromptReturn {
  /** True when install is available (browser supports PWA install and we have a deferred prompt) */
  canInstall: boolean;
  /** Trigger the native install prompt */
  promptInstall: () => Promise<void>;
  /** User has dismissed our custom banner */
  dismissed: boolean;
  /** Mark as dismissed (persists to localStorage) */
  markDismissed: () => void;
  /** App is already running in standalone mode */
  isStandalone: boolean;
  /** Basic mobile device detection */
  isMobile: boolean;
}

export function usePwaInstallPrompt(): UsePwaInstallPromptReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(getInitialDismissed);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check standalone mode
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running in standalone mode
    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const checkStandalone = () => {
      const standalone =
        standaloneMedia.matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();
    standaloneMedia.addEventListener("change", checkStandalone);

    return () => standaloneMedia.removeEventListener("change", checkStandalone);
  }, []);

  // Check mobile device
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkMobile = () => {
      // Simple check using viewport width and touch capability
      const mobileWidth = window.innerWidth < 1024;
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setIsMobile(mobileWidth && hasTouch);
    };
    checkMobile();

    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // Clear the deferred prompt after use
    setDeferredPrompt(null);

    if (outcome === "dismissed") {
      // User dismissed the native prompt, we could optionally mark as dismissed
      // but let them try again later
    }
  }, [deferredPrompt]);

  const markDismissed = useCallback(() => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, "true");
    }
  }, []);

  return {
    canInstall: deferredPrompt !== null,
    promptInstall,
    dismissed,
    markDismissed,
    isStandalone,
    isMobile,
  };
}
