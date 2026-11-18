import { Badge } from "@acme/platform/ui";
import type { RiskLevel } from "./schema";

const riskTone = { low: "success", medium: "warning", high: "danger" } as const;

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  return (
    <Badge tone={riskTone[level]}>
      {level}
      {score !== undefined && ` · ${score}`}
    </Badge>
  );
}

export function ScreeningBadges({ sanctions, pep }: { sanctions: boolean; pep: boolean }) {
  if (!sanctions && !pep) return <Badge tone="success">Clear</Badge>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {sanctions && <Badge tone="danger">Sanctions hit</Badge>}
      {pep && <Badge tone="warning">PEP hit</Badge>}
    </span>
  );
}
