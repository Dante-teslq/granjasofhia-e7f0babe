import { useEffect } from "react";

const UPDATE_CHECK_INTERVAL = 30_000; // 30 seconds

export function PwaUpdateNotifier() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const autoApply = (registration: ServiceWorkerRegistration) => {
      // If a waiting worker exists, activate it immediately
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      // Listen for new installs and auto-activate
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

    // Auto-reload when new SW takes control
    let refreshing = false;
    const onControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  // No UI — updates are fully automatic
  return null;
}