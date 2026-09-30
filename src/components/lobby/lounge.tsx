import { useState } from "react";
import { Flash } from "@/components/chrome/flash";
import { Calendar, Gift, Medal, Sofa, Ticket } from "lucide-react";
import { ZipWheel } from "@/components/lobby/zip-wheel";
import { useEconomy } from "@/lib/store";
import { DAILY_BONUS } from "@/lib/machines/catalog";
import { formatCoins, todayKey } from "@/lib/utils";

export function Lounge({ onInvite }: { onInvite: () => void }) {
  const claimDaily = useEconomy((s) => s.claimDaily);
  const claimCoinback = useEconomy((s) => s.claimCoinback);
  const lastDaily = useEconomy((s) => s.lastDaily);
  const lastCoinback = useEconomy((s) => s.lastCoinback);
  const [toast, setToast] = useState<string | null>(null);
  const today = todayKey();

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  return (
    <div className="zs-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Sofa color="#e7c56a" />
        <h1 style={{ margin: 0 }}>Zip Lounge</h1>
      </div>
      <div className="zs-lounge-grid">
        <button type="button" className="zs-lounge-card" onClick={onInvite}>
          <Medal />
          Zip VIP
        </button>
        <button
          type="button"
          className="zs-lounge-card"
          onClick={() => {
            const r = claimDaily();
            flash(r.ok ? `Daily ${formatCoins(DAILY_BONUS)} ZIP` : r.message);
          }}
        >
          <Calendar />
          {lastDaily === today ? "Daily claimed" : "Daily bonus"}
        </button>
        <button type="button" className="zs-lounge-card" onClick={onInvite}>
          <Gift />
          Invite
        </button>
        <button
          type="button"
          className="zs-lounge-card"
          onClick={() => {
            const r = claimCoinback();
            flash(r.ok ? `CoinBack ${formatCoins(r.amount)}` : r.message);
          }}
        >
          <Ticket />
          {lastCoinback === today ? "CoinBack in" : "CoinBack"}
        </button>
        <button
          type="button"
          className="zs-lounge-card"
          onClick={() => document.getElementById("zip-wheel")?.scrollIntoView({ behavior: "smooth" })}
        >
          <Sofa />
          Daily wheel
        </button>
      </div>
      <div id="zip-wheel">
        <ZipWheel embedded />
      </div>
      {toast && <Flash text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
