"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DrawingDetailTab = "resumen" | "metadatos" | "automatizacion" | "actividad";

const TAB_OPTIONS: Array<{ id: DrawingDetailTab; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "metadatos", label: "Metadatos" },
  { id: "automatizacion", label: "Automatización" },
  { id: "actividad", label: "Actividad" },
];

type DrawingDetailWorkspaceProps = {
  pdf: ReactNode;
  resumen: ReactNode;
  metadatos: ReactNode;
  automatizacion: ReactNode;
  actividad: ReactNode;
};

export function DrawingDetailWorkspace({
  pdf,
  resumen,
  metadatos,
  automatizacion,
  actividad,
}: DrawingDetailWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<DrawingDetailTab>("resumen");

  const tabContent: Record<DrawingDetailTab, ReactNode> = {
    resumen,
    metadatos,
    automatizacion,
    actividad,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)] lg:items-start">
      <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">{pdf}</div>

      <Card className="min-w-0">
        <CardHeader className="border-b pb-3">
          <div className="-mx-1 flex flex-nowrap gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
            {TAB_OPTIONS.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                size="xs"
                variant={activeTab === tab.id ? "default" : "outline"}
                className="shrink-0 whitespace-nowrap"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent
          className={cn("pt-4", "max-h-[calc(85vh-4rem)] overflow-y-auto")}
        >
          {tabContent[activeTab]}
        </CardContent>
      </Card>
    </div>
  );
}
