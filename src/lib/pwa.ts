/**
 * PWA Installation Helper
 * Captures beforeinstallprompt and manages standalone PWA status
 */

let deferredPrompt: any = null;
const listeners = new Set<(canInstall: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn(false));
  });
}

export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  listeners.forEach((fn) => fn(false));
  return outcome === 'accepted';
}

export function subscribeToInstallPrompt(callback: (canInstall: boolean) => void): () => void {
  listeners.add(callback);
  callback(deferredPrompt !== null);
  return () => {
    listeners.delete(callback);
  };
}
