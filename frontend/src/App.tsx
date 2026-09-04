import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { listApplications, runDecision, seed, type Application } from "@/lib/api";
import { DEMO_ACCOUNTS, useSession, type Role } from "@/lib/session";
import { ApplicationsScreen } from "@/components/screens/ApplicationsScreen";
import { AuditScreen } from "@/components/screens/AuditScreen";
import { DecisionScreen } from "@/components/screens/DecisionScreen";
import { RuleSetsScreen } from "@/components/screens/RuleSetsScreen";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Tab = "applications" | "decision" | "audit" | "rule-sets";
const TABS: Tab[] = ["applications", "decision", "audit", "rule-sets"];

function readParams(): { tab: Tab | null; app: number | null } {
  if (typeof window === "undefined") return { tab: null, app: null };
  const p = new URLSearchParams(window.location.search);
  const tab = p.get("tab") as Tab | null;
  const appRaw = p.get("app");
  return {
    tab: tab && TABS.includes(tab) ? tab : null,
    app: appRaw && /^\d+$/.test(appRaw) ? Number(appRaw) : null,
  };
}

export default function App() {
  const { session, busy, error, signInAs } = useSession();
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [tab, setTab] = useState<Tab>("applications");
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [selectedApplicantId, setSelectedApplicantId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [runningId, setRunningId] = useState<number | null>(null);
  const booted = useRef(false);

  const refresh = useCallback(async () => {
    const apps = await listApplications();
    setApplications(apps);
    return apps;
  }, []);

  // Bootstrap: sign in as the default underwriter, load the book, and seed the
  // ephemeral once if it is empty. Reads deep-link params (?tab=&app=).
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      try {
        const ok = await signInAs("underwriter");
        if (!ok) return;
        let apps = await refresh();
        if (apps.length === 0) {
          await seed();
          apps = await refresh();
        }
        const { tab: initialTab, app: initialApp } = readParams();
        if (initialTab) setTab(initialTab);
        if (initialApp != null) {
          setSelectedAppId(initialApp);
          const match = apps.find((x) => x.id === initialApp);
          if (match) setSelectedApplicantId(match.applicant_id);
        }
        setReady(true);
      } catch (e) {
        setBootError(e instanceof Error ? e.message : "Could not load the demo.");
      }
    })();
  }, [signInAs, refresh]);

  const applicants = useMemo(() => {
    const seen = new Map<number, string>();
    for (const a of applications) {
      if (!seen.has(a.applicant_id)) seen.set(a.applicant_id, a.applicant_name);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [applications]);

  const selectApp = useCallback((app: Application) => {
    setSelectedAppId(app.id);
    setSelectedApplicantId(app.applicant_id);
    setTab("decision");
  }, []);

  const handleRun = useCallback(
    async (id: number) => {
      setRunningId(id);
      try {
        await runDecision(id);
        const apps = await refresh();
        setSelectedAppId(id);
        const app = apps.find((x) => x.id === id);
        if (app) setSelectedApplicantId(app.applicant_id);
        setRefreshKey((k) => k + 1);
        setTab("decision");
      } finally {
        setRunningId(null);
      }
    },
    [refresh],
  );

  const handleSubmitted = useCallback(async () => {
    await refresh();
    setRefreshKey((k) => k + 1);
  }, [refresh]);

  const switchSigner = useCallback(
    async (role: Role) => {
      const ok = await signInAs(role);
      if (ok) {
        await refresh();
        setRefreshKey((k) => k + 1);
      }
    },
    [signInAs, refresh],
  );

  if (!ready || !session) {
    return (
      <div className="grid min-h-screen place-items-center">
        {bootError || error ? (
          <p className="text-destructive max-w-md px-6 text-center text-sm">
            {bootError ?? error}
          </p>
        ) : (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading the decisioning demo…
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-card/40 border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="text-primary size-6" />
            <div>
              <h1 className="font-semibold leading-tight">Credit Decisioning Rules Engine</h1>
              <p className="text-muted-foreground text-xs">
                One governed loan-decision service. Versioned rules, pinned decisions, a full
                audit trail.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden text-xs sm:inline">Signed in as</span>
            {(["underwriter", "reviewer"] as Role[]).map((role) => (
              <Button
                key={role}
                size="sm"
                variant={session.role === role ? "default" : "outline"}
                onClick={() => switchSigner(role)}
                disabled={busy}
              >
                {DEMO_ACCOUNTS[role].label}
                <span className="ml-1 opacity-70">({role})</span>
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="decision">Decision</TabsTrigger>
            <TabsTrigger value="audit">Audit trail</TabsTrigger>
            <TabsTrigger value="rule-sets">Rule sets</TabsTrigger>
          </TabsList>
          <TabsContent value="applications" className="mt-6">
            <ApplicationsScreen
              applications={applications}
              session={session}
              runningId={runningId}
              onRun={handleRun}
              onView={selectApp}
              onSubmitted={handleSubmitted}
            />
          </TabsContent>
          <TabsContent value="decision" className="mt-6">
            <DecisionScreen
              applicationId={selectedAppId}
              canRun={session.role === "underwriter"}
              running={runningId != null}
              onRun={handleRun}
              refreshKey={refreshKey}
            />
          </TabsContent>
          <TabsContent value="audit" className="mt-6">
            <AuditScreen
              applicants={applicants}
              applicantId={selectedApplicantId}
              onSelect={setSelectedApplicantId}
            />
          </TabsContent>
          <TabsContent value="rule-sets" className="mt-6">
            <RuleSetsScreen />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
