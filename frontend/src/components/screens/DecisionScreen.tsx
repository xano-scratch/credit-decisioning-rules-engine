import { useEffect, useState, type ComponentType } from "react";
import { FileText, GitBranch, Loader2, Scale } from "lucide-react";

import {
  ApiError,
  getDecision,
  type DecisionView,
  type Outcome,
  type RiskTier,
} from "@/lib/api";
import { OutcomeBadge, RiskTierBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-1 font-medium">{children}</div>
    </div>
  );
}

export function DecisionScreen({
  applicationId,
  canRun,
  running,
  onRun,
  refreshKey,
}: {
  applicationId: number | null;
  canRun: boolean;
  running: boolean;
  onRun: (id: number) => void;
  refreshKey: number;
}) {
  const [data, setData] = useState<DecisionView | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "undecided" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (applicationId == null) {
      setState("undecided");
      setData(null);
      return;
    }
    let live = true;
    setState("loading");
    getDecision(applicationId)
      .then((d) => {
        if (!live) return;
        setData(d);
        setState("ready");
      })
      .catch((e) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 404) {
          setState("undecided");
        } else {
          setError(e instanceof Error ? e.message : "Failed to load the decision.");
          setState("error");
        }
      });
    return () => {
      live = false;
    };
  }, [applicationId, refreshKey]);

  if (applicationId == null) {
    return (
      <p className="text-muted-foreground text-sm">
        Select an application from the Applications tab to see its governed decision.
      </p>
    );
  }
  if (state === "loading") return <Skeleton className="h-72 w-full" />;
  if (state === "error") return <p className="text-destructive text-sm">{error}</p>;

  if (state === "undecided") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application #{applicationId}</CardTitle>
          <CardDescription>
            This application is submitted but has not been decided yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canRun ? (
            <Button onClick={() => onRun(applicationId)} disabled={running}>
              {running && <Loader2 className="mr-2 size-4 animate-spin" />}
              Run the decisioning waterfall
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm">
              Awaiting an underwriter. Read-only reviewers cannot run decisions.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const decision = data?.decision;
  if (!decision) return null;
  const ruleSet = data?.rule_set;
  const application = data?.application;
  const applicant = data?.applicant;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardDescription>Governed decision</CardDescription>
            <CardTitle className="text-2xl">
              {String(applicant?.full_name ?? "Applicant")} · application #
              {String(application?.id ?? applicationId)}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <OutcomeBadge outcome={decision.outcome as Outcome} />
            <RiskTierBadge tier={decision.risk_tier as RiskTier} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/40 rounded-lg border p-4">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <Scale className="size-3.5" /> Rule that fired
          </div>
          <p className="mt-1.5 text-lg font-medium">{decision.fired_rule}</p>
          <p className="text-muted-foreground mt-1 text-sm">{decision.reason}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Fact icon={GitBranch} label="Pinned policy">
            {String(ruleSet?.name ?? "")}{" "}
            <span className="text-muted-foreground font-normal">
              (v{String(ruleSet?.version ?? "")})
            </span>
          </Fact>
          <Fact icon={FileText} label="Requested">
            <span className="tabular-nums">
              {Number(application?.amount_requested ?? 0).toLocaleString()}
            </span>{" "}
            <span className="text-muted-foreground font-normal">
              over {String(application?.term_months ?? "")} months
            </span>
          </Fact>
          <Fact icon={Scale} label="Debt-to-income">
            <span className="tabular-nums">
              {(Number(application?.dti ?? 0) * 100).toFixed(1)}%
            </span>
          </Fact>
        </div>

        <Separator />

        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between sm:block">
            <dt className="text-muted-foreground text-xs">Applicant income</dt>
            <dd className="font-medium tabular-nums">
              {Number(applicant?.annual_income ?? 0).toLocaleString()}
            </dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-muted-foreground text-xs">Employment</dt>
            <dd className="font-medium">
              {String(applicant?.employment_status ?? "").replace("_", " ")}
            </dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-muted-foreground text-xs">Purpose</dt>
            <dd className="font-medium">
              {String(application?.purpose ?? "").replace("_", " ")}
            </dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-muted-foreground text-xs">Applicant email</dt>
            <dd className="font-medium">{String(applicant?.email ?? "")}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
