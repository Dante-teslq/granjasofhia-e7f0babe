import { useState, useEffect } from "react";
import { X, Download, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function wasDismissed(): boolean {
  const val = localStorage.getItem(DISMISS_KEY);
  if (!val) return false;
  return Date.now() - parseInt(val, 10) < DISMISS_DURATION;
}

interface Props {
  /** Force the banner open regardless of dismiss state (used by the sidebar button). */
  forceOpen?: boolean;
  onClose?: () => void;
}

export function PWAInstallBanner({ forceOpen = false, onClose }: Props = {}) {
  const { platform, canPrompt, isInstalled, install } = usePwaInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setVisible(true);
      return;
    }
    if (isInstalled || !platform || wasDismissed()) return;
    // Small delay so it doesn't flash on initial render
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, [forceOpen, isInstalled, platform]);

  const dismiss = () => {
    setVisible(false);
    if (!forceOpen) {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    onClose?.();
  };

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) dismiss();
  };

  if (!visible || !platform) return null;

  const isMobile = platform === "android" || platform === "ios" || platform === "firefox-mobile";

  return (
    <div
      className={cn(
        "fixed z-50 animate-in fade-in slide-in-from-bottom-4 duration-300",
        isMobile
          ? "bottom-4 left-4 right-4 mx-auto max-w-sm"
          : "bottom-6 right-6 w-80",
      )}
    >
      <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <img
            src="/icons/icon-192x192.png"
            alt="Granja Sofhia"
            className="w-10 h-10 rounded-full ring-2 ring-primary/20 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-none">Granja Sofhia</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sistema de gestão</p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Fechar"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {(platform === "android" || platform === "desktop") && (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {platform === "desktop"
                  ? "Instale como app nativo — sem barra do navegador, abre direto da área de trabalho."
                  : "Instale o app e acesse mais rápido direto da sua tela inicial."}
              </p>
              <div className="flex gap-2">
                {canPrompt ? (
                  <>
                    <Button size="sm" onClick={handleInstall} className="gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Instalar
                    </Button>
                    <Button size="sm" variant="outline" onClick={dismiss}>
                      Agora não
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {platform === "desktop"
                      ? "Use o ícone na barra de endereço do Chrome para instalar."
                      : "Use o menu do navegador para instalar."}
                  </p>
                )}
              </div>
            </>
          )}

          {platform === "ios" && (
            <>
              <p className="text-sm font-medium text-foreground">Adicionar à Tela de Início</p>
              <ol className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <StepBadge>1</StepBadge>
                  Toque em{" "}
                  <Share2 className="inline w-3.5 h-3.5 text-blue-500 shrink-0" />{" "}
                  compartilhar
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <StepBadge>2</StepBadge>
                  Toque em{" "}
                  <strong className="text-foreground">"Adicionar à Tela de Início"</strong>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <StepBadge>3</StepBadge>
                  Toque em <strong className="text-foreground">"Adicionar"</strong>
                </li>
              </ol>
              <Button size="sm" className="w-full gap-1.5" onClick={dismiss}>
                <Check className="w-3.5 h-3.5" /> Entendido
              </Button>
            </>
          )}

          {(platform === "firefox-desktop" || platform === "firefox-mobile") && (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {platform === "firefox-desktop" ? (
                  <>No menu <strong className="text-foreground">☰</strong> do Firefox, clique em{" "}
                  <strong className="text-foreground">"Instalar este site como app"</strong>.</>
                ) : (
                  <>No menu <strong className="text-foreground">⋮</strong> do Firefox, toque em{" "}
                  <strong className="text-foreground">"Adicionar à tela inicial"</strong>.</>
                )}
              </p>
              <Button size="sm" className="w-full" onClick={dismiss}>
                Entendido
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
      {children}
    </span>
  );
}
