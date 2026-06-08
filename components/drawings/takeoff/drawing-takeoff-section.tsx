"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import {
  createTakeoffItemAction,
  updateTakeoffItemAction,
} from "@/lib/actions/takeoff";
import { DeleteTakeoffItemButton } from "@/components/drawings/takeoff/delete-takeoff-item-button";
import { DrawingTakeoffItemForm } from "@/components/drawings/takeoff/drawing-takeoff-item-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SerializedTakeoffItem } from "@/lib/drawings/takeoff";

type DrawingTakeoffSectionProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  items: SerializedTakeoffItem[];
  canEdit: boolean;
};

const initialState: AuthActionState = {};

function formatCell(value: string | null): string {
  if (value == null || value.trim() === "") {
    return "—";
  }

  return value;
}

export function DrawingTakeoffSection({
  companyId,
  jobId,
  drawingId,
  items,
  canEdit,
}: DrawingTakeoffSectionProps) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [createState, createAction, isCreating] = useActionState(
    createTakeoffItemAction,
    initialState,
  );
  const [updateState, updateAction, isUpdating] = useActionState(
    updateTakeoffItemAction,
    initialState,
  );

  useEffect(() => {
    if (createState.success || updateState.success) {
      router.refresh();
    }
  }, [createState.success, router, updateState.success]);

  const editingItem = items.find((item) => item.id === editingItemId) ?? null;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Palillería</CardTitle>
          <CardDescription>
            Líneas de palillería asociadas a este plano. Registro manual por
            ahora, sin extracción automática.
          </CardDescription>
        </div>
        {canEdit ? (
          <Button
            type="button"
            variant={showCreateForm ? "outline" : "default"}
            onClick={() => {
              setShowCreateForm((current) => !current);
              setEditingItemId(null);
            }}
          >
            {showCreateForm ? "Ocultar formulario" : "Añadir línea"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit && showCreateForm ? (
          <DrawingTakeoffItemForm
            companyId={companyId}
            jobId={jobId}
            drawingId={drawingId}
            formAction={createAction}
            submitLabel="Añadir línea"
            pendingLabel="Añadiendo..."
            isPending={isCreating}
            state={createState}
            onCancel={() => setShowCreateForm(false)}
          />
        ) : null}

        {editingItem ? (
          <DrawingTakeoffItemForm
            key={editingItem.id}
            companyId={companyId}
            jobId={jobId}
            drawingId={drawingId}
            takeoffItemId={editingItem.id}
            initialValues={editingItem}
            formAction={updateAction}
            submitLabel="Guardar cambios"
            pendingLabel="Guardando..."
            isPending={isUpdating}
            state={updateState}
            onCancel={() => setEditingItemId(null)}
          />
        ) : null}

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {canEdit
              ? "Todavía no hay líneas de palillería para este plano."
              : "Este plano no tiene líneas de palillería registradas."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Referencia</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Cantidad</th>
                  <th className="px-4 py-3 font-medium">Unidad</th>
                  <th className="px-4 py-3 font-medium">Largo</th>
                  <th className="px-4 py-3 font-medium">Ancho</th>
                  <th className="px-4 py-3 font-medium">Alto</th>
                  <th className="px-4 py-3 font-medium">Notas</th>
                  {canEdit ? (
                    <th className="px-4 py-3 font-medium">Acciones</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCell(item.reference)}
                    </td>
                    <td className="px-4 py-3 font-medium">{item.description}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCell(item.unit)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCell(item.length)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCell(item.width)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCell(item.height)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCell(item.notes)}
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingItemId(item.id);
                              setShowCreateForm(false);
                            }}
                          >
                            Editar
                          </Button>
                          <DeleteTakeoffItemButton
                            companyId={companyId}
                            jobId={jobId}
                            drawingId={drawingId}
                            takeoffItemId={item.id}
                          />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
