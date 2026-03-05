import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      setShowReconnected(false);
    };
    const goOnline = () => {
      setOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return (
    <>
      {/* Offline top banner */}
      {offline && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10000,
            background: "hsl(0, 0%, 18%)",
            color: "hsl(0, 0%, 90%)",
            textAlign: "center",
            padding: "8px 16px",
            paddingTop: "calc(8px + env(safe-area-inset-top, 0px))",
            fontSize: "0.75rem",
            fontFamily: "'Inter', system-ui, sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backdropFilter: "blur(10px)",
          }}
        >
          <WifiOff style={{ width: 14, height: 14, opacity: 0.8 }} />
          <span>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "hsl(0, 65%, 51%)", marginRight: 6, animation: "pulse 2s infinite" }} />
            Sem conexão — exibindo dados em cache
          </span>
        </div>
      )}

      {/* Reconnected toast */}
      {showReconnected && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 10000,
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(0,0,0,0.06)",
            color: "hsl(142, 40%, 35%)",
            padding: "10px 16px",
            borderRadius: 12,
            fontSize: "0.8125rem",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            animation: "slideUp 0.3s ease-out",
          }}
        >
          <Wifi style={{ width: 14, height: 14 }} />
          Conexão restaurada
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
