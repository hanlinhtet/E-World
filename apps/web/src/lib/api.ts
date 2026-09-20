import { useAuthStore } from '@/store/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/** Fetch wrapper that injects the access token and transparently refreshes it
 *  once on a 401 using the httpOnly refresh cookie. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const doFetch = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

  let token = useAuthStore.getState().accessToken;
  let res = await doFetch(token);

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      token = refreshed;
      res = await doFetch(token);
    }
  }

  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function refreshAccessToken(): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Network-level failure (server down, CORS, offline). Treat as logged out
    // rather than letting the rejection bubble up as an unhandled error.
    useAuthStore.getState().logout();
    return null;
  }
  if (!res.ok) {
    useAuthStore.getState().logout();
    return null;
  }
  const { accessToken } = (await res.json()) as { accessToken: string };
  useAuthStore.getState().setAccessToken(accessToken);
  return accessToken;
}

export const googleLoginUrl = `${API_URL}/auth/google`;
