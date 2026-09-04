import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { listRuleSets, type Criteria, type RuleSet } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const LABELS: Record<keyof Criteria, string> = {
  min_income: "Income floor",
  min_amount: "Minimum amount",
  max_amount: "Maximum amount",
  max_dti: "DTI ceiling",
  refer_dti: "DTI referral band",
  tier_a_income: "Tier A income",
  tier_b_income: "Tier B income",
  tier_c_income: "Tier C income",
};

function formatCriterion(key: keyof Criteria, value: number): string {
  if (key === "max_dti" || key === "refer_dti") return `${Math.round(value * 100)}%`;
  return value.toLocaleString();
}

export function RuleSetsScreen() {
  const [rows, setRows] = useState<RuleSet[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRuleSets()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load policies."));
  }, []);

  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (!rows) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Every credit policy lives here, versioned. Exactly one is active at a time, and each
        decision is pinned to the version that produced it.
      </p>
      {rows.map((rs) => {
        const criteria = rs.criteria as Criteria;
        return (
          <Card key={rs.id} className={rs.is_active ? "border-primary" : undefined}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-baseline gap-2">
                  {rs.name}
                  <span className="text-muted-foreground text-sm font-normal">
                    version {rs.version}
                  </span>
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-xs">
                  Effective {new Date(rs.effective_at).toLocaleDateString()}
                </p>
              </div>
              {rs.is_active ? (
                <Badge>
                  <CheckCircle2 className="mr-1 size-3" /> Active
                </Badge>
              ) : (
                <Badge variant="outline">Retired</Badge>
              )}
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                {(Object.keys(LABELS) as (keyof Criteria)[]).map((key) => (
                  <div key={key}>
                    <dt className="text-muted-foreground text-xs">{LABELS[key]}</dt>
                    <dd className="font-medium tabular-nums">
                      {formatCriterion(key, criteria[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
