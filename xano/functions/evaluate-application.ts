import { defineFunction, s, ref, inp, expr, col, c, withFilters, fl, input } from "@xanots/sdk";
import { applications } from "../tables/applications.js";
import { applicants } from "../tables/applicants.js";
import { rule_sets } from "../tables/rule_sets.js";
import { decisions } from "../tables/decisions.js";
import { decision_log } from "../tables/decision_log.js";

// THE governed credit waterfall, defined ONCE. Both POST decisions/run and the
// seed endpoint call it via s.function.run, so every consumer runs identical
// rules. The waterfall reads the SINGLE active rule_set, so changing policy is a
// data change (a new active version), not a code change, and each decision is
// pinned to the exact version that produced it.
//
// Order: income floor -> requested-amount band -> DTI ceiling -> DTI referral
// band -> approve with a risk tier by income. The caller guarantees the
// application is still `submitted`.
const verdict = (outcome: string, tier: string, fired: string, reason: string) => [
  s.update_var("outcome", c.text(outcome)),
  s.update_var("risk_tier", c.text(tier)),
  s.update_var("fired_rule", c.text(fired)),
  s.update_var("reason", c.text(reason)),
];

export const evaluateApplication = defineFunction({
  name: "evaluate_application",
  description:
    "The governed credit-decisioning waterfall. Reads the active rule_set, determines approve/decline/refer with a risk tier and the exact rule that fired, persists a decision pinned to that policy version, flips the application to decided, and writes an audit entry.",
  input: {
    application_id: input.int({ required: true }),
    actor: input.text({ required: true }),
  },
  stack: [
    // Load the application, applicant, and the one active policy. Guard each so
    // an unknown id fails cleanly (404) rather than drilling into a null row.
    s.db.get_by_id({ table: applications, id: inp("application_id"), as: "app" }),
    s.precondition({
      expr: expr(ref("app"), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Application not found."),
    }),
    s.db.get_by_id({ table: applicants, id: ref("app.applicant_id"), as: "applicant" }),
    s.precondition({
      expr: expr(ref("applicant"), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Applicant not found."),
    }),
    s.db.query({
      table: rule_sets,
      where: expr(col("is_active"), "=", c.bool(true)),
      returnType: "single",
      as: "rs",
    }),
    s.precondition({
      expr: expr(ref("rs"), "!=", c.null()),
      error_type: "standard",
      error: c.text("No active credit policy is configured."),
    }),

    // Pull the thresholds out of the active policy's criteria, coerced to
    // numbers so the comparisons below are numeric.
    s.set_var("min_income", withFilters(ref("rs.criteria.min_income"), fl.to_decimal())),
    s.set_var("min_amount", withFilters(ref("rs.criteria.min_amount"), fl.to_decimal())),
    s.set_var("max_amount", withFilters(ref("rs.criteria.max_amount"), fl.to_decimal())),
    s.set_var("max_dti", withFilters(ref("rs.criteria.max_dti"), fl.to_decimal())),
    s.set_var("refer_dti", withFilters(ref("rs.criteria.refer_dti"), fl.to_decimal())),
    s.set_var("tier_a_income", withFilters(ref("rs.criteria.tier_a_income"), fl.to_decimal())),
    s.set_var("tier_b_income", withFilters(ref("rs.criteria.tier_b_income"), fl.to_decimal())),

    // Default verdict: approve at tier C. Each waterfall step overrides it.
    s.set_var("outcome", c.text("approve")),
    s.set_var("risk_tier", c.text("C")),
    s.set_var(
      "fired_rule",
      c.text("Approved: passed the income floor, the amount band, and the DTI ceiling."),
    ),
    s.set_var(
      "reason",
      c.text("Meets the active policy on income, requested amount, and debt-to-income."),
    ),

    s.conditional({
      when: expr(ref("applicant.annual_income"), "<", ref("min_income")),
      then: verdict(
        "decline",
        "D",
        "Income floor: annual income is below the policy minimum.",
        "Declined at the income floor. Annual income does not meet the active policy minimum.",
      ),
      elif: [
        {
          when: expr(ref("app.amount_requested"), "<", ref("min_amount")),
          then: verdict(
            "decline",
            "D",
            "Amount band: requested amount is below the policy minimum.",
            "Declined on the amount band. The request is smaller than the policy allows.",
          ),
        },
        {
          when: expr(ref("app.amount_requested"), ">", ref("max_amount")),
          then: verdict(
            "refer",
            "C",
            "Amount band: requested amount is above the automated ceiling.",
            "Referred for manual review. The request is larger than the automated band.",
          ),
        },
        {
          when: expr(ref("app.dti"), ">", ref("max_dti")),
          then: verdict(
            "decline",
            "D",
            "DTI ceiling: debt-to-income is above the policy maximum.",
            "Declined at the DTI ceiling. Debt-to-income is above the active policy maximum.",
          ),
        },
        {
          when: expr(ref("app.dti"), ">", ref("refer_dti")),
          then: verdict(
            "refer",
            "C",
            "DTI referral band: debt-to-income is in the manual-review range.",
            "Referred for manual review. Debt-to-income falls in the referral band.",
          ),
        },
      ],
      // Approved. Keep the approve verdict and refine the risk tier by income.
      else: [
        s.conditional({
          when: expr(ref("applicant.annual_income"), ">=", ref("tier_a_income")),
          then: [s.update_var("risk_tier", c.text("A"))],
          elif: [
            {
              when: expr(ref("applicant.annual_income"), ">=", ref("tier_b_income")),
              then: [s.update_var("risk_tier", c.text("B"))],
            },
          ],
          else: [s.update_var("risk_tier", c.text("C"))],
        }),
      ],
    }),

    // Persist the decision pinned to the active policy version, flip the
    // application to decided, and append the audit entry.
    s.db.add({
      table: decisions,
      row: {
        application_id: ref("app.id"),
        rule_set_id: ref("rs.id"),
        outcome: ref("outcome"),
        fired_rule: ref("fired_rule"),
        reason: ref("reason"),
        risk_tier: ref("risk_tier"),
      },
      as: "decision",
    }),
    s.db.edit({
      table: applications,
      fieldName: "id",
      fieldValue: ref("app.id"),
      row: { status: "decided" },
    }),
    s.db.add({
      table: decision_log,
      row: {
        application_id: ref("app.id"),
        event: "evaluated",
        detail: ref("fired_rule"),
        actor: inp("actor"),
        rule_set_version: ref("rs.version"),
      },
    }),
  ],
  response: {
    decision: ref("decision"),
    rule_set_version: ref("rs.version"),
    rule_set_name: ref("rs.name"),
  },
});
