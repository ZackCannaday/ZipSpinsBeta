/** Cryptographically secure integer in [0, maxExclusive). Unbiased. */
export function secureInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0]!;
  } while (x >= limit);
  return x % maxExclusive;
}

export function pickWeighted<T>(items: Array<{ item: T; weight: number }>): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  if (total <= 0) return items[items.length - 1]!.item;
  let roll = secureInt(total);
  for (const entry of items) {
    roll -= entry.weight;
    if (roll < 0) return entry.item;
  }
  return items[items.length - 1]!.item;
}
