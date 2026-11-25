// The buzz of the phone when a blow lands or is taken: a switch the person can turn off. In the apps it is the phone's own haptics; on the web, a short vibration where the browser allows it.

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNative } from './native';

const KEY = 'eldermaps:haptics';

export const hapticsAvailable = (): boolean => isNative() || (typeof navigator !== 'undefined' && 'vibrate' in navigator);
export function hapticsEnabled(): boolean {
  if (!hapticsAvailable()) return false;
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}
export function setHapticsEnabled(on: boolean): void {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* fine */ }
}

/** A short buzz: light when you strike, heavier when you are struck. */
export function buzz(kind: 'hit' | 'hurt'): void {
  if (!hapticsEnabled()) return;
  if (isNative()) void Haptics.impact({ style: kind === 'hurt' ? ImpactStyle.Heavy : ImpactStyle.Light }).catch(() => undefined);
  else navigator.vibrate?.(kind === 'hurt' ? 60 : 20);
}
