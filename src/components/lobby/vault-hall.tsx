import { useEffect, useState } from "react";
import { Flash } from "@/components/chrome/flash";
import { useEconomy } from "@/lib/store";
import { formatCoins } from "@/lib/utils";

function leftToday() {
  const end = new Date();
  end.setHours(24, 0, 0, 0);
  const ms = Math.max(0, end.getTime() - Date.now());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function VaultHall() {
  const joinVault = useEconomy((s) => s.joinVault);
  const [clock, setClock] = useState(leftToday);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setClock(leftToday()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  function join() {
    const r = joinVault();
    setToast(r.ok ? `Card locked. +${formatCoins(r.amount)} ZIP` : r.message);
    window.setTimeout(() => setToast(null), 1800);
  }

  return (
    <div className="zs-page">
      <h1>Zip Vault</h1>
      <p className="zs-note">Two house cards a day. Punch one. Still play coins — not a cash draw.</p>
      <article className="zs-bingo">
        <h2>ZIP CARD</h2>
        <div className="prize">HOUSE PURSE · 100M ZIP</div>
        <p>{clock}</p>
        <button type="button" className="zs-join" onClick={join}>
          JOIN NOW
        </button>
      </article>
      <article className="zs-bingo">
        <h2>CLAN DROP</h2>
        <div className="prize">BEST HIT ON THIS DEVICE</div>
        <p>{clock}</p>
        <button type="button" className="zs-join" onClick={join}>
          JOIN NOW
        </button>
      </article>
      {toast && <Flash text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
