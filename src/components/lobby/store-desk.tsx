import { useState } from "react";
import { Flash } from "@/components/chrome/flash";
import { useEconomy } from "@/lib/store";
import { formatCoins } from "@/lib/utils";

const PACKS = [
  { coins: 40_000, hot: false },
  { coins: 100_000, hot: true },
  { coins: 400_000, hot: false },
  { coins: 1_000_000, hot: false },
  { coins: 2_000_000, hot: false },
  { coins: 3_000_000, hot: false },
  { coins: 4_000_000, hot: true },
  { coins: 5_000_000, hot: false },
  { coins: 6_000_000, hot: true },
];

export function StoreDesk() {
  const grant = useEconomy((s) => s.grant);
  const [toast, setToast] = useState<string | null>(null);

  function add(coins: number) {
    grant(coins);
    setToast(`${formatCoins(coins)} ZIP added. No charge — play coins only.`);
    window.setTimeout(() => setToast(null), 1800);
  }

  return (
    <div className="zs-page">
      <div className="zs-store-hero" style={{ backgroundImage: "url(/machines/cabinets/mythic-beast.jpg)" }} />
      <div className="zs-packs">
        {PACKS.map((p) => (
          <article key={p.coins} className={p.hot ? "zs-pack is-hot" : "zs-pack"}>
            <header>{formatCoins(p.coins)}</header>
            <div className="zs-stack" />
            <button type="button" onClick={() => add(p.coins)}>
              ADD
            </button>
          </article>
        ))}
      </div>
      <p className="zs-note">Demo purse. Nothing is billed. ZIP never converts to cash.</p>
      {toast && <Flash text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
