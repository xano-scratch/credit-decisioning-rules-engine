import { s, statements, auth, ref, expr, c } from "@xanots/sdk";
import { users } from "../tables/users.js";

// API-layer RBAC. Reads the caller's role fresh from the auth table and refuses
// the request with 403 when it is not an underwriter. This is middleware-style
// permission checking in the endpoint, NOT row-level security.
//
// Returned via statements() (not a bare Statement[]) so the stack keeps its
// tuple type and later ref()s still infer. The two statements bind `me`, which
// callers read for the acting user's email.
export function requireUnderwriter() {
  return statements(
    s.db.get_by_id({
      table: users,
      id: auth("id"),
      output: ["id", "email", "role"],
      as: "me",
    }),
    s.precondition({
      expr: expr(ref("me.role"), "=", c.text("underwriter")),
      error_type: "accessdenied",
      error: c.text(
        "Underwriters can run and override decisions. This account is read-only.",
      ),
    }),
  );
}
