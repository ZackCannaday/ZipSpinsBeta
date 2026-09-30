import type { CSSProperties } from "react";
import type { ReelSkin } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

export function SymbolTile({
  id,
  win,
  dim,
  locked,
  expand,
  skin = "clockwork",
  accent = "#c4a06a",
  className,
}: {
  id: string;
  win?: boolean;
  dim?: boolean;
  locked?: boolean;
  expand?: boolean;
  skin?: ReelSkin;
  accent?: string;
  className?: string;
}) {
  const style = { "--tile": accent } as CSSProperties;

  return (
    <div
      style={style}
      data-skin={skin}
      className={cn(
        "reel-sym relative grid aspect-square w-full shrink-0 place-items-center overflow-hidden",
        win && "is-win",
        dim && "is-dim",
        locked && "is-lock",
        expand && "is-expand",
        className,
      )}
    >
      <img
        src={`/machines/symbols/${id}.jpg`}
        alt=""
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );
}
