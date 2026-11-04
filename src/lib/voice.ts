// The road's voice: low, slow and English, as close to a Nord as a browser's own speech gets. (No browser ships a Nordic voice; a British male voice, pitched
// down and slowed, is the nearest. A cloud voice can replace this one later without changing the callers.)

const KEY = 'eldermaps:voice';

export const voiceAvailable = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function voiceEnabled(): boolean {
  if (!voiceAvailable()) return false;
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

export function setVoiceEnabled(on: boolean): void {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* fine */ }
  if (!on) stopSpeaking();
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  const deep = (v: SpeechSynthesisVoice) => /daniel|ryan|george|arthur|oliver|thomas|google uk english male|male/i.test(v.name);
  return voices.find((v) => /en-GB/i.test(v.lang) && deep(v)) ?? voices.find((v) => /en-(IE|GB)/i.test(v.lang)) ?? voices.find(deep) ?? voices[0];
}

export function stopSpeaking(): void {
  if (voiceAvailable()) window.speechSynthesis.cancel();
}

export function speak(text: string): void {
  if (!voiceEnabled() || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.pitch = 0.72;
  u.rate = 0.9;
  const voice = pickVoice();
  if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-GB';
  synth.speak(u);
}

/** The road's instruction, said the way a Nord guide would say it. */
export function nordify(text: string): string {
  return text
    .replace(/^Head out/i, 'Take to the road')
    .replace(/^Arrive at your destination/i, 'You have arrived. Your journey ends here, traveller')
    .replace(/\bTurn left\b/i, 'Turn left, Dragonborn')
    .replace(/\bTurn right\b/i, 'Turn right, traveller')
    .replace(/Make a U-turn/i, 'Turn about, you have lost the path')
    .replace(/\bMerge\b/i, 'Join the high road')
    .replace(/roundabout/i, 'great stone circle');
}

export function spokenDistance(meters: number): string {
  if (meters < 250) return `${Math.max(50, Math.round((meters * 3.281) / 50) * 50)} feet`;
  const mi = meters / 1609.34;
  if (mi < 0.2) return '1000 feet';
  const n = mi < 10 ? Math.round(mi * 10) / 10 : Math.round(mi);
  return `${n} ${n === 1 ? 'mile' : 'miles'}`;
}
