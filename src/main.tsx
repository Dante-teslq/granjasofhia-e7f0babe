import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startSyncListener } from "./lib/syncEngine";

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

startSyncListener();

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
