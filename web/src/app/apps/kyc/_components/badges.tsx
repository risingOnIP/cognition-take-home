import { Badge, type Tone } from "@acme/platform/ui";
import type { RiskLevel } from "../_lib/schema";
import type { SlaInfo } from "../_lib/service";

const RISK_TONE: Record<RiskLevel, Tone> = { low: "neutral", medium: "warning", high: "danger" };

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <Badge tone={RISK_TONE[risk]}>{risk} risk</Badge>;
}

function duration(hours: number): string {
  const h = Math.abs(hours);
  return h >= 48 ? `${Math.floor(h / 24)}d` : `${h}h`;
}

export function SlaBadge({ sla }: { sla: SlaInfo }) {
  switch (sla.state) {
    case "breached":
      return <Badge tone="danger">Breached · {duration(sla.hoursLeft)} over</Badge>;
    case "due_soon":
      return <Badge tone="warning">Due in {duration(sla.hoursLeft)}</Badge>;
    case "on_track":
      return <Badge>{duration(sla.hoursLeft)} left</Badge>;
    case "met":
      return <Badge tone="success">Met</Badge>;
    case "missed":
      return <Badge tone="danger">Missed by {duration(sla.hoursLeft)}</Badge>;
  }
}
