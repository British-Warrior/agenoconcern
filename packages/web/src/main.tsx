import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App.js";
import { AnnounceProvider } from "./components/a11y/AnnounceProvider.js";
import "./styles/app.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const root = document.getElementById("root")!;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AnnounceProvider>
        <App />
      </AnnounceProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);

// Register service worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});
