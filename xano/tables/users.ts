import { table, f } from "@xanots/sdk";

// The auth table. Role backs API-layer RBAC: an underwriter may run and
// override decisions, a reviewer is read-only. Permission is checked in each
// endpoint (see xano/lib/guards.ts), never at the row level.
//
// The two seed rows are DELIBERATELY PUBLIC demo credentials for the ephemeral,
// documented in the README. `f.password` hashes them on write, so they match
// under s.security.check_password exactly like a signed-up account. Deploy with
// --allow-seed-in-static because these fixtures ship on a public static host.
export const users = table({
  name: "users",
  auth: true,
  schema: {
    email: f.email({ required: true }),
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    role: f.enum(["underwriter", "reviewer"], { required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
  seed: [
    {
      email: "dana@lender.example",
      password: "underwriter-demo",
      name: "Dana Okafor",
      role: "underwriter",
    },
    {
      email: "rey@lender.example",
      password: "reviewer-demo",
      name: "Rey Alvarez",
      role: "reviewer",
    },
  ],
});
