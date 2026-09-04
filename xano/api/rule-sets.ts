import { query, s, ref } from "@xanots/sdk";
import { credit } from "./credit.js";
import { users } from "../tables/users.js";
import { rule_sets } from "../tables/rule_sets.js";

// The Rule sets screen. Lists every policy version, newest first, so a reviewer
// can see how policy evolved and which version is active. Any signed-in user
// may read.
export const ruleSetsQuery = query({
  name: "rule-sets",
  verb: "GET",
  apiGroup: credit,
  auth: users,
  stack: [
    s.db.query({
      table: rule_sets,
      sort: [{ sortBy: "version", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
