import { table, f } from "@xanots/sdk";
import { applications } from "./applications.js";
import { rule_sets } from "./rule_sets.js";

// One decision per application, pinned to the rule_set version that produced it.
// `fired_rule` is the human-readable rule that determined the outcome, so a
// reviewer can read exactly why the decision came out the way it did.
export const decisions = table({
  name: "decisions",
  schema: {
    application_id: f.tableRef(applications, { required: true }),
    rule_set_id: f.tableRef(rule_sets, { required: true }),
    outcome: f.enum(["approve", "decline", "refer"], { required: true }),
    fired_rule: f.text({ required: true }),
    reason: f.text({ required: true }),
    risk_tier: f.enum(["A", "B", "C", "D"], { required: true }),
  },
  index: [{ type: "btree", fields: [{ name: "application_id" }] }],
});
