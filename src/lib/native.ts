// Everything that differs between the website and the app (Capacitor: iOS and Android): opening links, coming back from the background, the status bar and the splash screen.
// Each function does the web thing in a browser and the native thing in the app.

import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNative = (): boolean => Capacitor.isNativePlatform();
export const platform = (): 'ios' | 'android' | 'web' => Capacitor.getPlatform() as 'ios' | 'android' | 'web';

/**
 * Can septims be bought here? On the website, yes (Stripe); in the iPhone app, with the App Store's In-App Purchase (see lib/iap.ts). The Android app does not offer it yet
 * (septims bought elsewhere still work there after signing in).
 */
export const purchasesAvailable = (): boolean => !isNative() || platform() === 'ios';

/** The custom address the sign-in email's link opens the app with. It is in the project's allowed redirect URLs, and registered by the iOS and Android projects. */
export const APP_SCHEME = 'com.eldermaps.app';
export const NATIVE_AUTH_REDIRECT = `${APP_SCHEME}://auth`;

/** Sends the whole window to a link (a checkout, for instance): a browser sheet in the app, since leaving would lose the app. */
export async function goTo(url: string): Promise<void> {
  if (isNative()) await Browser.open({ url });
  else window.location.href = url;
}

/** Opens a link in the browser (a sheet over the app, on a phone). */
export async function openExternal(url: string): Promise<void> {
  if (isNative()) await Browser.open({ url });
  else window.open(url, '_blank', 'noopener');
}

/** Calls back when the app returns to the front. Returns the way to stop listening. */
export function onResume(callback: () => void): () => void {
  if (isNative()) {
    const handle = App.addListener('appStateChange', (state) => { if (state.isActive) callback(); });
    return () => { void handle.then((h) => h.remove()); };
  }
  const visible = () => { if (!document.hidden) callback(); };
  document.addEventListener('visibilitychange', visible);
  return () => document.removeEventListener('visibilitychange', visible);
}

/** A link that opened the app (the sign-in email). Returns the way to stop listening. */
export function onAppUrl(callback: (url: string) => void): () => void {
  if (!isNative()) return () => {};
  const handle = App.addListener('appUrlOpen', (event) => callback(event.url));
  return () => { void handle.then((h) => h.remove()); };
}

/**
 * The app is never zoomed. A pinch, a double tap, or tapping a text box (iOS zooms into any box with small text) used to zoom the web view in and leave the page shifted off centre,
 * with the top of the app up under the status bar. In the app (not on the website, where people may want to zoom) zooming is switched off, and a page found shifted sideways is put back.
 */
function keepUnzoomed(): void {
  try {
    document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    document.documentElement.style.touchAction = 'manipulation';
    const settle = () => { if (window.scrollX !== 0) window.scrollTo(0, window.scrollY); };
    window.visualViewport?.addEventListener('resize', settle);
    window.visualViewport?.addEventListener('scroll', settle);
    document.addEventListener('focusout', () => { window.setTimeout(settle, 250); });
  } catch { /* an older web view: nothing to change */ }
}

/** The app's first moments: a dark status bar that matches the map, and the splash screen goes away once the page is up. */
export async function startNative(): Promise<void> {
  if (!isNative()) return;
  keepUnzoomed();
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform() === 'android') await StatusBar.setBackgroundColor({ color: '#0b0d10' });
  } catch { /* a status bar this device cannot change */ }
  try { await SplashScreen.hide({ fadeOutDuration: 250 }); } catch { /* already hidden */ }
}
