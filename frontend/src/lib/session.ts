import { useCallback, useState } from "react";
import { login, setToken } from "./api";

export type Role = "underwriter" | "reviewer";

// The two seeded demo accounts. The signer switch logs in as one of them so the
// API-layer RBAC rule (an underwriter may run and override, a reviewer is
// read-only) is visible without a login form.
export const DEMO_ACCOUNTS: Record<
  Role,
  { email: string; password: string; label: string }
> = {
  underwriter: {
    email: "dana@lender.example",
    password: "underwriter-demo",
    label: "Dana Okafor",
  },
  reviewer: {
    email: "rey@lender.example",
    password: "reviewer-demo",
    label: "Rey Alvarez",
  },
};

export type Session = { token: string; role: Role; email: string; name: string };

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInAs = useCallback(async (role: Role): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const acct = DEMO_ACCOUNTS[role];
      const result = await login({ email: acct.email, password: acct.password });
      setToken(String(result.token));
      setSession({
        token: String(result.token),
        role,
        email: String(result.email),
        name: String(result.name),
      });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { session, busy, error, signInAs };
}
