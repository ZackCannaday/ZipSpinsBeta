import { Link } from "@tanstack/react-router";
import type { MachineConfig } from "@/lib/engine/types";
import { formatCoinsFull } from "@/lib/utils";

export function MachineCard({
  machine,
  pot,
}: {
  machine: MachineConfig;
  pot?: number;
}) {
  return (
    <Link to="/play/$machineId" params={{ machineId: machine.id }} className="zs-tile">
      <img src={machine.cover} alt="" />
      <div className="zs-tile-shade" />
      {pot != null && (
        <span className="zs-pot-chip">
          <i />
          {formatCoinsFull(pot)}
        </span>
      )}
      {machine.badge && <span className="zs-flag">{machine.badge}</span>}
      <p className="zs-tile-name">{machine.name}</p>
      <p className="zs-tile-sub">{machine.featureName}</p>
    </Link>
  );
}
