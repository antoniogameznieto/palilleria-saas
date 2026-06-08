import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getCurrentUser, getPostLoginRedirect } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(await getPostLoginRedirect(user.id));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Palillería SaaS
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Plataforma para ingenieros que generan hoja de palillería e isos
          trameados a partir de planos isométricos de tuberías.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/login">
          <Button>Iniciar sesión</Button>
        </Link>
        <Link href="/register">
          <Button variant="outline">Crear cuenta</Button>
        </Link>
      </div>
    </div>
  );
}
