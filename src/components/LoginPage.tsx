import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { useAuth } from "../auth";
import { GoogleIcon } from "./GoogleIcon";
import { BrandMark } from "./BrandMark";

export function LoginPage() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signIn();
    } catch (e: unknown) {
      if (e instanceof FirebaseError && e.code === "auth/popup-closed-by-user") {
        setSigningIn(false);
        return;
      }
      const code = e instanceof FirebaseError ? e.code : "desconocido";
      setError(`No se pudo iniciar sesión (${code}). Revisá la configuración de Firebase.`);
      setSigningIn(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-7 text-center">
        <div className="flex flex-col items-center gap-4">
          <BrandMark className="size-16 text-3xl" />
          <div>
            <h1 className="font-serif text-4xl font-bold tracking-tight">cuentas</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Gastos, entradas y saldos del pozo compartido.
            </p>
          </div>
        </div>

        <p className="max-w-xs text-sm text-muted-foreground">
          Iniciá sesión con tu cuenta de Google para acceder a tus cuentas y
          mantenerlas sincronizadas entre tus dispositivos.
        </p>

        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
        >
          <GoogleIcon />
          {signingIn ? "Iniciando sesión…" : "Iniciar sesión con Google"}
        </button>

        {error != null && (
          <p className="max-w-xs text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
