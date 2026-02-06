/**
 * In-app browser for native (Capacitor) only.
 * Keeps OAuth (e.g. Google login) inside the app instead of opening Safari.
 */

export async function openInAppBrowser(url: string): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) {
      window.location.href = url;
      return;
    }
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({
      url,
      presentationStyle: 'popover',
    });
  } catch {
    window.location.href = url;
  }
}

export async function closeInAppBrowser(): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch {
    // ignore
  }
}
