import { useState, useEffect, useCallback } from "react";
import { X, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-desktop-install-dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PwaDesktopInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches;

  const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);

  useEffect(() => {
    if (isStandalone || isMobile) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - parseInt(dismissed, 10) < DISMISS_DURATION) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isStandalone, isMobile]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }, [deferredPrompt]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 9999,
        maxWidth: "340px",
        background: "hsl(0,0%,18%)",
        color: "hsl(0,0%,95%)",
        borderRadius: "0.75rem",
        padding: "0.75rem 1rem",
        boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.625rem",
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.8125rem",
        lineHeight: "1.4",
      }}
    >
      <Monitor style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2, color: "#b99936" }} />
      <div style={{ flex: 1 }}>
        <strong style={{ display: "block", marginBottom: 2 }}>Instale o app no seu computador</strong>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            onClick={handleInstall}
            style={{
              background: "#b99936",
              color: "#fff",
              border: "none",
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Instalar
          </button>
          <button
            onClick={dismiss}
            style={{
              background: "transparent",
              color: "hsl(0,0%,60%)",
              border: "1px solid hsl(0,0%,30%)",
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            Agora não
          </button>
        </div>
      </div>
      <button onClick={dismiss} style={{ background: "none", border: "none", color: "hsl(0,0%,60%)", cursor: "pointer", padding: 2, flexShrink: 0 }}>
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}
