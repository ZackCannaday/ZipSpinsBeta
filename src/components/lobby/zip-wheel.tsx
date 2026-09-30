import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useEconomy, WHEEL_SEGMENTS } from "@/lib/store";
import { formatCoins, todayKey } from "@/lib/utils";
import { sfx, unlockAudio } from "@/lib/audio";

export function ZipWheel({ embedded = false }: { embedded?: boolean }) {
  const lastWheel = useEconomy((s) => s.lastWheel);
  const spinWheel = useEconomy((s) => s.spinWheel);
  const claimDaily = useEconomy((s) => s.claimDaily);
  const lastDaily = useEconomy((s) => s.lastDaily);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const today = todayKey();
  const used = lastWheel === today;

  useEffect(() => {
    if (!result) return;
    const id = window.setTimeout(() => setResult(null), 2600);
    return () => window.clearTimeout(id);
  }, [result]);

  const slices = useMemo(() => WHEEL_SEGMENTS, []);
  const slice = 360 / slices.length;

  async function spin() {
    if (used || spinning) return;
    unlockAudio();
    sfx.wheel();
    setSpinning(true);
    setResult(null);
    const outcome = spinWheel();
    if (!outcome.ok) {
      setSpinning(false);
      setResult(outcome.message);
      return;
    }
    const target = 360 * 6 + (360 - outcome.index * slice - slice / 2);
    setAngle(target);
    await new Promise((r) => setTimeout(r, 2800));
    sfx.wheelWin();
    setSpinning(false);
    setResult(outcome.message + " +" + formatCoins(outcome.amount));
  }

  return (
    <div className={embedded ? "zs-page" : "mx-auto max-w-lg px-4 pb-28 pt-6"}>
      {!embedded && (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--color-muted)]">Daily ZIP</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.03em] text-[var(--color-cloud)]">
            Daily wheel
          </h2>
        </>
      )}
      {embedded && <h2 className="zs-rail-head" style={{ paddingLeft: 0 }}>Daily wheel</h2>}
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        One spin a day. Coins only — no cash value.
      </p>

      <div className="relative mx-auto mt-8 aspect-square w-[min(100%,320px)]">
        <div
          className="absolute inset-0 rounded-full border-4 border-[var(--color-ember)] shadow-[var(--shadow-soft)] transition-transform duration-[2800ms] ease-[cubic-bezier(0.12,0.9,0.18,1)]"
          style={{
            transform: `rotate(${angle}deg)`,
            background: conic(slices.length),
          }}
        >
          {slices.map((seg, i) => (
            <span
              key={seg.label}
              className="absolute left-1/2 top-1/2 origin-bottom text-[11px] font-semibold tracking-wide text-[var(--color-ember-fg)]"
              style={{
                transform: `translate(-50%, -118%) rotate(${i * slice + slice / 2}deg)`,
              }}
            >
              {seg.label}
            </span>
          ))}
        </div>
        <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-8 border-t-[16px] border-x-transparent border-t-[var(--color-cloud)]" />
        <div className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-ink)] ring-2 ring-[var(--color-ember)]" />
      </div>

      <Button className="mt-8 w-full" disabled={used || spinning} onClick={() => void spin()}>
        {used ? "Returns tomorrow" : spinning ? "Spinning…" : "Spin ZipSpinZ"}
      </Button>
      {result && <p className="flash-line">{result}</p>}

      <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
        <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-cloud)]">
          Daily stipend
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">A quiet 25,000 coin credit, once per day.</p>
        <Button
          variant="outline"
          className="mt-4 w-full"
          disabled={lastDaily === today}
          onClick={() => claimDaily()}
        >
          {lastDaily === today ? "Claimed today" : "Collect stipend"}
        </Button>
      </div>
    </div>
  );
}

function conic(n: number) {
  const a = "var(--color-ember)";
  const b = "var(--color-cloud)";
  const stops: string[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % 2 === 0 ? a : b;
    stops.push(`${c} ${(i / n) * 360}deg ${((i + 1) / n) * 360}deg`);
  }
  return `conic-gradient(${stops.join(",")})`;
}
