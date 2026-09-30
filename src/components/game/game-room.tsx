import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Minus, Plus, Info } from "lucide-react";
import { idleWindow } from "@/lib/engine/spin";
import type { MachineConfig, SpinResult } from "@/lib/engine/types";
import { sfx, unlockAudio } from "@/lib/audio";
import { useEconomy, type LimitBlock } from "@/lib/store";
import { formatCoins } from "@/lib/utils";
import { CoinPill } from "@/components/chrome/coin-pill";
import { PotMeters } from "@/components/chrome/pot-meters";
import { Button } from "@/components/ui/button";
import { ReelGrid, lastSpinMs } from "./reel-grid";
import { Paytable } from "./paytable";
import { cn } from "@/lib/utils";

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{formatCoins(n)}</>;
}

const SPIN_WORD: Record<string, string> = {
  clockwork: "WIND",
  orbit: "WARP",
  temple: "PRAY",
  ice: "FREEZE",
  neon: "DRAW",
  arcane: "CAST",
  mythic: "ROAR",
  clover: "SPIN",
};

export function GameRoom({ machine }: { machine: MachineConfig }) {
  const coins = useEconomy((s) => s.coins);
  const playRound = useEconomy((s) => s.playRound);
  const session = useEconomy((s) => s.session);

  const [bet, setBet] = useState(Math.max(machine.minBet, 500));
  const [reels, setReels] = useState(() => idleWindow(machine));
  const [spinning, setSpinning] = useState(false);
  const [last, setLast] = useState<SpinResult | null>(null);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [block, setBlock] = useState<LimitBlock | null>(null);
  const [autoLeft, setAutoLeft] = useState(0);
  const [freeLeft, setFreeLeft] = useState(0);
  const [inFree, setInFree] = useState(false);
  const [freeTotal, setFreeTotal] = useState(0);
  const busy = useRef(false);
  const freeLeftRef = useRef(0);
  const inFreeRef = useRef(false);
  const autoLeftRef = useRef(0);
  const freeTotalRef = useRef(0);
  const landWaiter = useRef<(() => void) | null>(null);
  const holdTimer = useRef<number | null>(null);
  const heldAuto = useRef(false);

  useEffect(() => {
    setReels(idleWindow(machine));
    setLast(null);
    setBet(Math.max(machine.minBet, Math.min(500, machine.maxBet)));
  }, [machine]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(id);
  }, [notice]);

  function handleLanded() {
    landWaiter.current?.();
    landWaiter.current = null;
  }

  async function runSpin() {
    if (busy.current) return;
    try {
    unlockAudio();
    const isFree = inFreeRef.current && freeLeftRef.current > 0;
    busy.current = true;
    setOverlay(null);
    setNotice(null);
    if (isFree) {
      freeLeftRef.current -= 1;
      setFreeLeft(freeLeftRef.current);
    }

    const outcome = playRound(machine.id, bet, isFree);
    if (!outcome.ok) {
      setSpinning(false);
      busy.current = false;
      autoLeftRef.current = 0;
      setAutoLeft(0);
      if ("block" in outcome && outcome.block) setBlock(outcome.block);
      else if ("message" in outcome) setNotice(outcome.message);
      return;
    }

    const result = outcome.result;
    const landWindow = result.cascadeFrames[0] ?? result.reels;
    setLast(null);
    setReels(landWindow);
    sfx.spin(machine.reelSkin);
    setSpinning(true);
    await Promise.race([
      new Promise<void>((res) => {
        landWaiter.current = res;
      }),
      wait(lastSpinMs() + 900),
    ]);
    landWaiter.current = null;
    sfx.stop();
    setSpinning(false);

    if (result.cascadeFrames.length > 1) {
      for (const frame of result.cascadeFrames.slice(1)) {
        setReels(frame);
        await wait(380);
      }
    }
    setReels(result.reels);
    setLast(result);

    if (result.triggeredHoldAndSpin) {
      sfx.big(machine.reelSkin);
      setOverlay(result.featureMessage || "HOLD & SPIN");
      await wait(1500);
      setOverlay(null);
    } else if (result.expandedReels.length) {
      setOverlay(result.featureMessage || "EXPANDING WILDS");
      await wait(900);
      setOverlay(null);
    } else if (result.cascadeSteps > 1) {
      setOverlay(result.featureMessage);
      await wait(900);
      setOverlay(null);
    } else if (result.featureMessage === "CLUSTER PAY") {
      setOverlay("CLUSTER PAY");
      await wait(800);
      setOverlay(null);
    }

    if (result.winAmount > 0) {
      if (isFree) {
        freeTotalRef.current += result.winAmount;
        setFreeTotal(freeTotalRef.current);
      }
      if (result.isMegaWin || result.isBigWin) {
        sfx.big(machine.reelSkin);
        setOverlay(result.isMegaWin ? "MEGA WIN" : "BIG WIN");
        await wait(2400);
        setOverlay(null);
      } else {
        sfx.win(machine.reelSkin);
        await wait(900);
      }
    }

    if (result.triggeredFreeSpins && result.freeSpinsAwarded > 0) {
      inFreeRef.current = true;
      freeLeftRef.current += result.freeSpinsAwarded;
      setInFree(true);
      setFreeLeft(freeLeftRef.current);
      setOverlay(`${result.freeSpinsAwarded} FREE SPINS`);
      await wait(1600);
      setOverlay(null);
    }

    if (outcome.limitBlock) {
      busy.current = false;
      autoLeftRef.current = 0;
      setAutoLeft(0);
      setBlock(outcome.limitBlock);
      return;
    }

    busy.current = false;

    if (inFreeRef.current && freeLeftRef.current > 0) {
      window.setTimeout(() => void runSpin(), 650);
      return;
    }

    if (inFreeRef.current && freeLeftRef.current <= 0) {
      inFreeRef.current = false;
      setInFree(false);
      const purse = freeTotalRef.current;
      setFreeTotal(purse);
      setOverlay(purse > 0 ? "YOU WON" : null);
      if (purse > 0) await wait(2200);
      setOverlay(null);
      freeTotalRef.current = 0;
      setFreeTotal(0);
    }

    if (autoLeftRef.current > 0) {
      autoLeftRef.current -= 1;
      setAutoLeft(autoLeftRef.current);
      if (autoLeftRef.current > 0) window.setTimeout(() => void runSpin(), 780);
    }
    } catch {
      busy.current = false;
      setSpinning(false);
    }
  }

  function changeBet(delta: number) {
    if (spinning || inFree) return;
    setBet((b) => Math.min(machine.maxBet, Math.max(machine.minBet, b + delta)));
  }

  function pressSpinDown() {
    if (autoLeftRef.current > 0) {
      autoLeftRef.current = 0;
      setAutoLeft(0);
      heldAuto.current = false;
      return;
    }
    if (busy.current || inFreeRef.current) return;
    heldAuto.current = false;
    holdTimer.current = window.setTimeout(() => {
      heldAuto.current = true;
      autoLeftRef.current = 20;
      setAutoLeft(20);
      void runSpin();
    }, 450);
  }

  function pressSpinUp() {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (heldAuto.current) return;
    if (busy.current || inFreeRef.current) return;
    void runSpin();
  }

  const net = session.active ? coins - session.startBalance : 0;
  const scatterNow = spinning ? 0 : reels.flat().filter((s) => s === machine.scatter).length;

  const payMessage = (() => {
    if (inFree) return `Free game · ${formatCoins(freeTotal)} won`;
    if (!last || last.winAmount <= 0 || spinning) return `Welcome to ${machine.name}!`;
    if (last.winLines.length > 1) return `${last.winLines.length} lines pay ${formatCoins(last.winAmount)}`;
    const hit = last.winLines[0];
    if (!hit) return `Pays ${formatCoins(last.winAmount)}`;
    const label = machine.symbols.find((s) => s.id === hit.symbol)?.label ?? hit.symbol;
    return `${hit.count} ${label} pays ${formatCoins(hit.payout)}`;
  })();

  const huge = overlay === "MEGA WIN" || overlay === "BIG WIN" || overlay === "YOU WON";
  const celebrateAmount = overlay === "YOU WON" ? freeTotal : last?.winAmount ?? 0;

  return (
    <div className="game-screen" data-skin={machine.reelSkin}>
      <img src={machine.cabinet} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      <div className="game-vignette" />

      <header className="game-top">
        <Link
          to="/"
          onClick={(e) => {
            if (inFree) e.preventDefault();
          }}
          className="game-back"
          aria-label="Back to lobby"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.08em] text-white">
            {machine.name}
          </p>
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: machine.accent }}>
            {machine.featureName}
          </p>
        </div>
        <CoinPill amount={coins} />
      </header>

      <div className="game-layout">
        <aside className="game-side">
          <img src={machine.emblem} alt="" className="game-emblem" />
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-gold)]">
            {machine.theme}
          </p>
          <p className="text-center text-xs leading-relaxed text-white/70">{machine.featureDescription}</p>
        </aside>

        <div className="game-main">
          <PotMeters accent={machine.accent} />
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5" aria-label="Scatter count">
              {Array.from({ length: machine.scatterTrigger }).map((_, i) => (
                <span key={i} className={cn("scatter-pip", i < scatterNow && "is-on")} />
              ))}
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                {scatterNow}/{machine.scatterTrigger}
              </span>
            </div>
            {inFree ? (
              <span className="free-pill">
                {freeLeft} free
              </span>
            ) : (
              <span className="feature-pill" style={{ color: machine.accent }}>
                {machine.featureName}
              </span>
            )}
          </div>
          <div className="game-reels">
            <ReelGrid
              machine={machine}
              reels={reels}
              spinning={spinning}
              result={last}
              onLanded={handleLanded}
            />
          </div>
        </div>

        <aside className="game-side">
          <div className="side-card">
            <p className="side-kicker">This session</p>
            <p className="side-stat">{session.rounds} spins</p>
            <p className={cn("side-stat", net >= 0 ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]")}>
              {net >= 0 ? "+" : ""}
              {formatCoins(net)}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/50">Play coins only</p>
          </div>
        </aside>
      </div>

      <footer className="game-dock">
        {notice && <p className="mb-1 text-center text-xs text-[var(--color-warn)]">{notice}</p>}
        <div className="pay-marquee">
          <span>{payMessage}</span>
          <button type="button" aria-label="Paytable" onClick={() => setPaytableOpen(true)} className="pay-info">
            <Info className="size-4" />
          </button>
        </div>
        <div className="dock-row">
          <div className="bet-pod">
            <button type="button" aria-label="Decrease bet" disabled={spinning || inFree} onClick={() => changeBet(-machine.betStep)}>
              <Minus className="size-4" />
            </button>
            <div>
              <p>Bet</p>
              <strong>{formatCoins(bet)}</strong>
            </div>
            <button type="button" aria-label="Increase bet" disabled={spinning || inFree} onClick={() => changeBet(machine.betStep)}>
              <Plus className="size-4" />
            </button>
          </div>
          <button
            type="button"
            className={cn("spin-orb", (spinning || autoLeft > 0) && "is-live")}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              pressSpinDown();
            }}
            onPointerUp={pressSpinUp}
            onPointerCancel={pressSpinUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span>{autoLeft > 0 ? "STOP" : inFree ? "FREE" : SPIN_WORD[machine.reelSkin]}</span>
            <small>{autoLeft > 0 ? `${autoLeft} LEFT` : "HOLD FOR AUTO"}</small>
          </button>
        </div>
      </footer>

      {overlay && (
        <div className={cn("celebrate", huge && "is-huge")}>
          {huge && (
            <div className="coin-rain" aria-hidden>
              {Array.from({ length: 18 }, (_, i) => (
                <span key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 7) * 0.12}s` }} />
              ))}
            </div>
          )}
          <div className={cn("celebrate-card", huge && "is-gold")}>
            <small>{machine.name}</small>
            <p>{overlay}</p>
            {huge && celebrateAmount > 0 && (
              <strong>
                <CountUp value={celebrateAmount} />
              </strong>
            )}
          </div>
        </div>
      )}

      {paytableOpen && <Paytable machine={machine} onClose={() => setPaytableOpen(false)} />}

      {block && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-6">
          <div className="max-w-md rounded-3xl border border-[var(--color-line-strong)] bg-[var(--color-panel)] p-6">
            <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-cloud)]">Session paused</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{block.reason}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Cooldown until {new Date(block.until).toLocaleTimeString()}
            </p>
            <Link to="/" className="mt-5 block">
              <Button className="w-full">Return to lobby</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
