import { ShieldAlert } from "lucide-react";
import { useAuth } from "../auth";
import { Button } from "./ui/button";

export function NotAuthorized() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className="grid size-14 place-items-center rounded-full bg-[hsl(var(--negative-soft))] text-[hsl(var(--negative))]">
          <ShieldAlert className="size-7" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold">Cuenta sin acceso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            La cuenta{" "}
            <span className="font-semibold text-foreground">{user?.email}</span>{" "}
            no está habilitada para usar esta herramienta. Pedile al
            administrador que te agregue a la lista de acceso.
          </p>
        </div>
        <Button variant="outline" onClick={() => void signOut()}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
