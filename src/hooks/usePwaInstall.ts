import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Module-level singleton — the prompt is captured once and shared across all consumers.
// This prevents losing the event when components re-mount.
let _deferredPrompt: BeforeInstallPromptEvent | null = null;
let _installed = !!localStorage.getItem("pwa-installed");
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    _deferredPrompt = null;
    _installed = true;
    localStorage.setItem("pwa-installed", "1");
    notify();
  });
}

export type PwaInstallPlatform =
  | "android"
  | "ios"
  | "desktop"
  | "firefox-desktop"
  | "firefox-mobile"
  | null;

function detectPlatform(): PwaInstallPlatform {
  const ua = navigator.userAgent;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone;
  if (isStandalone) return null;

  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isFirefox = /firefox/i.test(ua);
  const isMobile = /mobi|android|iphone|ipad|ipod/i.test(ua);

  if (isFirefox && isMobile) return "firefox-mobile";
  if (isFirefox) return "firefox-desktop";
  if (isIos) return "ios";
  if (isAndroid || (isMobile && !isIos)) return "android";
  return "desktop";
}

interface UsePwaInstallReturn {
  /** Whether the native install prompt is available */
  canPrompt: boolean;
  /** Whether the app is already installed as standalone */
  isInstalled: boolean;
  /** The detected platform (null when running as standalone) */
  platform: PwaInstallPlatform;
  /** Trigger the native install prompt. Returns true if accepted. */
  install: () => Promise<boolean>;
}

export function usePwaInstall(): UsePwaInstallReturn {
  const [, rerender] = useState(0);

  useEffect(() => {
    const update = () => rerender((n) => n + 1);
    _listeners.add(update);
    return () => { _listeners.delete(update); };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!_deferredPrompt) return false;
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    _deferredPrompt = null;
    notify();
    return outcome === "accepted";
  };

  return {
    canPrompt: !!_deferredPrompt,
    isInstalled: _installed,
    platform: detectPlatform(),
    install,
  };
}
