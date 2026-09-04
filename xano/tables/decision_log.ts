import { table, f } from "@xanots/sdk";
import { applications } from "./applications.js";

// Append-only audit trail. Every meaningful event on an application lands here
// with the actor and the policy version in force. Rows are never updated or
// deleted, so the history a reviewer reads is the history that happened.
export const decision_log = table({
  name: "decision_log",
  schema: {
    application_id: f.tableRef(applications, { required: true }),
    event: f.enum(["submitted", "evaluated", "overridden", "viewed"], {
      required: true,
    }),
    detail: f.text({ required: true }),
    actor: f.text({ required: true }),
    rule_set_version: f.int({ required: true }),
  },
  index: [{ type: "btree", fields: [{ name: "application_id" }] }],
});
