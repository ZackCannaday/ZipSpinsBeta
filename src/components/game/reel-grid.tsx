import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { cn, formatCoins } from "@/lib/utils";
import type { MachineConfig, SpinResult } from "@/lib/engine/types";
import { sfx } from "@/lib/audio";

export const SPIN_BASE_MS = 1500;
export const SPIN_STAGGER_MS = 360;

export function spinDuration(col: number) {
  return SPIN_BASE_MS + col * SPIN_STAGGER_MS;
}

export function lastSpinMs() {
  return spinDuration(4) + 60;
}

function prefersReduce() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function winningCellKeys(machine: MachineConfig, result: SpinResult | null): Set<string> {
  const cells = new Set<string>();
  if (!result) return cells;
  for (const w of result.winLines) {
    if (w.lineIndex < 0) {
      result.reels.forEach((col, ci) =>
        col.forEach((s, ri) => {
          if (s === w.symbol) cells.add(`${ci}-${ri}`);
        }),
      );
      continue;
    }
    const line = machine.paylines[w.lineIndex];
    if (!line) continue;
    for (let i = 0; i < w.count; i++) cells.add(`${i}-${line[i]!}`);
  }
  if (result.scatterCount >= machine.scatterTrigger) {
    result.reels.forEach((col, ci) =>
      col.forEach((s, ri) => {
        if (s === machine.scatter) cells.add(`${ci}-${ri}`);
      }),
    );
  }
  return cells;
}

function fillStrip(strip: HTMLElement, ids: string[]) {
  while (strip.children.length < ids.length) {
    const img = document.createElement("img");
    img.className = "reel-face";
    img.alt = "";
    img.draggable = false;
    strip.appendChild(img);
  }
  while (strip.children.length > ids.length) strip.lastChild?.remove();
  ids.forEach((id, i) => {
    const img = strip.children[i] as HTMLImageElement;
    const src = `/machines/symbols/${id}.jpg`;
    if (img.getAttribute("src") !== src) img.src = src;
    img.classList.remove("is-win");
  });
}

function reelEase(t: number) {
  if (t < 0.58) return (t / 0.58) * 0.74;
  const u = (t - 0.58) / 0.42;
  return 0.74 + (1 - (1 - u) ** 3) * 0.26;
}

