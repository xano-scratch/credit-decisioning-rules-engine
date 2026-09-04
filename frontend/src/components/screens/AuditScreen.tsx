import { useEffect, useState } from "react";

import { getAudit, type AuditEvent, type AuditView } from "@/lib/api";
import { EventBadge } from "@/components/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AuditScreen({
  applicants,
  applicantId,
  onSelect,
}: {
  applicants: { id: number; name: string }[];
  applicantId: number | null;
  onSelect: (id: number) => void;
}) {
  const [data, setData] = useState<AuditView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (applicantId == null) {
      setData(null);
      return;
    }
    setData(null);
    setError(null);
    getAudit(applicantId)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load audit trail."));
  }, [applicantId]);

  const applicantName =
    (data?.applicant as { full_name?: string } | null)?.full_name ?? "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Applicant</span>
        <Select
          value={applicantId != null ? String(applicantId) : undefined}
          onValueChange={(v) => onSelect(Number(v))}
        >
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Choose an applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicants.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {applicantId == null ? (
        <p className="text-muted-foreground text-sm">
          Pick an applicant to see the ordered event history across all of their applications,
          each entry showing who acted and the policy version in force.
        </p>
      ) : !data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event history — {applicantName}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.events.length === 0 ? (
              <p className="text-muted-foreground text-sm">No events recorded yet.</p>
            ) : (
              <ol className="border-border relative space-y-6 border-l pl-6">
                {data.events.map((ev: AuditEvent, i: number) => (
                  <li key={i} className="relative">
                    <span className="bg-primary ring-background absolute -left-[26px] top-1.5 size-2.5 rounded-full ring-4" />
                    <div className="flex flex-wrap items-center gap-2">
                      <EventBadge event={String(ev.event)} />
                      <span className="text-muted-foreground text-xs">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                      {Number(ev.rule_set_version) > 0 && (
                        <span className="text-muted-foreground text-xs">
                          · policy v{String(ev.rule_set_version)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm">{String(ev.detail)}</p>
                    <p className="text-muted-foreground text-xs">by {String(ev.actor)}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
