import { pickWeighted, secureInt } from "./rng";
import type { MachineConfig, SpinResult, WinLine } from "./types";

function weightFor(machine: MachineConfig, id: string, opts: { isFreeSpin: boolean; boostSpecial: boolean }): number {
  const def = machine.symbols.find((s) => s.id === id);
  if (!def) return 8;
  if (def.kind === "wild") return opts.isFreeSpin ? 12 : 4;
  if (def.kind === "scatter") return 5;
  if (def.kind === "special") return opts.boostSpecial ? 14 : 6;
  if (def.kind === "high") return machine.symbols.indexOf(def) < 3 ? 7 : 10;
  return 22;
}

function weightedSymbol(machine: MachineConfig, opts: { isFreeSpin?: boolean; boostSpecial?: boolean } = {}): string {
  const isFreeSpin = opts.isFreeSpin ?? false;
  const boostSpecial = opts.boostSpecial ?? false;
  return pickWeighted(
    machine.symbols.map((s) => ({
      item: s.id,
      weight: weightFor(machine, s.id, { isFreeSpin, boostSpecial }),
    })),
  );
}

function generateReels(
  machine: MachineConfig,
  opts: { isFreeSpin?: boolean; boostSpecial?: boolean } = {},
): string[][] {
  const reels: string[][] = [];
  for (let r = 0; r < 5; r++) {
    const strip: string[] = [];
    for (let i = 0; i < 24; i++) strip.push(weightedSymbol(machine, opts));
    const start = secureInt(strip.length - 3);
    reels.push(strip.slice(start, start + 3));
  }
  return reels;
}

function isWild(machine: MachineConfig, s: string) {
  return machine.wild !== "" && s === machine.wild;
}
function isScatter(machine: MachineConfig, s: string) {
  return machine.scatter !== "" && s === machine.scatter;
}
function isSpecial(machine: MachineConfig, s: string) {
  return machine.special !== "" && s === machine.special;
}

function countScatters(machine: MachineConfig, reels: string[][]): number {
  let n = 0;
  for (const reel of reels) for (const s of reel) if (isScatter(machine, s)) n++;
  return n;
}

function evaluateLines(
  machine: MachineConfig,
  reels: string[][],
  bet: number,
  opts: { isFreeSpin?: boolean; externalMult?: number } = {},
): SpinResult {
  const isFreeSpin = opts.isFreeSpin ?? false;
  const externalMult = opts.externalMult ?? 1;
  const wins: WinLine[] = [];
  let totalWin = 0;
  const lines = machine.paylines;
  const lineBet = bet / Math.max(1, lines.length);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]!;
    const symbolsOnLine = line.map((row, reel) => reels[reel]![row]!);
    let baseSymbol: string | null = null;
    let count = 0;
    let usedWild = false;
    for (const s of symbolsOnLine) {
      if (isScatter(machine, s)) break;
      const wild = isWild(machine, s);
      if (baseSymbol === null) {
        if (wild) {
          count++;
          usedWild = true;
          continue;
        }
        baseSymbol = s;
        count++;
      } else if (s === baseSymbol || wild) {
        if (wild) usedWild = true;
        count++;
      } else break;
    }
    if (baseSymbol === null && count >= 3 && machine.wild) baseSymbol = machine.wild;
    if (count >= 3 && baseSymbol && machine.paytable[baseSymbol]) {
      const pays = machine.paytable[baseSymbol];
      let payout = pays[count - 3]! * lineBet * externalMult;
      if (isFreeSpin) payout *= machine.freeSpinMultiplier;
      if (payout > 0) {
        wins.push({ lineIndex: lineIdx, symbol: baseSymbol, count, payout, usedWild });
        totalWin += payout;
      }
    }
  }

  const scatterCount = countScatters(machine, reels);
  let freeSpinsAwarded = 0;
  let triggered = false;
  if (scatterCount >= machine.scatterTrigger) {
    freeSpinsAwarded =
      machine.freeSpinsByScatter[scatterCount] ??
      machine.freeSpinsByScatter[machine.scatterTrigger] ??
      10;
    triggered = true;
  }
  const scatterPayMult = machine.scatterPays[scatterCount];
  if (scatterPayMult) {
    let scatterPay = scatterPayMult * bet * externalMult;
    if (isFreeSpin) scatterPay *= machine.freeSpinMultiplier;
    totalWin += scatterPay;
  }

  return {
    reels,
    winAmount: totalWin,
    winLines: wins,
    isBigWin: totalWin >= bet * 15,
    isMegaWin: totalWin >= bet * 50,
    scatterCount,
    freeSpinsAwarded,
    triggeredFreeSpins: triggered,
    isFreeSpin,
    triggeredHoldAndSpin: false,
    holdAndSpinCoins: 0,
    cascadeSteps: 0,
    cascadeMultiplier: 1,
    featureMessage: "",
    expandedReels: [],
    lockedCells: [],
    cascadeFrames: [],
  };
}

