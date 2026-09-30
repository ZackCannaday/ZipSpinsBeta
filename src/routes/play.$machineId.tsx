import { createFileRoute, Link } from "@tanstack/react-router";
import { GameRoom } from "@/components/game/game-room";
import { getMachine } from "@/lib/machines/catalog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/play/$machineId")({
  component: PlayPage,
});

function PlayPage() {
  const { machineId } = Route.useParams();
  const machine = getMachine(machineId);
  if (!machine) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--color-ink)] px-6 text-center">
        <div>
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-cloud)]">
            Machine not on the floor
          </p>
          <Link to="/" className="mt-6 inline-block">
            <Button>Back to lobby</Button>
          </Link>
        </div>
      </main>
    );
  }
  return <GameRoom machine={machine} />;
}
