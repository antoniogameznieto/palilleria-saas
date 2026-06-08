"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AppSidebarNavProps = {
  activeCompanyId: string;
};

export function AppSidebarNav({ activeCompanyId }: AppSidebarNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Trabajos",
      href: "/jobs",
      icon: Briefcase,
    },
    {
      label: "Settings",
      href: `/companies/${activeCompanyId}/settings`,
      icon: Settings,
    },
    {
      label: "Usuarios",
      href: "/users",
      icon: Users,
    },
  ] as const;

  return (
    <nav className="flex flex-1 flex-col gap-1 p-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.label === "Settings"
            ? pathname.includes("/companies/") && pathname.endsWith("/settings")
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