function cascadeReels(machine: MachineConfig, reels: string[][], wins: WinLine[]): string[][] {
  const next = reels.map((r) => [...r]);
  const winning = new Set(wins.map((w) => w.symbol));
  for (let r = 0; r < 5; r++) {
    for (let row = 0; row < 3; row++) {
      const s = next[r]![row]!;
      if (winning.has(s) || isWild(machine, s)) next[r]![row] = weightedSymbol(machine);
    }
  }
  return next;
}

function spinClassic(machine: MachineConfig, bet: number, isFreeSpin: boolean): SpinResult {
  return evaluateLines(machine, generateReels(machine, { isFreeSpin }), bet, { isFreeSpin });
}

function spinHoldAndSpin(machine: MachineConfig, bet: number, isFreeSpin: boolean): SpinResult {
  const reels = generateReels(machine, { isFreeSpin, boostSpecial: true });
  let coinCount = 0;
  for (const reel of reels) for (const s of reel) if (isSpecial(machine, s) || isWild(machine, s)) coinCount++;
  const base = evaluateLines(machine, reels, bet, { isFreeSpin });
  const triggered = coinCount >= machine.featureTriggerCount;
  let bonusWin = 0;
  let msg = "";
  if (triggered) {
    const mults = [1, 2, 3, 5, 8, 10, 15, 25];
    for (let i = 0; i < coinCount; i++) bonusWin += bet * mults[secureInt(mults.length)]! * 0.15;
    if (coinCount >= 12) {
      bonusWin += bet * 50;
      msg = `FULL GRID · ${coinCount} coins`;
    } else msg = `HOLD & SPIN · ${coinCount} coins locked`;
  }
  const lockedCells = reels.map((col) => col.map((s) => isSpecial(machine, s) || isWild(machine, s)));
  const total = base.winAmount + bonusWin;
  return {
    ...base,
    reels,
    winAmount: total,
    isBigWin: total >= bet * 15,
    isMegaWin: total >= bet * 50,
    triggeredHoldAndSpin: triggered,
    holdAndSpinCoins: coinCount,
    featureMessage: msg,
    lockedCells,
  };
}

function spinCascading(machine: MachineConfig, bet: number, isFreeSpin: boolean): SpinResult {
  let reels = generateReels(machine, { isFreeSpin });
  let totalWin = 0;
  let steps = 0;
  let mult = 1;
  const allWins: WinLine[] = [];
  const cascadeFrames: string[][][] = [reels.map((col) => [...col])];
  while (steps < 8) {
    const evald = evaluateLines(machine, reels, bet, { isFreeSpin, externalMult: mult });
    if (evald.winAmount <= 0) break;
    totalWin += evald.winAmount;
    allWins.push(...evald.winLines);
    steps++;
    mult = Math.min(machine.featureMaxMultiplier, mult + 0.5);
    reels = cascadeReels(machine, reels, evald.winLines);
    cascadeFrames.push(reels.map((col) => [...col]));
  }
  const scatterCount = countScatters(machine, reels);
  let freeSpins = 0;
  let triggeredFS = false;
  if (scatterCount >= machine.scatterTrigger) {
    freeSpins = machine.freeSpinsByScatter[scatterCount] ?? 10;
    triggeredFS = true;
  }
  return {
    reels,
    winAmount: totalWin,
    winLines: allWins,
    isBigWin: totalWin >= bet * 15,
    isMegaWin: totalWin >= bet * 50,
    scatterCount,
    freeSpinsAwarded: freeSpins,
    triggeredFreeSpins: triggeredFS,
    isFreeSpin,
    triggeredHoldAndSpin: false,
    holdAndSpinCoins: 0,
    cascadeSteps: steps,
    cascadeMultiplier: mult,
    featureMessage: steps > 1 ? `CASCADE ×${steps}  ·  ${mult.toFixed(1)}×` : "",
    expandedReels: [],
    lockedCells: [],
    cascadeFrames,
  };
}

