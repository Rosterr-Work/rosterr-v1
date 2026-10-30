import { useCallback, useEffect, useState } from "react";

// The token that goes in the X-CSRF-Token header of requests that change something. It lasts a while, so it is fetched again
// every half hour. Signed-out visitors (the login page, for one) have none, and that isn't an error.

const REFRESH_MS = 30 * 60 * 1000;

type CsrfState = { token: string | null; loading: boolean; error: Error | null };

async function requestToken(): Promise<string | null> {
  const res = await fetch("/api/csrf-token");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Failed to fetch CSRF token: ${res.statusText}`);
  const body = await res.json();
  if (!body.success || !body.token) throw new Error(body.error || "Failed to get CSRF token");
  return body.token as string;
}

export function useCsrfToken() {
  const [state, setState] = useState<CsrfState>({ token: null, loading: true, error: null });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const token = await requestToken();
      setState({ token, loading: false, error: null });
    } catch (e) {
      const error = e instanceof Error ? e : new Error("Unknown error");
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { token: state.token, loading: state.loading, error: state.error, refresh };
}

/** Fetch options with the token added as a header (unchanged when there is no token). */
export function withCsrfToken(token: string | null, options: RequestInit = {}): RequestInit {
  if (!token) return options;
  return { ...options, headers: { ...options.headers, "X-CSRF-Token": token } };
}
