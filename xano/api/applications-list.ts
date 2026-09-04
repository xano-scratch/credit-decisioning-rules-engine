import { query, s, ref, expr, col } from "@xanots/sdk";
import { credit } from "./credit.js";
import { users } from "../tables/users.js";
import { applications } from "../tables/applications.js";
import { applicants } from "../tables/applicants.js";
import { decisions } from "../tables/decisions.js";

// The Applications screen: every application with its applicant and, when one
// exists, its decision outcome. Any signed-in user (underwriter or reviewer)
// may read. Joined columns are projected with eval so the row carries the
// applicant name and the decision outcome.
export const listApplicationsQuery = query({
  name: "applications",
  verb: "GET",
  apiGroup: credit,
  auth: users,
  stack: [
    s.db.query({
      table: applications,
      bind: [
        {
          table: applicants,
          as: "ap",
          join: "left",
          where: expr(col("applicant_id"), "=", col("ap.id")),
        },
        {
          table: decisions,
          as: "dec",
          join: "left",
          where: expr(col("id"), "=", col("dec.application_id")),
        },
      ],
      eval: [
        { name: "ap.full_name", as: "applicant_name" },
        { name: "ap.email", as: "applicant_email" },
        { name: "ap.annual_income", as: "applicant_income" },
        { name: "dec.outcome", as: "decision_outcome" },
        { name: "dec.risk_tier", as: "decision_tier" },
      ],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
