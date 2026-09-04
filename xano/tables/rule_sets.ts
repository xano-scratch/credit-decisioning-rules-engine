import { table, f } from "@xanots/sdk";

// A versioned credit policy. Exactly one row is active at a time. `criteria`
// holds the ordered tier thresholds the waterfall reads: an income floor, a
// requested-amount band, a DTI ceiling and referral band, and the income cuts
// for the approved risk tiers. Versioning it means every decision can be traced
// to the exact policy that produced it.
export const rule_sets = table({
  name: "rule_sets",
  schema: {
    version: f.int({ required: true }),
    name: f.text({ required: true }),
    is_active: f.bool({ required: true }),
    effective_at: f.timestamp({ required: true }),
    criteria: f.json({ required: true }),
  },
  index: [{ type: "btree", fields: [{ name: "is_active" }] }],
});
