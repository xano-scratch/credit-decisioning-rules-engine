import { Badge } from "@/components/ui/badge";
import type { Outcome, RiskTier } from "@/lib/api";

const OUTCOME_VARIANT: Record<Outcome, "default" | "secondary" | "destructive"> = {
  approve: "default",
  refer: "secondary",
  decline: "destructive",
};

const OUTCOME_LABEL: Record<Outcome, string> = {
  approve: "Approve",
  refer: "Refer",
  decline: "Decline",
};

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return <Badge variant={OUTCOME_VARIANT[outcome]}>{OUTCOME_LABEL[outcome]}</Badge>;
}

export function RiskTierBadge({ tier }: { tier: RiskTier }) {
  return (
    <Badge variant="outline" className="tabular-nums">
      Tier {tier}
    </Badge>
  );
}

const EVENT_LABEL: Record<string, string> = {
  submitted: "Submitted",
  evaluated: "Evaluated",
  overridden: "Overridden",
  viewed: "Viewed",
};

export function EventBadge({ event }: { event: string }) {
  return <Badge variant="outline">{EVENT_LABEL[event] ?? event}</Badge>;
}
