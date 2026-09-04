import { table, f } from "@xanots/sdk";
import { applicants } from "./applicants.js";

// A loan request. `dti` (debt-to-income) is computed at submit from the
// applicant's income and monthly debt. Status flips submitted -> decided when
// the decisioning waterfall runs.
export const applications = table({
  name: "applications",
  schema: {
    applicant_id: f.tableRef(applicants, { required: true }),
    amount_requested: f.int({ required: true }),
    term_months: f.int({ required: true }),
    purpose: f.enum(["personal", "auto", "home_improvement"], {
      required: true,
    }),
    dti: f.decimal({ required: true }),
    status: f.enum(["submitted", "decided"], { required: true }),
  },
  index: [{ type: "btree", fields: [{ name: "applicant_id" }] }],
});
