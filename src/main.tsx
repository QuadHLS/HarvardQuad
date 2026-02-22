import React, { useState, useEffect, Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { TermsPage } from "./components/TermsPage";
import { PrivacyPage } from "./components/PrivacyPage";
import { Toaster } from "./components/ui/sonner";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App error:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 600 }}>
          <h1 style={{ color: "#d47455" }}>Something went wrong</h1>
          <pre style={{ overflow: "auto", background: "#f5f5f5", padding: 12, borderRadius: 8 }}>
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  <ErrorBoundary>
    <AuthProvider>
      <Root />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  </ErrorBoundary>
);
  