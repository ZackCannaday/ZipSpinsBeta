import { useEffect, useState } from "react";
import { Armchair, Crown, LayoutGrid, ShoppingBag, Wallet } from "lucide-react";
import { Lobby } from "@/components/lobby/lobby";
import { StoreDesk } from "@/components/lobby/store-desk";
import { RedeemDesk } from "@/components/lobby/redeem-desk";
import { Lounge } from "@/components/lobby/lounge";
import { VaultHall } from "@/components/lobby/vault-hall";
import { ProfileSheet } from "@/components/lobby/profile";
import { Flash } from "@/components/chrome/flash";
import { useEconomy, type Tab } from "@/lib/store";
import { formatCoinsFull } from "@/lib/utils";

const NAV: { id: Tab; label: string; icon: typeof ShoppingBag }[] = [
  { id: "store", label: "Store", icon: ShoppingBag },
  { id: "redeem", label: "Purse", icon: Wallet },
  { id: "lobby", label: "Lobby", icon: LayoutGrid },
  { id: "lounge", label: "Lounge", icon: Armchair },
  { id: "vault", label: "Vault", icon: LayoutGrid },
];

export function AppShell() {
  const tab = useEconomy((s) => s.tab);
  const setTab = useEconomy((s) => s.setTab);
  const coins = useEconomy((s) => s.coins);
  const [profile, setProfile] = useState(false);
  const [invite, setInvite] = useState<string | null>(null);

  useEffect(() => {
    document.querySelector(".zs-main")?.scrollTo(0, 0);
  }, [tab]);

  function share() {
    const line = "ZipSpinZ floor is open — play coins only, no cash value.";
    if (navigator.share) {
      void navigator.share({ title: "ZipSpinZ", text: line }).catch(() => setInvite(line));
    } else {
      void navigator.clipboard?.writeText(line).catch(() => undefined);
      setInvite("Invite line copied.");
    }
    window.setTimeout(() => setInvite(null), 1600);
  }

  return (
    <div className="zs-app">
      <header className="zs-top">
        <button type="button" className="zs-avatar" onClick={() => setProfile(true)} aria-label="Profile">
          <img src="/machines/symbols/horse.jpg" alt="" />
        </button>
        <div className="zs-balance">
          <strong>ZIP {formatCoinsFull(coins)}</strong>
          <button type="button" className="zs-plus" aria-label="Add play coins" onClick={() => setTab("store")}>
            +
          </button>
        </div>
        <button type="button" className="zs-wallet is-on" aria-label="Play wallet" onClick={() => setTab("redeem")}>
          Z
        </button>
      </header>

      <main className="zs-main">
        {tab === "lobby" && <Lobby onStore={() => setTab("lounge")} />}
        {tab === "store" && <StoreDesk />}
        {tab === "redeem" && <RedeemDesk />}
        {tab === "lounge" && <Lounge onInvite={() => { setProfile(true); share(); }} />}
        {tab === "vault" && <VaultHall />}
      </main>

      <nav className="zs-nav" aria-label="ZipSpinZ">
        {NAV.map((item) => {
          const Icon = item.icon;
          const on = tab === item.id;
          if (item.id === "lobby") {
            return (
              <button key={item.id} type="button" className="zs-lobby-btn" onClick={() => setTab("lobby")}>
                <span className="zs-mark">
                  <Crown size={16} className="zs-crown" />
                  Z
                </span>
              </button>
            );
          }
          return (
            <button key={item.id} type="button" className={on ? "is-on" : ""} onClick={() => setTab(item.id)}>
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {profile && (
        <ProfileSheet
          onClose={() => setProfile(false)}
          onHistory={() => {
            setProfile(false);
            setTab("redeem");
          }}
          onInvite={share}
        />
      )}
      {invite && <Flash text={invite} onDone={() => setInvite(null)} />}
    </div>
  );
}
