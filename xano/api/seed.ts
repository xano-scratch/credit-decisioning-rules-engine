import { query, s, ref, c, withFilters, fl } from "@xanots/sdk";
import { credit } from "./credit.js";
import { applicants } from "../tables/applicants.js";
import { applications } from "../tables/applications.js";
import { rule_sets } from "../tables/rule_sets.js";
import { decisions } from "../tables/decisions.js";
import { decision_log } from "../tables/decision_log.js";
import { evaluateApplication } from "../functions/evaluate-application.js";

// Public bootstrap so the ephemeral is browsable on first open. Idempotent:
// it resets the domain tables (NOT users, so a live token survives a re-seed)
// and rebuilds a demo book. The decided applications run through the SAME
// evaluate_application function the API uses, so the seeded decisions are
// exactly what the live logic produces.

const dtiOf = (debt: number, income: number) =>
  withFilters(c.int(debt), fl.mul(12), fl.div(income), fl.round(4));

const addApplicant = (
  as: string,
  full_name: string,
  email: string,
  annual_income: number,
  employment_status: "employed" | "self_employed" | "unemployed",
  monthly_debt: number,
) =>
  s.db.add({
    table: applicants,
    row: { full_name, email, annual_income, employment_status, monthly_debt },
    as,
  });

const addApp = (
  as: string,
  applicantVar: string,
  amount_requested: number,
  term_months: number,
  purpose: "personal" | "auto" | "home_improvement",
  debt: number,
  income: number,
) =>
  s.db.add({
    table: applications,
    row: {
      applicant_id: ref(`${applicantVar}.id`),
      amount_requested,
      term_months,
      purpose,
      dti: dtiOf(debt, income),
      status: "submitted",
    },
    as,
  });

const submittedLog = (appVar: string) =>
  s.db.add({
    table: decision_log,
    row: {
      application_id: ref(`${appVar}.id`),
      event: "submitted",
      detail: c.text("Application submitted and debt-to-income computed."),
      actor: c.text("system@seed"),
      rule_set_version: c.int(0),
    },
  });

const decide = (appVar: string) =>
  s.function.run({
    fn: evaluateApplication,
    input: { application_id: ref(`${appVar}.id`), actor: c.text("system@seed") },
  });

export const seedQuery = query({
  name: "seed",
  verb: "GET",
  apiGroup: credit,
  auth: false,
  stack: [
    // Reset the domain tables, children before parents. Users are left alone.
    s.db.truncate({ table: decision_log, reset: true }),
    s.db.truncate({ table: decisions, reset: true }),
    s.db.truncate({ table: applications, reset: true }),
    s.db.truncate({ table: applicants, reset: true }),
    s.db.truncate({ table: rule_sets, reset: true }),

    // Two policy versions. v2 is active; v1 is the stricter prior vintage kept
    // so a reviewer can see how policy evolved.
    s.db.add({
      table: rule_sets,
      row: {
        version: 1,
        name: "Policy v1 (prior vintage)",
        is_active: false,
        effective_at: 1704067200000,
        criteria: c.obj({
          min_income: 50000,
          min_amount: 2000,
          max_amount: 40000,
          max_dti: 0.36,
          refer_dti: 0.3,
          tier_a_income: 130000,
          tier_b_income: 90000,
          tier_c_income: 55000,
        }),
      },
      as: "rs1",
    }),
    s.db.add({
      table: rule_sets,
      row: {
        version: 2,
        name: "Policy v2 (current)",
        is_active: true,
        effective_at: 1735689600000,
        criteria: c.obj({
          min_income: 40000,
          min_amount: 2000,
          max_amount: 50000,
          max_dti: 0.43,
          refer_dti: 0.36,
          tier_a_income: 120000,
          tier_b_income: 80000,
          tier_c_income: 50000,
        }),
      },
      as: "rs2",
    }),

    // Applicants.
    addApplicant("a1", "Maya Chen", "maya.chen@example.com", 150000, "employed", 1500),
    addApplicant("a2", "Sam Rivera", "sam.rivera@example.com", 85000, "employed", 1800),
    addApplicant("a3", "Jordan Blake", "jordan.blake@example.com", 60000, "self_employed", 2000),
    addApplicant("a4", "Priya Nair", "priya.nair@example.com", 32000, "employed", 500),
    addApplicant("a5", "Chris Okoro", "chris.okoro@example.com", 70000, "employed", 3000),
    addApplicant("a6", "Dana Lewis", "dana.lewis@example.com", 88000, "employed", 2200),
    addApplicant("a7", "Lee Park", "lee.park@example.com", 95000, "employed", 1200),
    addApplicant("a8", "Tomas Ruiz", "tomas.ruiz@example.com", 45000, "self_employed", 1600),

    // Decided applications, run through the shared waterfall against active v2:
    // approve A, approve B, refer C, decline D (income floor), decline D (DTI).
    addApp("app1", "a1", 20000, 48, "auto", 1500, 150000),
    submittedLog("app1"),
    decide("app1"),
    addApp("app2", "a2", 15000, 36, "home_improvement", 1800, 85000),
    submittedLog("app2"),
    decide("app2"),
    addApp("app3", "a3", 12000, 24, "personal", 2000, 60000),
    submittedLog("app3"),
    decide("app3"),
    addApp("app4", "a4", 8000, 24, "personal", 500, 32000),
    submittedLog("app4"),
    decide("app4"),
    addApp("app5", "a5", 10000, 36, "personal", 3000, 70000),
    submittedLog("app5"),
    decide("app5"),

    // A historical decision recorded under Policy v1, so the decision view and
    // audit trail show a decision pinned to an older version.
    addApp("app6", "a6", 30000, 60, "home_improvement", 2200, 88000),
    submittedLog("app6"),
    s.db.add({
      table: decisions,
      row: {
        application_id: ref("app6.id"),
        rule_set_id: ref("rs1.id"),
        outcome: "approve",
        fired_rule: c.text(
          "Approved under Policy v1: cleared the stricter income floor and the tighter DTI ceiling.",
        ),
        reason: c.text(
          "Historical decision retained under the policy version that was active at the time.",
        ),
        risk_tier: "C",
      },
    }),
    s.db.edit({
      table: applications,
      fieldName: "id",
      fieldValue: ref("app6.id"),
      row: { status: "decided" },
    }),
    s.db.add({
      table: decision_log,
      row: {
        application_id: ref("app6.id"),
        event: "evaluated",
        detail: c.text(
          "Approved under Policy v1: cleared the stricter income floor and the tighter DTI ceiling.",
        ),
        actor: c.text("system@seed"),
        rule_set_version: c.int(1),
      },
    }),

    // Two applications left open so the live demo can run a decision:
    // app7 approves at tier B, app8 refers.
    addApp("app7", "a7", 25000, 48, "auto", 1200, 95000),
    submittedLog("app7"),
    addApp("app8", "a8", 5000, 12, "personal", 1600, 45000),
    submittedLog("app8"),
  ],
  response: { seeded: c.bool(true), rule_sets: c.int(2), applications: c.int(8) },
});
