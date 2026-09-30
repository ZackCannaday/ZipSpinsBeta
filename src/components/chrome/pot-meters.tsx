import { useEffect, useState, type CSSProperties } from "react";
import { formatCoins } from "@/lib/utils";

const POTS = [
  { label: "GRAND", base: 42_500_000, rate: 137 },
  { label: "MAJOR", base: 8_750_000, rate: 53 },
  { label: "MINOR", base: 1_100_000, rate: 17 },
  { label: "MINI", base: 250_000, rate: 4 },
] as const;

function potValue(base: number, rate: number, now: number) {
  const span = Math.floor(base * 0.06);
  return base + (Math.floor(now / 80) * rate) % span;
}

export function PotMeters({ accent = "#e7c36a" }: { accent?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 90);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="pot-row" aria-hidden>
      {POTS.map((pot) => (
        <div key={pot.label} className="pot" style={{ "--pot": accent } as CSSProperties}>
          <span className="pot-label">{pot.label}</span>
          <span className="pot-value">{formatCoins(potValue(pot.base, pot.rate, now))}</span>
        </div>
      ))}
    </div>
  );
}
