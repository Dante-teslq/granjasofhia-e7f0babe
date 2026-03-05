import { useState, useEffect, useCallback } from "react";
import { X, Download, Share2, Monitor, Smartphone, Globe, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-unified-dismissed";
const INSTALLED_KEY = "pwa-installed";
const VISITS_KEY = "pwa-unified-visits";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;

type BannerType = "android" | "ios" | "desktop" | "firefox-desktop" | "firefox-mobile" | null;

function detectBannerType(): BannerType {
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

function isDismissed(): boolean {
  if (localStorage.getItem(INSTALLED_KEY)) return true;
  const val = localStorage.getItem(DISMISS_KEY);
  if (!val) return false;
  return Date.now() - parseInt(val, 10) < DISMISS_DURATION;
}

function setDismissed() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [bannerType, setBannerType] = useState<BannerType>(null);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isDismissed()) return;

    const visits = parseInt(localStorage.getItem(VISITS_KEY) || "0", 10) + 1;
    localStorage.setItem(VISITS_KEY, String(visits));
    if (visits < 2) return;

    const type = detectBannerType();
    if (!type) return;
    setBannerType(type);

    if (type === "ios" || type === "firefox-desktop" || type === "firefox-mobile") {
      setTimeout(() => { setVisible(true); setAnimating(true); }, 500);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => { setVisible(true); setAnimating(true); }, 500);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const fallback = setTimeout(() => {
      if (type === "desktop" || type === "android") {
        setVisible(true);
        setAnimating(true);
      }
    }, 3000);

    const installedHandler = () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setVisible(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      clearTimeout(fallback);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "1");
    }
    dismiss();
  }, [deferredPrompt]);

  const dismiss = () => {
    setAnimating(false);
    setTimeout(() => { setVisible(false); setDismissed(); }, 300);
  };

  if (!visible) return null;

  const isBottom = bannerType === "android" || bannerType === "ios" || bannerType === "firefox-mobile";
  const isDesktopFloat = bannerType === "desktop" || bannerType === "firefox-desktop";

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 9999,
        fontFamily: "'Inter', system-ui, sans-serif",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: animating ? 1 : 0,
        transform: animating
          ? "translateY(0)"
          : isBottom ? "translateY(20px)" : "translateY(20px)",
        ...(isBottom
          ? { bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))", left: "1rem", right: "1rem", maxWidth: 400, margin: "0 auto" }
          : { bottom: "1.5rem", right: "1.5rem", width: 320 }),
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.6)",
          borderRadius: 16,
          padding: "1rem 1.125rem",
          boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <img
            src="/icons/icon-192x192.png"
            alt="Granja Sofhia"
            style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1a1a1a" }}>Granja Sofhia</div>
            <div style={{ fontSize: "0.75rem", color: "#888" }}>Sistema de gestão</div>
          </div>
          <button
            onClick={dismiss}
            style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: 4, borderRadius: 8, display: "flex", minHeight: 32, minWidth: 32, alignItems: "center", justifyContent: "center" }}
            aria-label="Fechar"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Body — platform specific */}
        {bannerType === "android" && (
          <>
            <p style={{ margin: "0 0 12px", fontSize: "0.8125rem", color: "#555", lineHeight: 1.5 }}>
              Acesse mais rápido direto da sua tela inicial.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {deferredPrompt ? (
                <button onClick={handleInstall} style={primaryBtn}>
                  <Download style={{ width: 14, height: 14 }} /> Instalar
                </button>
              ) : (
                <span style={{ fontSize: "0.75rem", color: "#888" }}>Use o menu do navegador para instalar.</span>
              )}
              <button onClick={dismiss} style={ghostBtn}>Agora não</button>
            </div>
          </>
        )}

        {bannerType === "ios" && (
          <>
            <div style={{ margin: "0 0 12px", fontSize: "0.8125rem", color: "#555", lineHeight: 1.7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={stepBadge}>1</span>
                <span>Toque em <Share2 style={{ display: "inline", width: 14, height: 14, verticalAlign: "middle", color: "#007aff" }} /> compartilhar</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={stepBadge}>2</span>
                <span>Toque em <strong>"Adicionar à Tela de Início"</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={stepBadge}>3</span>
                <span>Toque em <strong>"Adicionar"</strong></span>
              </div>
            </div>
            <button onClick={dismiss} style={{ ...primaryBtn, width: "100%", justifyContent: "center" }}>
              <Check style={{ width: 14, height: 14 }} /> Entendido
            </button>
          </>
        )}

        {bannerType === "desktop" && (
          <>
            <div style={{ margin: "0 0 12px", fontSize: "0.8125rem", color: "#555", lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 8px" }}>Acesse como app nativo no seu computador:</p>
              <ul style={{ margin: 0, paddingLeft: 16, listStyle: "none" }}>
                <li style={featureItem}>✓ Sem barra do navegador</li>
                <li style={featureItem}>✓ Abre direto da área de trabalho</li>
                <li style={featureItem}>✓ Funciona offline</li>
              </ul>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {deferredPrompt ? (
                <button onClick={handleInstall} style={{ ...primaryBtn, flex: 1, justifyContent: "center" }}>
                  <Download style={{ width: 14, height: 14 }} /> Instalar agora
                </button>
              ) : (
                <span style={{ fontSize: "0.75rem", color: "#888" }}>Use o ícone na barra de endereço para instalar.</span>
              )}
            </div>
          </>
        )}

        {bannerType === "firefox-desktop" && (
          <>
            <p style={{ margin: "0 0 12px", fontSize: "0.8125rem", color: "#555", lineHeight: 1.5 }}>
              No menu <strong>☰</strong> do Firefox, clique em <strong>"Instalar este site como app"</strong>.
            </p>
            <button onClick={dismiss} style={{ ...primaryBtn, width: "100%", justifyContent: "center" }}>Entendido</button>
          </>
        )}

        {bannerType === "firefox-mobile" && (
          <>
            <p style={{ margin: "0 0 12px", fontSize: "0.8125rem", color: "#555", lineHeight: 1.5 }}>
              No menu <strong>⋮</strong> do Firefox, toque em <strong>"Adicionar à tela inicial"</strong>.
            </p>
            <button onClick={dismiss} style={{ ...primaryBtn, width: "100%", justifyContent: "center" }}>Entendido</button>
          </>
        )}
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: "hsl(43, 55%, 47%)",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: 10,
  fontSize: "0.8125rem",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  minHeight: 40,
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "#888",
  border: "1px solid #e0e0e0",
  padding: "8px 16px",
  borderRadius: 10,
  fontSize: "0.8125rem",
  cursor: "pointer",
  minHeight: 40,
};

const stepBadge: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "hsl(43, 55%, 47%)",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.6875rem",
  fontWeight: 700,
  flexShrink: 0,
};

const featureItem: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#666",
  marginBottom: 2,
};
