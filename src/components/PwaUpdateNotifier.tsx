import { useState, useEffect } from "react";

export function PwaUpdateNotifier() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;
      const onUpdate = () => {
        setReg(registration);
        setShowUpdate(true);
      };
      if (registration.waiting) {
        onUpdate();
        return;
      }
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            onUpdate();
          }
        });
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "5rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9998,
        background: "hsl(0,0%,18%)",
        color: "hsl(0,0%,95%)",
        borderRadius: "0.75rem",
        padding: "0.75rem 1rem",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        fontSize: "0.8125rem",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        maxWidth: 360,
      }}
    >
      <span>Nova versão disponível</span>
      <button
        onClick={handleUpdate}
        style={{
          background: "#b99936",
          color: "#fff",
          border: "none",
          padding: "5px 12px",
          borderRadius: 6,
          fontSize: "0.75rem",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Atualizar
      </button>
    </div>
  );
}
