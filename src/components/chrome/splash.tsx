import { WELCOME_BONUS } from "@/lib/machines/catalog";
import { unlockAudio } from "@/lib/audio";
import { formatCoinsFull } from "@/lib/utils";

export function Splash({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="zs-app is-splash">
      <div className="zs-store-hero" style={{ backgroundImage: "url(/machines/cabinets/chronos-engine.jpg)", height: "46dvh", margin: 0 }} />
      <div className="zs-page" style={{ textAlign: "center" }}>
        <p className="zs-note">Play coins · no cash value · 18+</p>
        <h1>ZipSpinZ</h1>
        <p>
          Eight machines on one floor. Jackpots climb. Your purse stays on this device.
        </p>
        <p className="zs-note">Welcome purse {formatCoinsFull(WELCOME_BONUS)} ZIP</p>
        <button
          type="button"
          className="zs-join"
          onClick={() => {
            unlockAudio();
            onEnter();
          }}
        >
          ENTER
        </button>
      </div>
    </div>
  );
}