function ReelColumn({
  colIndex,
  result,
  pool,
  spinning,
  machine,
  onStopped,
}: {
  colIndex: number;
  result: string[];
  pool: string[];
  spinning: boolean;
  machine: MachineConfig;
  winCells: Set<string>;
  lockedRows: boolean[];
  expanded: boolean;
  onStopped: () => void;
}) {
  const windowRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const shown = useRef(result);
  const resultRef = useRef(result);
  const onStoppedRef = useRef(onStopped);
  resultRef.current = result;
  onStoppedRef.current = onStopped;
  const resultKey = result.join("|");

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip || spinning) return;
    const landing = resultRef.current;
    shown.current = landing;
    fillStrip(strip, landing);
    strip.style.transform = "translate3d(0,0,0)";
  }, [spinning, resultKey]);

  useLayoutEffect(() => {
    if (!spinning) return;
    const strip = stripRef.current;
    const win = windowRef.current;
    if (!strip || !win) return;

    const cell = Math.max(win.clientHeight / 3, 28);
    const travel = 18 + colIndex * 3;
    const ms = spinDuration(colIndex);
    const landing = resultRef.current;
    const startFaces = shown.current;
    const faces: string[] = [];
    for (let i = 0; i < travel + 3; i++) {
      if (i < 3) faces.push(startFaces[i] ?? landing[i] ?? pool[0]!);
      else if (i >= travel) faces.push(landing[i - travel] ?? pool[0]!);
      else faces.push(pool[(i * 3 + colIndex * 5) % pool.length] ?? pool[0]!);
    }
    fillStrip(strip, faces);
    strip.style.transform = "translate3d(0,0,0)";

    const started = performance.now();
    let raf = 0;
    let stopped = false;
    const tick = (now: number) => {
      if (stopped) return;
      const t = Math.min(1, (now - started) / ms);
      const y = -(reelEase(t) * travel * cell);
      strip.style.transform = `translate3d(0, ${y}px, 0)`;
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      shown.current = landing;
      onStoppedRef.current();
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [spinning, colIndex, pool]);

  return (
    <div ref={windowRef} data-skin={machine.reelSkin} className="reel-window">
      <div ref={stripRef} className="reel-strip" />
    </div>
  );
}

export function ReelGrid({
  machine,
  reels,
  spinning,
  result,
  onLanded,
}: {
  machine: MachineConfig;
  reels: string[][];
  spinning: boolean;
  result: SpinResult | null;
  onLanded?: () => void;
}) {
  const pool = useMemo(() => machine.symbols.map((s) => s.id), [machine]);
  const winCells = useMemo(
    () => (spinning ? new Set<string>() : winningCellKeys(machine, result)),
    [machine, result, spinning],
  );
  const winChips = useMemo(() => {
    const map = new Map<string, number>();
    if (spinning || !result) return map;
    for (const w of result.winLines) {
      if (w.payout <= 0) continue;
      let col = 2;
      let row = 1;
      const line = w.lineIndex >= 0 ? machine.paylines[w.lineIndex] : null;
      if (line) {
        col = Math.max(0, Math.min(4, w.count - 1));
        row = line[col] ?? 1;
      }
      const key = `${col}-${row}`;
      map.set(key, (map.get(key) ?? 0) + w.payout);
    }
    return map;
  }, [machine, result, spinning]);
  const stops = useRef(0);
  const onLandedRef = useRef(onLanded);
  const fitRef = useRef<HTMLDivElement>(null);
  onLandedRef.current = onLanded;

  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const cell = Math.max(28, Math.floor(Math.min((w - 20) / 5.12, (h - 16) / 3.08)));
      el.style.setProperty("--cell", `${cell}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!spinning) {
      stops.current = 0;
      return;
    }
    stops.current = 0;
    const ms = prefersReduce() ? 80 : lastSpinMs() + 400;
    const t = window.setTimeout(() => {
      if (stops.current >= 5) return;
      stops.current = 5;
      onLandedRef.current?.();
    }, ms);
    return () => window.clearTimeout(t);
  }, [spinning]);

  function columnStopped() {
    if (!spinning) return;
    stops.current += 1;
    sfx.reelStop(machine.reelSkin);
    if (stops.current === 5) onLandedRef.current?.();
  }

  return (
    <div ref={fitRef} className="flex h-full w-full items-center justify-center">
      <div
        data-skin={machine.reelSkin}
        className="reel-cabinet relative p-1.5"
        style={{ "--skin": machine.accent } as CSSProperties}
      >
        <div className="reel-cabinet-ornament" aria-hidden />
        <div className="reel-fit relative">
          {reels.map((col, ci) => (
            <ReelColumn
              key={`${machine.id}-${ci}`}
              colIndex={ci}
              result={col}
              pool={pool}
              spinning={spinning}
              machine={machine}
              winCells={winCells}
              lockedRows={result?.lockedCells[ci] ?? [false, false, false]}
              expanded={!spinning && !!result?.expandedReels.includes(ci)}
              onStopped={columnStopped}
            />
          ))}
          {!spinning && winCells.size > 0 && (
            <div className="pointer-events-none absolute inset-0 z-20 win-grid" aria-hidden>
              {Array.from({ length: 15 }, (_, i) => {
                const col = i % 5;
                const row = Math.floor(i / 5);
                const on = winCells.has(`${col}-${row}`);
                const amt = winChips.get(`${col}-${row}`);
                return (
                  <div key={i} className={cn("relative", on && "win-cube")}>
                    {amt ? <span className="win-chip">{formatCoins(amt)}</span> : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
