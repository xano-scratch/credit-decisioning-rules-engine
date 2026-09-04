import { workspace } from "@xanots/sdk";

import { users } from "./tables/users.js";
import { applicants } from "./tables/applicants.js";
import { applications } from "./tables/applications.js";
import { rule_sets } from "./tables/rule_sets.js";
import { decisions } from "./tables/decisions.js";
import { decision_log } from "./tables/decision_log.js";

import { credit } from "./api/credit.js";

import { evaluateApplication } from "./functions/evaluate-application.js";

import { loginQuery } from "./api/auth-login.js";
import { listApplicationsQuery } from "./api/applications-list.js";
import { submitApplicationQuery } from "./api/applications-submit.js";
import { runDecisionQuery } from "./api/decisions-run.js";
import { getDecisionQuery } from "./api/decisions-get.js";
import { auditQuery } from "./api/audit.js";
import { ruleSetsQuery } from "./api/rule-sets.js";
import { seedQuery } from "./api/seed.js";

/**
 * The Credit Decisioning Rules Engine backend.
 *
 * One governed loan-decision service. The credit waterfall lives in a single
 * function (evaluate_application) that both the API and the seed path call, so
 * every consumer runs identical rules. Each decision is pinned to the policy
 * version that produced it, and an append-only log records what happened under
 * which version. Access is API-layer RBAC (underwriter vs read-only reviewer),
 * never row-level security.
 */
export default workspace("credit-decisioning-rules-engine")
  .registerTables([users, applicants, applications, rule_sets, decisions, decision_log])
  .registerApiGroups([credit])
  .registerFunctions([evaluateApplication])
  .registerQueries([
    loginQuery,
    listApplicationsQuery,
    submitApplicationQuery,
    runDecisionQuery,
    getDecisionQuery,
    auditQuery,
    ruleSetsQuery,
    seedQuery,
  ]);
