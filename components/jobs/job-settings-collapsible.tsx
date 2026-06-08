"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { JobSettings } from "@prisma/client";

import { JobSettingsSummary } from "@/components/jobs/job-settings-summary";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type JobSettingsCollapsibleProps = {
  settings: JobSettings;
};

export function JobSettingsCollapsible({
  settings,
}: JobSettingsCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b pb-3">
        <div>
          <CardTitle className="text-base">Settings de palillería</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Criterios de longitud, unidad y reglas de exportación.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
        >
          {isOpen ? "Ocultar" : "Ver settings"}
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              isOpen ? "rotate-180" : undefined,
            )}
          />
        </Button>
      </CardHeader>

      {isOpen ? (
        <CardContent className="pt-4">
          <JobSettingsSummary settings={settings} plain />
        </CardContent>
      ) : null}
    </Card>
  );
}
