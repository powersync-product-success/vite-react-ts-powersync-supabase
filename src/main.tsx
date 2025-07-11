import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import SystemProvider from "./powersync/SystemProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SystemProvider>
      <App />
    </SystemProvider>
  </StrictMode>
);
