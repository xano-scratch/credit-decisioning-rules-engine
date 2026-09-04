// The one contract: paths and request/response TYPES are derived from the
// xanots query defs, never hand-typed. Change a def and everything here follows.
//
// Types are free (InferInput/InferResponse erase to nothing), so they are
// imported type-only. The def VALUES are imported for getPath()/verb; these
// defs are lean db-op stacks (no agent graph), so the cost is the SDK runtime
// floor, paid once.
import type { InferInput, InferResponse } from "@xanots/sdk";

import { loginQuery } from "../../../xano/api/auth-login.js";
import { listApplicationsQuery } from "../../../xano/api/applications-list.js";
import { submitApplicationQuery } from "../../../xano/api/applications-submit.js";
import { runDecisionQuery } from "../../../xano/api/decisions-run.js";
import { getDecisionQuery } from "../../../xano/api/decisions-get.js";
import { auditQuery } from "../../../xano/api/audit.js";
import { ruleSetsQuery } from "../../../xano/api/rule-sets.js";
import { seedQuery } from "../../../xano/api/seed.js";

/**
 * The deployed Xano backend's base URL. Injected as `window.XANO_HOST` by
 * `xanots deploy <entry> --static <dir>`, or read from `VITE_XANO_HOST` in dev.
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Types derived from the backend ──────────────────────────────────────────
export type LoginBody = InferInput<typeof loginQuery>;
export type LoginResult = InferResponse<typeof loginQuery>;

export type Outcome = "approve" | "decline" | "refer";
export type RiskTier = "A" | "B" | "C" | "D";

// The list rows carry joined columns projected by the endpoint's `eval`, which
// the SDK types as `unknown`; narrow them here at the one boundary.
type ApplicationRow = InferResponse<typeof listApplicationsQuery>[number];
export type Application = ApplicationRow & {
  applicant_name: string;
  applicant_email: string;
  applicant_income: number;
  decision_outcome: Outcome | null;
  decision_tier: RiskTier | null;
};

export type SubmitBody = InferInput<typeof submitApplicationQuery>;
export type SubmitResult = InferResponse<typeof submitApplicationQuery>;
export type RunResult = InferResponse<typeof runDecisionQuery>;
export type DecisionView = InferResponse<typeof getDecisionQuery>;
export type AuditView = InferResponse<typeof auditQuery>;
export type AuditEvent = NonNullable<AuditView["events"]>[number];
export type RuleSet = InferResponse<typeof ruleSetsQuery>[number];

// The thresholds stored in a rule_set's `criteria` json column.
export type Criteria = {
  min_income: number;
  min_amount: number;
  max_amount: number;
  max_dti: number;
  refer_dti: number;
  tier_a_income: number;
  tier_b_income: number;
  tier_c_income: number;
};

// ── Fetch layer ─────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let authToken: string | null = null;
export function setToken(token: string | null): void {
  authToken = token;
}

async function call<T>(path: string, method: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  const res = await fetch(XANO_HOST + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const parsed = JSON.parse(await res.text());
      message = parsed?.message ?? message;
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

// ── Typed endpoint wrappers ─────────────────────────────────────────────────
export const login = (body: LoginBody) =>
  call<LoginResult>(loginQuery.getPath(), loginQuery.verb, body);

export const listApplications = () =>
  call<Application[]>(listApplicationsQuery.getPath(), listApplicationsQuery.verb);

export const submitApplication = (body: SubmitBody) =>
  call<SubmitResult>(submitApplicationQuery.getPath(), submitApplicationQuery.verb, body);

export const runDecision = (application_id: number) =>
  call<RunResult>(runDecisionQuery.getPath(), runDecisionQuery.verb, { application_id });

export const getDecision = (application_id: number) =>
  call<DecisionView>(
    getDecisionQuery.getPath({ params: { application_id } }),
    getDecisionQuery.verb,
  );

export const getAudit = (applicant_id: number) =>
  call<AuditView>(auditQuery.getPath({ params: { applicant_id } }), auditQuery.verb);

export const listRuleSets = () =>
  call<RuleSet[]>(ruleSetsQuery.getPath(), ruleSetsQuery.verb);

export const seed = () => call<unknown>(seedQuery.getPath(), seedQuery.verb);
