import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { TermsPage } from "./components/TermsPage";
import { PrivacyPage } from "./components/PrivacyPage";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";

function Root() {
  const [pathname, setPathname] = useState(
    () => (typeof window !== "undefined" ? window.location.pathname : "/")
  );
  useEffect(() => {
    const handler = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  if (pathname === "/terms") return <TermsPage />;
  if (pathname === "/privacy") return <PrivacyPage />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <Root />
  </AuthProvider>
);
  