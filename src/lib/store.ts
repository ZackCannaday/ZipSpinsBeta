import { create } from "zustand";
import { persist } from "zustand/middleware";
import { spin as engineSpin } from "@/lib/engine/spin";
import type { RoundRecord, SpinResult } from "@/lib/engine/types";
import { DAILY_BONUS, WELCOME_BONUS, getMachine } from "@/lib/machines/catalog";
import { todayKey } from "@/lib/utils";

export type Tab = "lobby" | "store" | "redeem" | "lounge" | "vault";

export interface Limits {
  timeMinutes: number;
  maxRounds: number;
  lossStop: number;
  winStop: number;
  cooldownMinutes: number;
}

export interface Session {
  active: boolean;
  startedAt: number;
  startBalance: number;
  rounds: number;
  wagered: number;
  won: number;
  endedReason: string | null;
}

export interface LimitBlock {
  reason: string;
  until: number;
}

const DEFAULT_LIMITS: Limits = {
  timeMinutes: 45,
  maxRounds: 80,
  lossStop: 250_000,
  winStop: 750_000,
  cooldownMinutes: 15,
};

export const WHEEL_SEGMENTS = [
  { label: "5K", amount: 5_000 },
  { label: "10K", amount: 10_000 },
  { label: "25K", amount: 25_000 },
  { label: "50K", amount: 50_000 },
  { label: "15K", amount: 15_000 },
  { label: "100K", amount: 100_000 },
  { label: "8K", amount: 8_000 },
  { label: "250K", amount: 250_000 },
] as const;

interface EconomyState {
  coins: number;
  welcomeClaimed: boolean;
  lastDaily: string;
  lastWheel: string;
  lastVault: string;
  lastCoinback: string;
  history: RoundRecord[];
  limits: Limits;
  session: Session;
  cooldownUntil: number;
  tab: Tab;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  setTab: (tab: Tab) => void;
  claimWelcome: () => void;
  claimDaily: () => { ok: boolean; amount: number; message: string };
  claimCoinback: () => { ok: boolean; amount: number; message: string };
  joinVault: () => { ok: boolean; amount: number; message: string };
  grant: (amount: number) => void;
  spinWheel: () => { ok: boolean; amount: number; label: string; index: number; message: string };
  checkCooldown: () => LimitBlock | null;
  playRound: (
    machineId: string,
    bet: number,
    isFreeSpin: boolean,
  ) =>
    | { ok: false; block: LimitBlock }
    | { ok: false; message: string }
    | { ok: true; result: SpinResult; limitBlock?: LimitBlock };
  endSession: (reason: string) => LimitBlock;
  saveLimits: (limits: Limits) => void;
  resetBank: () => void;
}

function emptySession(): Session {
  return {
    active: false,
    startedAt: 0,
    startBalance: 0,
    rounds: 0,
    wagered: 0,
    won: 0,
    endedReason: null,
  };
}

function readLimits(session: Session, coins: number, limits: Limits): string | null {
  if (!session.active) return null;
  const elapsedMin = (Date.now() - session.startedAt) / 60_000;
  const net = coins - session.startBalance;
  if (elapsedMin >= limits.timeMinutes) return "Time stop reached.";
  if (session.rounds >= limits.maxRounds) return "Round stop reached.";
  if (net <= -limits.lossStop) return "Loss stop reached.";
  if (net >= limits.winStop) return "Win stop reached.";
  return null;
}

