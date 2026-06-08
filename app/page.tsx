import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
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

      <Link href="/dashboard">
        <Button>Ir al dashboard</Button>
      </Link>
    </div>
  );
}
