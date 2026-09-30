import type { ReelSkin } from "@/lib/engine/types";

let ctx: AudioContext | null = null;
let bed: number | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

function burst(freq: number, dur: number, type: OscillatorType, gain: number, slide?: number, delay = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(40, freq), t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.03, dur * 0.25));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

function noise(dur: number, gain: number, freq: number, q: number, delay = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

function stopBed() {
  if (bed != null) {
    window.clearInterval(bed);
    bed = null;
  }
}

function startBed(every: number, tick: (n: number) => void) {
  stopBed();
  let n = 0;
  bed = window.setInterval(() => {
    n += 1;
    tick(n);
  }, every);
}

type Voice = {
  spin: () => void;
  tick: () => void;
  win: () => void;
  big: () => void;
};

const voices: Record<ReelSkin, Voice> = {
  clockwork: {
    spin: () =>
      startBed(90, (n) => {
        noise(0.03, 0.05, 1800 + (n % 4) * 200, 4);
        if (n % 4 === 0) burst(180, 0.05, "triangle", 0.03);
      }),
    tick: () => {
      noise(0.04, 0.08, 2400, 6);
      burst(880, 0.08, "square", 0.02, 220);
    },
    win: () => {
      [659, 784, 988, 1318].forEach((f, i) => burst(f, 0.22, "sine", 0.05, undefined, i * 0.09));
    },
    big: () => {
      burst(220, 0.4, "triangle", 0.06);
      [523, 659, 784, 1046, 1318].forEach((f, i) => burst(f, 0.28, "sine", 0.05, undefined, 0.08 + i * 0.1));
    },
  },
  orbit: {
    spin: () =>
      startBed(140, (n) => {
        burst(240 + n * 18, 0.12, "sine", 0.035, 520 + n * 10);
        noise(0.1, 0.03, 900, 0.6);
      }),
    tick: () => burst(740, 0.12, "sine", 0.05, 280),
    win: () => {
      [523, 659, 784, 1046].forEach((f, i) => burst(f, 0.18, "sine", 0.045, f * 1.02, i * 0.07));
    },
    big: () => {
      burst(180, 0.5, "sine", 0.05, 720);
      [392, 494, 587, 784].forEach((f, i) => burst(f, 0.3, "triangle", 0.05, undefined, i * 0.12));
    },
  },
  temple: {
    spin: () =>
      startBed(180, () => {
        burst(78, 0.16, "sine", 0.07);
        noise(0.08, 0.06, 240, 1.2);
      }),
    tick: () => noise(0.06, 0.09, 700, 2.4),
    win: () => {
      [392, 440, 523, 659].forEach((f, i) => burst(f, 0.2, "triangle", 0.05, undefined, i * 0.11));
    },
    big: () => {
      burst(98, 0.55, "sine", 0.08);
      noise(0.3, 0.05, 180, 0.8);
      [330, 392, 494, 587].forEach((f, i) => burst(f, 0.26, "triangle", 0.05, undefined, 0.12 + i * 0.12));
    },
  },
  ice: {
    spin: () =>
      startBed(120, (n) => {
        burst(1400 + (n % 5) * 80, 0.09, "sine", 0.03, 2200);
        noise(0.08, 0.025, 3200, 3);
      }),
    tick: () => burst(1860, 0.1, "sine", 0.04, 2400),
    win: () => {
      [1046, 1318, 1568, 2093].forEach((f, i) => burst(f, 0.16, "sine", 0.04, undefined, i * 0.06));
    },
    big: () => {
      [784, 988, 1174, 1568, 1976].forEach((f, i) => burst(f, 0.22, "triangle", 0.045, f * 1.5, i * 0.08));
    },
  },
  neon: {
    spin: () =>
      startBed(70, (n) => {
        burst(n % 2 ? 110 : 55, 0.06, "sawtooth", 0.02);
        if (n % 3 === 0) noise(0.04, 0.04, 1800, 1.5);
      }),
    tick: () => {
      noise(0.05, 0.07, 1400, 1);
      burst(196, 0.08, "square", 0.03, 90);
    },
    win: () => {
      [220, 277, 330, 440, 554].forEach((f, i) => burst(f, 0.12, "square", 0.035, undefined, i * 0.06));
    },
    big: () => {
      burst(55, 0.35, "sawtooth", 0.04);
      [220, 330, 440, 660, 880].forEach((f, i) => burst(f, 0.14, "square", 0.04, undefined, i * 0.07));
    },
  },
  arcane: {
    spin: () =>
      startBed(220, () => {
        burst(196, 0.28, "sine", 0.03);
        burst(233, 0.28, "sine", 0.02);
      }),
    tick: () => burst(660, 0.18, "sine", 0.045, 330),
    win: () => {
      [523, 622, 784, 932].forEach((f, i) => burst(f, 0.26, "sine", 0.045, undefined, i * 0.1));
    },
    big: () => {
      burst(146, 0.6, "sine", 0.05);
      [415, 523, 622, 830].forEach((f, i) => burst(f, 0.32, "triangle", 0.045, undefined, i * 0.12));
    },
  },
  mythic: {
    spin: () =>
      startBed(160, () => {
        burst(52, 0.18, "sawtooth", 0.03);
        noise(0.12, 0.04, 140, 0.7);
      }),
    tick: () => burst(146, 0.14, "sawtooth", 0.04, 90),
    win: () => {
      [146, 196, 247, 294].forEach((f, i) => burst(f, 0.24, "triangle", 0.055, undefined, i * 0.1));
    },
    big: () => {
      burst(73, 0.5, "sawtooth", 0.05);
      [110, 146, 220, 293, 440].forEach((f, i) => burst(f, 0.28, "triangle", 0.05, undefined, i * 0.11));
    },
  },
  clover: {
    spin: () =>
      startBed(125, (n) => {
        const notes = [392, 440, 494, 523];
        burst(notes[n % notes.length]!, 0.1, "triangle", 0.04);
      }),
    tick: () => {
      noise(0.04, 0.05, 500, 1.5);
      burst(660, 0.08, "triangle", 0.04);
    },
    win: () => {
      [523, 587, 659, 784].forEach((f, i) => burst(f, 0.16, "triangle", 0.05, undefined, i * 0.08));
    },
    big: () => {
      [392, 523, 659, 784, 1046].forEach((f, i) => burst(f, 0.2, "triangle", 0.05, undefined, i * 0.09));
    },
  },
};

let wheelTimers: number[] = [];

function clearWheel() {
  wheelTimers.forEach((id) => window.clearTimeout(id));
  wheelTimers = [];
}

export const sfx = {
  click: () => burst(520, 0.04, "triangle", 0.03),
  spin: (skin: ReelSkin = "clockwork") => {
    stopBed();
    voices[skin].spin();
  },
  stop: () => stopBed(),
  reelStop: (skin: ReelSkin = "clockwork") => voices[skin].tick(),
  win: (skin: ReelSkin = "clockwork") => {
    stopBed();
    voices[skin].win();
  },
  big: (skin: ReelSkin = "clockwork") => {
    stopBed();
    voices[skin].big();
  },
  wheel: () => {
    clearWheel();
    stopBed();
    for (let i = 0; i < 22; i++) {
      const id = window.setTimeout(() => noise(0.025, 0.06, 900 + i * 30, 5), i * (40 + i * 6));
      wheelTimers.push(id);
    }
  },
  wheelWin: () => {
    clearWheel();
    [523, 659, 784, 1046].forEach((f, i) => burst(f, 0.28, "triangle", 0.05, undefined, i * 0.05));
  },
};
