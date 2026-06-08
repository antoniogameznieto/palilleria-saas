import { Wrench } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { AppSidebarNav } from "@/components/layout/app-sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type AppShellProps = {
  children: React.ReactNode;
  user: {
    name: string | null;
    email: string;
  };
  activeCompany: {
    id: string;
    name: string;
    taxName: string | null;
  };
  membershipRole: string;
};

export function AppShell({
  children,
  user,
  activeCompany,
  membershipRole,
}: AppShellProps) {
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
              {activeCompany.name}
            </p>
            {activeCompany.taxName ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {activeCompany.taxName}
              </p>
            ) : null}
            <Badge variant="secondary" className="mt-2 capitalize">
              {membershipRole}
            </Badge>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div>
            <p className="text-sm text-muted-foreground">Sesión activa</p>
            <h1 className="text-lg font-semibold tracking-tight">
              {user.name ?? user.email}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{user.email}</Badge>
            <LogoutButton />
          </div>
        </header>

        <Separator />

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
