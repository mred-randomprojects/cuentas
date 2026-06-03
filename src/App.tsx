import { Loader2 } from "lucide-react";
import { useAuth } from "./auth";
import { isEmailAllowed } from "./allowlist";
import { LoginPage } from "./components/LoginPage";
import { NotAuthorized } from "./components/NotAuthorized";
import { AppShell } from "./components/AppShell";
import { ToastProvider } from "./components/Toast";

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Loader2 className="size-7 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (user == null) return <LoginPage />;
  if (!isEmailAllowed(user.email)) return <NotAuthorized />;

  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
