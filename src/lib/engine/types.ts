export type MachineFeature =
  | "classic"
  | "holdAndSpin"
  | "cascading"
  | "expandingWild"
  | "cluster";

export type ReelSkin =
  | "clockwork"
  | "orbit"
  | "temple"
  | "ice"
  | "neon"
  | "arcane"
  | "mythic"
  | "clover";

export type Badge = "" | "HOT" | "NEW" | "JACKPOT";

export type PayTriple = [number, number, number];

export interface SymbolDef {
  id: string;
  label: string;
  kind: "low" | "high" | "wild" | "scatter" | "special";
}

export interface MachineConfig {
  id: string;
  name: string;
  theme: string;
  description: string;
  badge: Badge;
  /** CSS color used only as machine-local accent (not global brand). */
  accent: string;
  cover: string;
  emblem: string;
  cabinet: string;
  reelSkin: ReelSkin;
  symbols: SymbolDef[];
  /** 3 / 4 / 5 of a kind multipliers of line bet. */
  paytable: Record<string, PayTriple>;
  paylines: number[][];
  minBet: number;
  maxBet: number;
  betStep: number;
  volatility: 1 | 2 | 3 | 4 | 5;
  rtpTarget: number;
  wild: string;
  scatter: string;
  scatterTrigger: number;
  freeSpinsByScatter: Record<number, number>;
  freeSpinMultiplier: number;
  feature: MachineFeature;
  featureName: string;
  featureDescription: string;
  special: string;
  featureTriggerCount: number;
  featureMaxMultiplier: number;
  /** scatter count → total-bet multiplier */
  scatterPays: Record<number, number>;
}

export interface WinLine {
  lineIndex: number;
  symbol: string;
  count: number;
  payout: number;
  usedWild: boolean;
}

export interface SpinResult {
  reels: string[][];
  winAmount: number;
  winLines: WinLine[];
  isBigWin: boolean;
  isMegaWin: boolean;
  scatterCount: number;
  freeSpinsAwarded: number;
  triggeredFreeSpins: boolean;
  isFreeSpin: boolean;
  triggeredHoldAndSpin: boolean;
  holdAndSpinCoins: number;
  cascadeSteps: number;
  cascadeMultiplier: number;
  featureMessage: string;
  expandedReels: number[];
  lockedCells: boolean[][];
  cascadeFrames: string[][][];
}

export interface RoundRecord {
  id: string;
  at: number;
  machineId: string;
  machineName: string;
  bet: number;
  win: number;
  net: number;
  feature: string;
  freeSpin: boolean;
}
