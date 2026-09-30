import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gift, Search, Ticket, Timer, Trophy } from "lucide-react";
import { MACHINES } from "@/lib/machines/catalog";
import type { MachineConfig } from "@/lib/engine/types";
import { useEconomy } from "@/lib/store";
import { formatCoins, formatCoinsFull } from "@/lib/utils";
import { MachineCard } from "./machine-card";

const CHIPS = ["ALL", "HITS", "JACKPOTS", "NEW", "HOLD"] as const;
type Chip = (typeof CHIPS)[number];

const HERO_IDS = ["chronos-engine", "emerald-jungle", "neon-ronin", "lucky-clover"];

const NAMES = ["Nova", "Jett", "Mara", "Sol", "Ivy", "Rex", "Poe", "Wynn"];

function useClimb(seed: number) {
  const [n, setN] = useState(seed);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => v + 80 + Math.floor(Math.random() * 240));
    }, 1100);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function matches(machine: MachineConfig, chip: Chip, q: string) {
  const query = q.trim().toLowerCase();
  if (query && !`${machine.name} ${machine.featureName} ${machine.theme}`.toLowerCase().includes(query)) {
    return false;
  }
  if (chip === "JACKPOTS") return machine.badge === "JACKPOT" || machine.volatility >= 4;
  if (chip === "NEW") return machine.badge === "NEW";
  if (chip === "HOLD") return machine.feature === "holdAndSpin" || machine.feature === "expandingWild";
  if (chip === "HITS") return machine.badge === "HOT" || machine.feature === "cascading";
  return true;
}

