import { useEffect } from "react";
import { toast } from "sonner";

const UPDATE_CHECK_INTERVAL = 5 * 60_000; // 5 minutes — reduzido para minimizar interrupções

export function PwaUpdateNotifier() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const autoApply = (registration: ServiceWorkerRegistration) => {
      // If a waiting worker exists, activate it — but do NOT reload automatically
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      // Listen for new installs — activate but don't force reload
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    };

    // Initial setup
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) autoApply(reg);
    });

    // Periodically check for updates
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          reg.update().then(() => autoApply(reg)).catch(() => {});
        }
      });
    }, UPDATE_CHECK_INTERVAL);

    // ⚠️ REMOVED: automatic window.location.reload() on controllerchange.
    // That was causing the page to reload silently when switching browser tabs,
    // closing any open dialogs and losing in-progress user work.
    // Instead, show a non-intrusive notification so the user can choose when to refresh.
    let notified = false;
    const onControllerChange = () => {
      if (!notified) {
        notified = true;
        toast("Atualização disponível", {
          description: "Uma nova versão do sistema está pronta.",
          duration: Infinity,
          action: {
            label: "Atualizar agora",
            onClick: () => window.location.reload(),
          },
        });
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  // No UI — update notification is handled via toast
  return null;
}