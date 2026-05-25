// Lightweight cinematic sound effects via Web Audio API
// No external assets needed.

let ctx: AudioContext | null = null;
let enabled = true;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

export function setSoundEnabled(v: boolean) { enabled = v; if (typeof window !== "undefined") localStorage.setItem("sanadak_sound", v ? "1" : "0"); }
export function isSoundEnabled() {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem("sanadak_sound");
  if (v === "0") enabled = false;
  return enabled;
}

function tone({ freq = 440, dur = 0.12, type = "sine" as OscillatorType, gain = 0.06, freqEnd, delay = 0 }: { freq?: number; dur?: number; type?: OscillatorType; gain?: number; freqEnd?: number; delay?: number }) {
  if (!isSoundEnabled()) return;
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export const sfx = {
  tap: () => tone({ freq: 880, freqEnd: 1320, dur: 0.08, type: "sine", gain: 0.04 }),
  add: () => { tone({ freq: 660, freqEnd: 990, dur: 0.1, gain: 0.05 }); tone({ freq: 990, freqEnd: 1320, dur: 0.12, gain: 0.04, delay: 0.08 }); },
  success: () => { tone({ freq: 523, dur: 0.12, type: "triangle", gain: 0.06 }); tone({ freq: 784, dur: 0.14, type: "triangle", gain: 0.06, delay: 0.1 }); tone({ freq: 1046, dur: 0.2, type: "triangle", gain: 0.05, delay: 0.22 }); },
  whoosh: () => { tone({ freq: 220, freqEnd: 80, dur: 0.35, type: "sawtooth", gain: 0.025 }); },
  open: () => { tone({ freq: 400, freqEnd: 900, dur: 0.18, type: "sine", gain: 0.04 }); },
  error: () => { tone({ freq: 220, dur: 0.18, type: "square", gain: 0.04 }); },
};
