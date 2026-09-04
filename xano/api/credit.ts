import { apiGroup } from "@xanots/sdk";

// The one governed decisioning service. A pinned canonical keeps the public
// paths stable (api:credit/...) and lets getPath() resolve in the browser
// bundle without a lock file.
export const credit = apiGroup({
  name: "credit",
  canonical: "credit",
  description:
    "Governed loan-decisioning service. Every consuming system posts an application and gets back the same approve, decline, or refer decision, the exact rule that fired, and a queryable audit trail.",
});
