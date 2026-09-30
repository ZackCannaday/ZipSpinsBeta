import { useState } from "react";
import { Flash } from "@/components/chrome/flash";
import { useEconomy } from "@/lib/store";
import { formatCoinsFull } from "@/lib/utils";

export function RedeemDesk() {
  const coins = useEconomy((s) => s.coins);
  const history = useEconomy((s) => s.history);
  const [tab, setTab] = useState<"balance" | "history">("balance");
  const [note, setNote] = useState<string | null>(null);
  const marks = history.reduce((n, r) => n + r.win, 0);

  function explain() {
    setNote("ZipSpinZ is play-only. This purse cannot be redeemed for cash.");
    window.setTimeout(() => setNote(null), 2200);
  }

  return (
    <div className="zs-page">
      <div className="zs-tabs">
        <button type="button" className={tab === "history" ? "is-on" : ""} onClick={() => setTab("history")}>
          HISTORY
        </button>
        <button type="button" className={tab === "balance" ? "is-on" : ""} onClick={() => setTab("balance")}>
          PURSE
        </button>
      </div>
      {tab === "balance" ? (
        <>
          <h1>Play balance</h1>
          <div className="zs-duo">
            <article className="zs-money">
              <p>ZIP</p>
              <strong>{formatCoinsFull(coins)}</strong>
              <p>Play coins on this device</p>
              <button type="button" onClick={explain}>
                PLAY ONLY
              </button>
            </article>
            <article className="zs-money">
              <p>Marks</p>
              <strong>{formatCoinsFull(marks)}</strong>
              <p>Lifetime wins, not cash</p>
              <button type="button" onClick={explain}>
                PLAY ONLY
              </button>
            </article>
          </div>
        </>
      ) : (
        <ul className="zs-ledger">
          {history.length === 0 && <li>No spins yet.</li>}
          {history.slice(0, 16).map((r) => (
            <li key={r.id}>
              <span>
                {r.machineName}
                <br />
                <small>{new Date(r.at).toLocaleTimeString()}</small>
              </span>
              <b>
                {r.net >= 0 ? "+" : ""}
                {formatCoinsFull(r.net)}
              </b>
            </li>
          ))}
        </ul>
      )}
      {note && <Flash text={note} onDone={() => setNote(null)} />}
    </div>
  );
}
