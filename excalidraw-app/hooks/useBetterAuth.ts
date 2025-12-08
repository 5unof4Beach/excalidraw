import { useCallback } from "react";

import { useSession, signOut } from "../lib/auth-client";

export const useBetterAuth = () => {
  const { data: session, isPending, error, refetch } = useSession();

  const logout = useCallback(async (opts?: any) => {
    return await signOut(opts as any);
  }, []);

  return {
    session,
    isPending,
    error,
    refetch,
    logout,
  };
};

export default useBetterAuth;
