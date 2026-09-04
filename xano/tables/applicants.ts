import { table, f } from "@xanots/sdk";

// The borrower record. One applicant can hold many applications.
export const applicants = table({
  name: "applicants",
  schema: {
    full_name: f.text({ required: true }),
    email: f.email({ required: true }),
    annual_income: f.int({ required: true }),
    employment_status: f.enum(["employed", "self_employed", "unemployed"], {
      required: true,
    }),
    // Total monthly debt payments, held as a whole-currency integer.
    monthly_debt: f.int({ required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
