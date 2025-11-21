import { createAuthClient } from "better-auth/react";

const baseURL = import.meta.env.VITE_APP_BETTER_AUTH_URL || null;

export const authClient = createAuthClient({
  baseURL,
});

export const { signOut, useSession, getAccessToken } = authClient;