function spinExpandingWild(machine: MachineConfig, bet: number, isFreeSpin: boolean): SpinResult {
  const reels = generateReels(machine, { isFreeSpin });
  const expandedReels: number[] = [];
  for (let r = 0; r < 5; r++) {
    if (reels[r]!.some((s) => isWild(machine, s))) {
      expandedReels.push(r);
      reels[r] = [machine.wild, machine.wild, machine.wild];
    }
  }
  const result = evaluateLines(machine, reels, bet, { isFreeSpin });
  return {
    ...result,
    reels,
    expandedReels,
    featureMessage: expandedReels.length ? "EXPANDING WILDS" : "",
  };
}

function spinCluster(machine: MachineConfig, bet: number, isFreeSpin: boolean): SpinResult {
  const reels = generateReels(machine, { isFreeSpin });
  const counts = new Map<string, number>();
  for (const reel of reels) {
    for (const s of reel) {
      if (!isScatter(machine, s)) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  let totalWin = 0;
  const wins: WinLine[] = [];
  for (const [symbol, count] of counts) {
    const pays = machine.paytable[symbol];
    if (!pays || count < 5) continue;
    const idx = count >= 12 ? 2 : count >= 8 ? 1 : 0;
    let payout = pays[idx]! * (bet / 10) * (count / 5);
    if (isFreeSpin) payout *= machine.freeSpinMultiplier;
    totalWin += payout;
    wins.push({ lineIndex: -1, symbol, count, payout, usedWild: false });
  }
  const scatterCount = countScatters(machine, reels);
  let freeSpins = 0;
  let triggeredFS = false;
  if (scatterCount >= machine.scatterTrigger) {
    freeSpins = machine.freeSpinsByScatter[scatterCount] ?? 10;
    triggeredFS = true;
  }
  return {
    reels,
    winAmount: totalWin,
    winLines: wins,
    isBigWin: totalWin >= bet * 15,
    isMegaWin: totalWin >= bet * 50,
    scatterCount,
    freeSpinsAwarded: freeSpins,
    triggeredFreeSpins: triggeredFS,
    isFreeSpin,
    triggeredHoldAndSpin: false,
    holdAndSpinCoins: 0,
    cascadeSteps: 0,
    cascadeMultiplier: 1,
    featureMessage: wins.length ? "CLUSTER PAY" : "",
    expandedReels: [],
    lockedCells: [],
    cascadeFrames: [],
  };
}

export function spin(machine: MachineConfig, bet: number, opts: { isFreeSpin?: boolean } = {}): SpinResult {
  const isFreeSpin = opts.isFreeSpin ?? false;
  switch (machine.feature) {
    case "holdAndSpin":
      return spinHoldAndSpin(machine, bet, isFreeSpin);
    case "cascading":
      return spinCascading(machine, bet, isFreeSpin);
    case "expandingWild":
      return spinExpandingWild(machine, bet, isFreeSpin);
    case "cluster":
      return spinCluster(machine, bet, isFreeSpin);
    default:
      return spinClassic(machine, bet, isFreeSpin);
  }
}

export function idleWindow(machine: MachineConfig): string[][] {
  const ids = machine.symbols.map((s) => s.id);
  return Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 3 }, (__, row) => ids[(r * 3 + row) % ids.length]!),
  );
}
