import { useState } from "react";
import { Gift, Headphones, History, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEconomy, type Limits } from "@/lib/store";
import { formatCoinsFull } from "@/lib/utils";

export function ProfileSheet({
  onClose,
  onHistory,
  onInvite,
}: {
  onClose: () => void;
  onHistory: () => void;
  onInvite: () => void;
}) {
  const limits = useEconomy((s) => s.limits);
  const saveLimits = useEconomy((s) => s.saveLimits);
  const resetBank = useEconomy((s) => s.resetBank);
  const endSession = useEconomy((s) => s.endSession);
  const session = useEconomy((s) => s.session);
  const history = useEconomy((s) => s.history);
  const [draft, setDraft] = useState<Limits>(limits);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const wagered = history.reduce((n, r) => n + r.bet, 0);
  const cap = 500_000;
  const pct = Math.min(100, Math.round((wagered / cap) * 100));

  return (
    <div className="zs-sheet" role="dialog" aria-label="Profile">
      <div className="zs-sheet-top">
        <button type="button" className="zs-home" onClick={onClose} aria-label="Back to lobby">
          <Home size={18} />
        </button>
        <span />
      </div>
      <div className="zs-who">
        <img src="/machines/symbols/horse.jpg" alt="" />
        <div>
          <h2>Zack</h2>
          <p style={{ margin: 0, color: "var(--color-muted)", fontSize: 13 }}>Play purse on this device</p>
        </div>
      </div>
      <div className="zs-vip" aria-hidden>
        <i style={{ width: `${pct}%` }} />
      </div>
      <p className="zs-vip-label">
        {formatCoinsFull(Math.min(wagered, cap))} / {formatCoinsFull(cap)} VIP pace
      </p>

      <section className="zs-card">
        <h3>My info</h3>
        <p>Display name: Zack</p>
        <p>Coins stay on this device.</p>
        <p>Member status: social play, no cash value.</p>
      </section>

      <div className="zs-actions">
        <button type="button" onClick={onHistory}>
          <History /> Funds history
        </button>
        <button type="button" onClick={onInvite}>
          <Gift /> Invite friends
        </button>
      </div>
      <button type="button" className="zs-support" onClick={() => setOpen((v) => !v)}>
        <Headphones /> Support & limits
      </button>

      {open && (
        <div className="zs-card zs-limits">
          <p>Stops live on this device and halt play even if you keep tapping.</p>
          {(
            [
              ["timeMinutes", "Session minutes", 10, 120, 5],
              ["maxRounds", "Max rounds", 20, 200, 5],
              ["lossStop", "Loss stop", 25_000, 1_000_000, 25_000],
              ["winStop", "Win stop", 50_000, 2_000_000, 50_000],
              ["cooldownMinutes", "Cooldown minutes", 5, 60, 5],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <label key={key}>
              {label} · {draft[key].toLocaleString()}
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
              />
            </label>
          ))}
          <Button
            className="mt-4 w-full"
            onClick={() => {
              saveLimits(draft);
              setSaved(true);
              window.setTimeout(() => setSaved(false), 1200);
            }}
          >
            {saved ? "Saved" : "Save limits"}
          </Button>
          {session.active && (
            <Button variant="danger" className="mt-3 w-full" onClick={() => endSession("Ended from profile.")}>
              End session
            </Button>
          )}
          <Button variant="outline" className="mt-3 w-full" onClick={() => resetBank()}>
            Reset play purse
          </Button>
        </div>
      )}
    </div>
  );
}
