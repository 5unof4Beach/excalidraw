import { useCallback } from "react";

import { useSession, logOut } from "../lib/auth-client";

export const useBetterAuth = () => {
  const { data: session, isPending, error, refetch } = useSession();

  const logout = useCallback(async () => {
    return await logOut();
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
