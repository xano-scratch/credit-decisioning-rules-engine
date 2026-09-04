import { useState } from "react";
import { Loader2, Play } from "lucide-react";

import { submitApplication, type Application, type SubmitBody } from "@/lib/api";
import type { Session } from "@/lib/session";
import { OutcomeBadge, RiskTierBadge } from "@/components/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BLANK = {
  full_name: "",
  email: "",
  annual_income: "",
  monthly_debt: "",
  amount_requested: "",
  term_months: "36",
  employment_status: "employed",
  purpose: "personal",
};

export function ApplicationsScreen({
  applications,
  session,
  runningId,
  onRun,
  onView,
  onSubmitted,
}: {
  applications: Application[];
  session: Session;
  runningId: number | null;
  onRun: (id: number) => void;
  onView: (app: Application) => void;
  onSubmitted: () => void;
}) {
  const isUnderwriter = session.role === "underwriter";
  const [form, setForm] = useState({ ...BLANK });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: SubmitBody = {
        full_name: form.full_name,
        email: form.email,
        annual_income: Number(form.annual_income),
        monthly_debt: Number(form.monthly_debt),
        amount_requested: Number(form.amount_requested),
        term_months: Number(form.term_months),
        employment_status: form.employment_status as SubmitBody["employment_status"],
        purpose: form.purpose as SubmitBody["purpose"],
      };
      await submitApplication(body);
      setForm({ ...BLANK });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {isUnderwriter ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submit an application</CardTitle>
            <CardDescription>
              Debt-to-income is computed on submit. Run the decision from the table below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Full name">
                <Input
                  required
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                />
              </Field>
              <Field label="Email">
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
              <Field label="Annual income">
                <Input
                  required
                  type="number"
                  min={1}
                  value={form.annual_income}
                  onChange={(e) => set("annual_income", e.target.value)}
                />
              </Field>
              <Field label="Monthly debt">
                <Input
                  required
                  type="number"
                  min={0}
                  value={form.monthly_debt}
                  onChange={(e) => set("monthly_debt", e.target.value)}
                />
              </Field>
              <Field label="Amount requested">
                <Input
                  required
                  type="number"
                  min={1}
                  value={form.amount_requested}
                  onChange={(e) => set("amount_requested", e.target.value)}
                />
              </Field>
              <Field label="Term (months)">
                <Input
                  required
                  type="number"
                  min={1}
                  value={form.term_months}
                  onChange={(e) => set("term_months", e.target.value)}
                />
              </Field>
              <Field label="Employment">
                <Select
                  value={form.employment_status}
                  onValueChange={(v) => set("employment_status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employed">Employed</SelectItem>
                    <SelectItem value="self_employed">Self employed</SelectItem>
                    <SelectItem value="unemployed">Unemployed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Purpose">
                <Select value={form.purpose} onValueChange={(v) => set("purpose", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="home_improvement">Home improvement</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-end">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Submit application
                </Button>
              </div>
              {error && (
                <p className="text-destructive col-span-full text-sm">{error}</p>
              )}
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground py-4 text-sm">
            Signed in as a read-only reviewer. Submitting and running decisions are disabled
            for this role, and the API enforces the same rule.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right">DTI</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center">
                    No applications yet.
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium">{app.applicant_name}</div>
                      <div className="text-muted-foreground text-xs">{app.applicant_email}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {app.amount_requested.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(Number(app.dti) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Badge variant={app.status === "decided" ? "outline" : "secondary"}>
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {app.decision_outcome ? (
                        <div className="flex items-center gap-1.5">
                          <OutcomeBadge outcome={app.decision_outcome} />
                          {app.decision_tier && <RiskTierBadge tier={app.decision_tier} />}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">pending</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {app.status === "decided" ? (
                        <Button variant="ghost" size="sm" onClick={() => onView(app)}>
                          View
                        </Button>
                      ) : session.role === "underwriter" ? (
                        <Button
                          size="sm"
                          onClick={() => onRun(app.id)}
                          disabled={runningId === app.id}
                        >
                          {runningId === app.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Play className="size-4" />
                          )}
                          Run
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">read-only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
