import { query, input, s, ref, inp, expr, col, c } from "@xanots/sdk";
import { credit } from "./credit.js";
import { users } from "../tables/users.js";
import { applications } from "../tables/applications.js";
import { applicants } from "../tables/applicants.js";
import { decisions } from "../tables/decisions.js";
import { rule_sets } from "../tables/rule_sets.js";

// The Decision screen. Returns the decision with its outcome, risk tier, the
// exact rule that fired, and the rule_set it was pinned to, plus the
// application and applicant for context. Any signed-in user may read.
export const getDecisionQuery = query({
  name: "decisions/{application_id}",
  verb: "GET",
  apiGroup: credit,
  auth: users,
  input: { application_id: input.int({ required: true }) },
  stack: [
    s.db.query({
      table: decisions,
      where: expr(col("application_id"), "=", inp("application_id")),
      returnType: "single",
      as: "decision",
    }),
    s.precondition({
      expr: expr(ref("decision"), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No decision has been recorded for this application yet."),
    }),
    s.db.get_by_id({ table: rule_sets, id: ref("decision.rule_set_id"), as: "rule_set" }),
    s.db.get_by_id({ table: applications, id: inp("application_id"), as: "application" }),
    s.db.get_by_id({ table: applicants, id: ref("application.applicant_id"), as: "applicant" }),
  ],
  response: {
    decision: ref("decision"),
    rule_set: ref("rule_set"),
    application: ref("application"),
    applicant: ref("applicant"),
  },
});
