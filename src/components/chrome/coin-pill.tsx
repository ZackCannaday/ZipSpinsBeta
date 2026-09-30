import { formatCoinsFull } from "@/lib/utils";

export function CoinPill({ amount }: { amount: number }) {
  return (
    <div className="coin-pill" aria-label={`${formatCoinsFull(amount)} play coins`}>
      <span className="coin-pip" aria-hidden />
      <span className="tabular-nums">{formatCoinsFull(amount)}</span>
    </div>
  );
}
