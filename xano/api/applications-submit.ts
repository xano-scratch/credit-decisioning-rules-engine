import { query, input, s, ref, inp, expr, c, withFilters, fl } from "@xanots/sdk";
import { credit } from "./credit.js";
import { users } from "../tables/users.js";
import { applicants } from "../tables/applicants.js";
import { applications } from "../tables/applications.js";
import { decision_log } from "../tables/decision_log.js";
import { requireUnderwriter } from "../lib/guards.js";

// Underwriter-only. Matches or creates the applicant by email, computes DTI
// from income and monthly debt, opens the application in `submitted`, and
// writes the first audit entry. Running the decision is a separate call.
export const submitApplicationQuery = query({
  name: "applications/submit",
  verb: "POST",
  apiGroup: credit,
  auth: users,
  input: {
    full_name: input.text({ required: true }),
    email: input.email({ required: true }),
    annual_income: input.int({ required: true }),
    employment_status: input.enum(["employed", "self_employed", "unemployed"], {
      required: true,
    }),
    monthly_debt: input.int({ required: true }),
    amount_requested: input.int({ required: true }),
    term_months: input.int({ required: true }),
    purpose: input.enum(["personal", "auto", "home_improvement"], { required: true }),
  },
  stack: [
    ...requireUnderwriter(),
    s.precondition({
      expr: expr(inp("annual_income"), ">", c.int(0)),
      error_type: "inputerror",
      error: c.text("Annual income must be greater than zero."),
    }),
    // Upsert the applicant by email so a repeat borrower keeps one record with
    // their latest financials.
    s.db.add_or_edit({
      table: applicants,
      fieldName: "email",
      fieldValue: inp("email"),
      row: {
        full_name: inp("full_name"),
        email: inp("email"),
        annual_income: inp("annual_income"),
        employment_status: inp("employment_status"),
        monthly_debt: inp("monthly_debt"),
      },
      as: "applicant",
    }),
    // DTI = (monthly_debt * 12) / annual_income, held to four decimal places.
    s.set_var(
      "dti",
      withFilters(inp("monthly_debt"), fl.mul(12), fl.div(inp("annual_income")), fl.round(4)),
    ),
    s.db.add({
      table: applications,
      row: {
        applicant_id: ref("applicant.id"),
        amount_requested: inp("amount_requested"),
        term_months: inp("term_months"),
        purpose: inp("purpose"),
        dti: ref("dti"),
        status: "submitted",
      },
      as: "app",
    }),
    s.db.add({
      table: decision_log,
      row: {
        application_id: ref("app.id"),
        event: "submitted",
        detail: c.text("Application submitted and debt-to-income computed."),
        actor: ref("me.email"),
        rule_set_version: c.int(0),
      },
    }),
  ],
  response: {
    application: ref("app"),
    applicant: ref("applicant"),
    dti: ref("dti"),
  },
});
