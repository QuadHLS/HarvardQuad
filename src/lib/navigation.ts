/**
 * In-app navigation without full page reload.
 * Use instead of window.location.href for routes handled by the SPA (/, /terms, /privacy, etc.).
 */
export function navigateWithoutReload(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
