import useBetterAuth from "excalidraw-app/hooks/useBetterAuth";

export const ExcalidrawSignin = () => {
  const { session, logout } = useBetterAuth();

  return !session ? (
    <a
      href={`${import.meta.env.VITE_APP_BETTER_AUTH_URL}/login`}
      target="_blank"
      rel="noopener"
      className="plus-banner"
    >
      Sign in
    </a>
  ) : (
    <button
      className="plus-banner"
      onClick={() => {
        logout();
      }}
    >
      Sign out
    </button>
  );
};