export const useEconomy = create<EconomyState>()(
  persist(
    (set, get) => ({
      coins: 0,
      welcomeClaimed: false,
      lastDaily: "",
      lastWheel: "",
      lastVault: "",
      lastCoinback: "",
      history: [],
      limits: DEFAULT_LIMITS,
      session: emptySession(),
      cooldownUntil: 0,
      tab: "lobby",
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      setTab: (tab) => set({ tab }),
      claimWelcome: () => {
        if (get().welcomeClaimed) return;
        set({ coins: WELCOME_BONUS, welcomeClaimed: true });
      },
      claimDaily: () => {
        const s = get();
        const today = todayKey();
        if (s.lastDaily === today) {
          return { ok: false, amount: 0, message: "Today's stipend is already in the vault." };
        }
        set({ coins: s.coins + DAILY_BONUS, lastDaily: today });
        return { ok: true, amount: DAILY_BONUS, message: "Daily stipend credited." };
      },
      claimCoinback: () => {
        const s = get();
        const today = todayKey();
        if (s.lastCoinback === today) {
          return { ok: false, amount: 0, message: "CoinBack is already in the purse." };
        }
        const amount = 8_000;
        set({ coins: s.coins + amount, lastCoinback: today });
        return { ok: true, amount, message: "CoinBack credited. Play coins only." };
      },
      joinVault: () => {
        const s = get();
        const today = todayKey();
        if (s.lastVault === today) {
          return { ok: false, amount: 0, message: "You're already on today's vault card." };
        }
        const amount = 12_000;
        set({ coins: s.coins + amount, lastVault: today });
        return { ok: true, amount, message: "Vault card punched. 12,000 ZIP added." };
      },
      grant: (amount) => {
        const n = Math.floor(amount);
        if (n <= 0) return;
        set({ coins: get().coins + n });
      },
      spinWheel: () => {
        const s = get();
        const today = todayKey();
        if (s.lastWheel === today) {
          return { ok: false, amount: 0, label: "", index: 0, message: "The ZipSpinZ wheel rests until tomorrow." };
        }
        const n = WHEEL_SEGMENTS.length;
        const idx = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0]! / 0x1_0000_0000) * n);
        const seg = WHEEL_SEGMENTS[idx]!;
        set({ coins: s.coins + seg.amount, lastWheel: today });
        return { ok: true, amount: seg.amount, label: seg.label, index: idx, message: `ZipSpinZ landed on ${seg.label}.` };
      },
      checkCooldown: () => {
        const s = get();
        if (Date.now() < s.cooldownUntil) {
          return { reason: "A cooldown is in effect after the last session stop.", until: s.cooldownUntil };
        }
        return null;
      },
      endSession: (reason) => {
        const s = get();
        const until = Date.now() + s.limits.cooldownMinutes * 60_000;
        set({
          session: { ...s.session, active: false, endedReason: reason },
          cooldownUntil: until,
        });
        return { reason, until };
      },
      playRound: (machineId, bet, isFreeSpin) => {
        const machine = getMachine(machineId);
        if (!machine) return { ok: false, message: "Unknown machine." };

        const cool = get().checkCooldown();
        if (cool) return { ok: false, block: cool };

        let s = get();
        if (!s.session.active) {
          set({
            session: {
              active: true,
              startedAt: Date.now(),
              startBalance: s.coins,
              rounds: 0,
              wagered: 0,
              won: 0,
              endedReason: null,
            },
          });
          s = get();
        }

        const hit = readLimits(s.session, s.coins, s.limits);
        if (hit) return { ok: false, block: get().endSession(hit) };

        if (!isFreeSpin) {
          if (bet < machine.minBet || bet > machine.maxBet) {
            return { ok: false, message: "Bet is outside this machine's range." };
          }
          if (s.coins < bet) return { ok: false, message: "Not enough coins." };
        }

        const result = engineSpin(machine, bet, { isFreeSpin });
        const spent = isFreeSpin ? 0 : bet;
        const nextCoins = s.coins - spent + result.winAmount;
        const record: RoundRecord = {
          id: `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`,
          at: Date.now(),
          machineId: machine.id,
          machineName: machine.name,
          bet: spent,
          win: result.winAmount,
          net: result.winAmount - spent,
          feature: result.featureMessage,
          freeSpin: isFreeSpin,
        };
        const session: Session = {
          ...s.session,
          active: true,
          rounds: s.session.rounds + 1,
          wagered: s.session.wagered + spent,
          won: s.session.won + result.winAmount,
        };
        set({
          coins: nextCoins,
          history: [record, ...s.history].slice(0, 200),
          session,
        });

        const after = readLimits(session, nextCoins, get().limits);
        if (after) {
          return { ok: true, result, limitBlock: get().endSession(after) };
        }
        return { ok: true, result };
      },
      saveLimits: (limits) => set({ limits }),
      resetBank: () =>
        set({
          coins: WELCOME_BONUS,
          history: [],
          session: emptySession(),
          cooldownUntil: 0,
        }),
    }),
    {
      name: "zipspinz-economy-v1",
      partialize: (s) => ({
        coins: s.coins,
        welcomeClaimed: s.welcomeClaimed,
        lastDaily: s.lastDaily,
        lastWheel: s.lastWheel,
        lastVault: s.lastVault,
        lastCoinback: s.lastCoinback,
        history: s.history.slice(0, 80),
        limits: s.limits,
        cooldownUntil: s.cooldownUntil,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
