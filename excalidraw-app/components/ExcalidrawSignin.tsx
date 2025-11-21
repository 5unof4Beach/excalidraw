import useBetterAuth from "excalidraw-app/hooks/useBetterAuth";

export const ExcalidrawSignin = ({ isSignedIn }: { isSignedIn: boolean }) => {
  const data = useBetterAuth();

  return (
    <a
      href={`${import.meta.env.VITE_APP_BETTER_AUTH_URL}/login`}
      target="_blank"
      rel="noopener"
      className="plus-banner"
    >
      {isSignedIn ? "Sign out" : "Sign in"}
    </a>
  );
};
