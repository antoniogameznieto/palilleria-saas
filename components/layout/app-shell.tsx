import { Wrench } from "lucide-react";

import { AppSidebarNav } from "@/components/layout/app-sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Wrench className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Palillería SaaS</p>
            <p className="truncate text-xs text-muted-foreground">
              Ingeniería de tuberías
            </p>
          </div>
        </div>

        <AppSidebarNav />

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-md border border-sidebar-border bg-background/60 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Empresa activa
            </p>
            <p className="mt-1 truncate text-sm font-medium">
              Sin empresa seleccionada
            </p>
            <Badge variant="secondary" className="mt-2">
              Sprint 1
            </Badge>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div>
            <p className="text-sm text-muted-foreground">Área de trabajo</p>
            <h1 className="text-lg font-semibold tracking-tight">
              Panel principal
            </h1>
          </div>
          <Badge variant="outline">MVP en construcción</Badge>
        </header>

        <Separator />

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
