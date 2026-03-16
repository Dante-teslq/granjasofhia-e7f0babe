/* cache-bust v6 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startSyncListener } from "./lib/syncEngine";

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

const PREVIEW_CACHE_RESET_KEY = "__preview_sw_cache_reset_v1__";
const isPreviewHost =
  window.location.hostname.endsWith("lovableproject.com") ||
  window.location.hostname.includes("id-preview--");

async function resetPreviewServiceWorkerCache() {
  if (!isPreviewHost) return;
  if (sessionStorage.getItem(PREVIEW_CACHE_RESET_KEY) === "1") return;

  sessionStorage.setItem(PREVIEW_CACHE_RESET_KEY, "1");

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } finally {
    window.location.reload();
  }
}

resetPreviewServiceWorkerCache().then(() => {
  // Start offline sync engine
  startSyncListener();

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
