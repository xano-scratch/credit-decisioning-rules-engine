import { query, input, s, ref, inp, expr, c } from "@xanots/sdk";
import { credit } from "./credit.js";
import { users } from "../tables/users.js";

// Public login. Mints a bearer token the frontend sends on every other call.
// The password is taken as text (not input.password) so it is not hashed twice
// before security.check_password compares it.
export const loginQuery = query({
  name: "auth/login",
  verb: "POST",
  apiGroup: credit,
  auth: false,
  input: {
    email: input.email({ required: true }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      // password is access:internal, so it must be named to come back.
      output: ["id", "email", "name", "role", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No account matches that email."),
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("u.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
  response: {
    token: ref("token"),
    role: ref("u.role"),
    email: ref("u.email"),
    name: ref("u.name"),
  },
});
