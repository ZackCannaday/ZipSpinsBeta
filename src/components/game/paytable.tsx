import type { MachineConfig } from "@/lib/engine/types";
import { Button } from "@/components/ui/button";
import { SymbolTile } from "./symbol-tile";
import { formatCoins } from "@/lib/utils";

export function Paytable({ machine, onClose }: { machine: MachineConfig; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-[color-mix(in_oklab,var(--color-ink)_65%,transparent)] sm:place-items-center" onClick={onClose}>
      <div
        className="max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius-xl)] border border-[var(--color-line-strong)] bg-[var(--color-panel)] p-5 sm:rounded-[var(--radius-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.02em] text-[var(--color-cloud)]">
          {machine.name}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{machine.featureDescription}</p>
        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-muted)]">
          {machine.paylines.length} lines · RTP target {(machine.rtpTarget * 100).toFixed(0)}% · vol {machine.volatility}/5
        </p>
        <div className="mt-4 space-y-2">
          {machine.symbols.map((s) => {
            const pay = machine.paytable[s.id];
            if (!pay) return null;
            return (
              <div
                key={s.id}
                className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-ink-2)] p-2"
              >
                <SymbolTile id={s.id} skin={machine.reelSkin} accent={machine.accent} />
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{s.kind}</p>
                </div>
                <p className="text-right font-mono text-xs tabular-nums text-[var(--color-cloud)]">
                  3× {pay[0]}
                  <br />
                  4× {pay[1]}
                  <br />
                  5× {pay[2]}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          Line pays are multiples of the line stake (total bet ÷ {machine.paylines.length}). Virtual coins only —
          entertainment, not a wager of real money. Bets {formatCoins(machine.minBet)}–{formatCoins(machine.maxBet)}.
        </p>
        <Button className="mt-4 w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
