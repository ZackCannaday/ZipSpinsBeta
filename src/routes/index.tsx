import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/chrome/app-shell";
import { Splash } from "@/components/chrome/splash";
import { useEconomy } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const welcomeClaimed = useEconomy((s) => s.welcomeClaimed);
  const hydrated = useEconomy((s) => s.hydrated);
  const setHydrated = useEconomy((s) => s.setHydrated);
  const claimWelcome = useEconomy((s) => s.claimWelcome);

  useEffect(() => {
    const unsub = useEconomy.persist.onFinishHydration(() => setHydrated(true));
    if (useEconomy.persist.hasHydrated()) setHydrated(true);
    const t = window.setTimeout(() => setHydrated(true), 400);
    return () => {
      unsub();
      window.clearTimeout(t);
    };
  }, [setHydrated]);

  if (!hydrated) {
    return <div className="min-h-dvh bg-[var(--color-ink)]" />;
  }

  if (!welcomeClaimed) {
    return (
      <Splash
        onEnter={() => {
          claimWelcome();
        }}
      />
    );
  }

  return <AppShell />;
}
