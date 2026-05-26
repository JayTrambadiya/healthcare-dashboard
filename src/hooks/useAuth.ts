import { useEffect, useState } from "react";
import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signInWithRedirect,
  signOut,
} from "aws-amplify/auth";
import { API_BASE_URL } from "../constants.ts";

type AuthUser = Awaited<ReturnType<typeof getCurrentUser>>;

type AuthFetchOptions = RequestInit & {
  headers?: Record<string, string>;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Email + password login
  async function loginWithEmail(email: string, password: string) {
    const result = await signIn({
      username: email,
      password,
    });

    const currentUser = await getCurrentUser();
    setUser(currentUser);

    return result;
  }

  // Google OAuth — redirects to Cognito hosted UI
  function loginWithGoogle(): void {
    signInWithRedirect({ provider: "Google" });
  }

  async function logout(): Promise<void> {
    await signOut();
    setUser(null);
  }

  // Returns the JWT accessToken to attach to API calls
  async function getToken(): Promise<string | undefined> {
    const session = await fetchAuthSession();

    return session.tokens?.accessToken?.toString();
  }

  // Authenticated fetch wrapper
  async function authFetch(
    path: string,
    options: AuthFetchOptions = {},
  ): Promise<Response> {
    const token = await getToken();

    const base = API_BASE_URL as string;

    return fetch(base + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...options.headers,
      },
    });
  }

  return {
    user,
    loading,
    loginWithEmail,
    loginWithGoogle,
    logout,
    getToken,
    authFetch,
  };
}