export function Lobby({ onStore }: { onStore: () => void }) {
  const history = useEconomy((s) => s.history);
  const [chip, setChip] = useState<Chip>("ALL");
  const [q, setQ] = useState("");
  const [openFind, setOpenFind] = useState(false);
  const [hero, setHero] = useState(0);
  const [see, setSee] = useState<string | null>(null);
  const jackpot = useClimb(8_372_440_118);
  const pot = useClimb(1_144_600);

  const heroes = HERO_IDS.map((id) => MACHINES.find((m) => m.id === id)).filter(Boolean) as MachineConfig[];
  const featured = heroes[hero] ?? heroes[0]!;

  useEffect(() => {
    const id = window.setInterval(() => setHero((h) => (h + 1) % heroes.length), 4200);
    return () => window.clearInterval(id);
  }, [heroes.length]);

  const liveWins = useMemo(() => {
    const fromPlay = history
      .filter((h) => h.win > 0)
      .slice(0, 6)
      .map((h, i) => ({
        name: NAMES[i % NAMES.length]!,
        game: h.machineName,
        win: h.win,
        img: MACHINES.find((m) => m.id === h.machineId)?.cover ?? MACHINES[0]!.cover,
      }));
    const seed = MACHINES.map((m, i) => ({
      name: NAMES[i % NAMES.length]!,
      game: m.name,
      win: 1_200 + i * 840,
      img: m.cover,
    }));
    return [...fromPlay, ...seed];
  }, [history]);

  const filtered = MACHINES.filter((m) => matches(m, chip, q));
  const ranked = [...MACHINES].sort((a, b) => b.volatility - a.volatility || b.maxBet - a.maxBet);

  const rails: { id: string; title: string; items: MachineConfig[]; pots?: boolean }[] = [
    { id: "hits", title: "Zip Hits", items: MACHINES },
    { id: "jp", title: "Zip Jackpot", items: MACHINES.filter((m) => m.volatility >= 4), pots: true },
    { id: "new", title: "New on the floor", items: MACHINES.filter((m) => m.badge === "NEW" || m.badge === "HOT") },
    {
      id: "hold",
      title: "Hold & feature",
      items: MACHINES.filter((m) => m.feature === "holdAndSpin" || m.feature === "expandingWild" || m.feature === "cluster"),
    },
  ];

  const showRails = chip === "ALL" && !q && !see;

  return (
    <div>
      <div className="zs-marquee" aria-hidden>
        <div className="zs-marquee-track">
          {[...liveWins, ...liveWins].map((w, i) => (
            <div className="zs-win-chip" key={`${w.game}-${i}`}>
              <img src={w.img} alt="" />
              <div>
                <p>{w.name}</p>
                <span>{formatCoins(w.win)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="zs-hero-wrap">
        <Link to="/play/$machineId" params={{ machineId: featured.id }} className="zs-hero">
          <img src={featured.cabinet} alt="" />
          <span className="zs-hero-cta">LET'S ZIP</span>
        </Link>
        <div className="zs-dots">
          {heroes.map((m, i) => (
            <i key={m.id} className={i === hero ? "is-on" : ""} />
          ))}
        </div>
      </div>

      <div className="zs-quick">
        <button type="button" onClick={() => setChip("JACKPOTS")}>
          <span className="zs-orb">
            <Trophy size={20} />
          </span>
          <em>Jackpot</em>
          <small>{formatCoins(jackpot)}</small>
        </button>
        <button type="button" onClick={onStore}>
          <span className="zs-orb">
            <Ticket size={20} />
          </span>
          <em>Rips</em>
          <small>Open</small>
        </button>
        <button type="button" onClick={() => setSee("hold")}>
          <span className="zs-orb">
            <Timer size={20} />
          </span>
          <em>Hold</em>
          <small>Live</small>
        </button>
        <button type="button" onClick={() => setChip("HITS")}>
          <span className="zs-orb">
            <Trophy size={20} />
          </span>
          <em>Hits</em>
          <small>Now</small>
        </button>
      </div>

      <div className="zs-meter">
        <span className="zs-meter-crown" aria-hidden>
          Z
        </span>
        <p>
          <b>Climbing purse</b>
          {formatCoinsFull(pot)} ZIP in play
        </p>
        <button type="button" className="zs-gift" aria-label="Open the lounge bonus" onClick={onStore}>
          <Gift size={16} />
        </button>
      </div>

      <div className="zs-tools">
        <button type="button" className="zs-search" aria-label="Search games" onClick={() => setOpenFind((v) => !v)}>
          <Search size={16} />
        </button>
        <div className="zs-chips">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              className={chip === c && !see ? "zs-chip is-on" : "zs-chip"}
              onClick={() => {
                setChip(c);
                setSee(null);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {openFind && (
        <input
          className="zs-find"
          placeholder="Find a machine"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      )}

      {showRails ? (
        <>
          <div className="zs-rail-head">
            <h2>Floor favorites</h2>
            <button type="button" onClick={() => setSee("ranked")}>
              See all
            </button>
          </div>
          <div className="zs-rail">
            {ranked.map((m, i) => (
              <div className="zs-rank" key={m.id}>
                <span className="zs-rank-num">{i + 1}</span>
                <MachineCard machine={m} />
              </div>
            ))}
          </div>
          {rails.map((rail) => (
            <section key={rail.id}>
              <div className="zs-rail-head">
                <h2>{rail.title}</h2>
                <button type="button" onClick={() => setSee(rail.id)}>
                  See all
                </button>
              </div>
              <div className="zs-rail">
                {rail.items.map((m) => (
                  <MachineCard
                    key={`${rail.id}-${m.id}`}
                    machine={m}
                    pot={rail.pots ? Math.floor(jackpot / (8 + m.volatility)) : undefined}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      ) : (
        <>
          <div className="zs-rail-head">
            <h2>{see === "ranked" ? "Floor favorites" : q ? "Results" : chip === "ALL" ? "The floor" : chip}</h2>
            <button
              type="button"
              onClick={() => {
                setSee(null);
                setChip("ALL");
                setQ("");
              }}
            >
              Back
            </button>
          </div>
          <div className="zs-grid">
            {(see ? rails.find((r) => r.id === see)?.items ?? ranked : filtered).map((m) => (
              <MachineCard key={m.id} machine={m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
