import { query, input, s, ref, inp, expr, c } from "@xanots/sdk";
import { credit } from "./credit.js";
import { users } from "../tables/users.js";
import { applications } from "../tables/applications.js";
import { evaluateApplication } from "../functions/evaluate-application.js";
import { requireUnderwriter } from "../lib/guards.js";

// Underwriter-only. Runs the governed waterfall against the single active
// policy by delegating to the shared evaluate_application function, so this
// endpoint and the seed path run identical rules. Guards a missing or
// already-decided application before doing any work.
export const runDecisionQuery = query({
  name: "decisions/run",
  verb: "POST",
  apiGroup: credit,
  auth: users,
  input: { application_id: input.int({ required: true }) },
  stack: [
    ...requireUnderwriter(),
    s.db.get_by_id({ table: applications, id: inp("application_id"), as: "app" }),
    s.precondition({
      expr: expr(ref("app"), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Application not found."),
    }),
    s.precondition({
      expr: expr(ref("app.status"), "=", c.text("submitted")),
      error_type: "badrequest",
      error: c.text("This application has already been decided."),
    }),
    s.function.run({
      fn: evaluateApplication,
      input: { application_id: inp("application_id"), actor: ref("me.email") },
      as: "result",
    }),
  ],
  response: ref("result"),
});
