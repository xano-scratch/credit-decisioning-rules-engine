import { query, input, s, ref, inp, expr, col } from "@xanots/sdk";
import { credit } from "./credit.js";
import { users } from "../tables/users.js";
import { decision_log } from "../tables/decision_log.js";
import { applications } from "../tables/applications.js";
import { applicants } from "../tables/applicants.js";

// The Audit trail screen. Returns the ordered event history for every
// application belonging to an applicant, joined so each event carries the
// requested amount and purpose of its application. Any signed-in user may read.
export const auditQuery = query({
  name: "audit/{applicant_id}",
  verb: "GET",
  apiGroup: credit,
  auth: users,
  input: { applicant_id: input.int({ required: true }) },
  stack: [
    s.db.query({
      table: decision_log,
      bind: [
        {
          table: applications,
          as: "app",
          join: "inner",
          where: expr(col("application_id"), "=", col("app.id")),
        },
      ],
      where: expr(col("app.applicant_id"), "=", inp("applicant_id")),
      eval: [
        { name: "app.amount_requested", as: "application_amount" },
        { name: "app.purpose", as: "application_purpose" },
      ],
      sort: [{ sortBy: "created_at", dir: "asc" }],
      as: "events",
    }),
    s.db.get_by_id({ table: applicants, id: inp("applicant_id"), as: "applicant" }),
  ],
  response: {
    events: ref("events"),
    applicant: ref("applicant"),
  },
});
