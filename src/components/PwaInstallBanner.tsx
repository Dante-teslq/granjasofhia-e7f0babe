import { useState, useEffect, useCallback } from "react";
import { X, Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "pwa-install-visits";
const DISMISSED_KEY = "pwa-install-dismissed";

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [visible, setVisible] = useState(false);

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;

  useEffect(() => {
    if (isStandalone) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    const visits = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10) + 1;
    localStorage.setItem(STORAGE_KEY, String(visits));
    if (visits < 2) return;

    if (isIos) {
      setShowIosBanner(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isIos, isStandalone]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }, [deferredPrompt]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "calc(100% - 2rem)",
        maxWidth: "400px",
        background: "hsl(0,0%,18%)",
        color: "hsl(0,0%,95%)",
        borderRadius: "0.75rem",
        padding: "0.875rem 1rem",
        boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.8125rem",
        lineHeight: "1.4",
      }}
    >
      <img src="/logo.jpg" alt="" style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        {showIosBanner ? (
          <>
            <strong style={{ display: "block", marginBottom: 4 }}>Instalar Granja Sofhia</strong>
            <span style={{ color: "hsl(0,0%,70%)" }}>
              Toque em <Share style={{ display: "inline", width: 14, height: 14, verticalAlign: "middle" }} /> compartilhar e depois em <strong>Adicionar à Tela de Início</strong>
            </span>
          </>
        ) : (
          <>
            <strong style={{ display: "block", marginBottom: 4 }}>Instalar Granja Sofhia</strong>
            <span style={{ color: "hsl(0,0%,70%)" }}>Acesse mais rápido direto da sua tela inicial.</span>
          </>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {!showIosBanner && (
            <button
              onClick={handleInstall}
              style={{
                background: "#b99936",
                color: "#fff",
                border: "none",
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Download style={{ width: 14, height: 14 }} /> Instalar
            </button>
          )}
          <button
            onClick={dismiss}
            style={{
              background: "transparent",
              color: "hsl(0,0%,60%)",
              border: "1px solid hsl(0,0%,30%)",
              padding: "6px 14px",
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
        <X style={{ width: 16, height: 16 }} />
      </button>
    </div>
  );
}
