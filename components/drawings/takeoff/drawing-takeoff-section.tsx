"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import {
  createTakeoffItemAction,
  updateTakeoffItemAction,
} from "@/lib/actions/takeoff";
import { DeleteTakeoffItemButton } from "@/components/drawings/takeoff/delete-takeoff-item-button";
import { DuplicateTakeoffItemButton } from "@/components/drawings/takeoff/duplicate-takeoff-item-button";
import { ExportTakeoffCsvButton } from "@/components/drawings/takeoff/export-takeoff-csv-button";
import { ImportTakeoffCsvButton } from "@/components/drawings/takeoff/import-takeoff-csv-button";
import { DrawingTakeoffItemForm } from "@/components/drawings/takeoff/drawing-takeoff-item-form";
import { DrawingTakeoffSummary } from "@/components/drawings/takeoff/drawing-takeoff-summary";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildTakeoffUnitFilterOptions,
  filterAndSortTakeoffItems,
  TAKEOFF_SORT_DIRECTION_OPTIONS,
  TAKEOFF_SORT_FIELD_OPTIONS,
  TAKEOFF_UNIT_FILTER_ALL,
  type TakeoffSortDirection,
  type TakeoffSortField,
} from "@/lib/drawings/filter-takeoff-items";
import type { SerializedTakeoffItem } from "@/lib/drawings/takeoff";
import { buildTakeoffSummary } from "@/lib/drawings/takeoff-summary";

type DrawingTakeoffSectionProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  drawingNumber: string | null;
  items: SerializedTakeoffItem[];
  canEdit: boolean;
};

const initialState: AuthActionState = {};

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
  drawingNumber,
  items,
  canEdit,
}: DrawingTakeoffSectionProps) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState(TAKEOFF_UNIT_FILTER_ALL);
  const [sortField, setSortField] = useState<TakeoffSortField>("createdAt");
  const [sortDirection, setSortDirection] =
    useState<TakeoffSortDirection>("asc");
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
  const summary = useMemo(() => buildTakeoffSummary(items), [items]);
  const unitFilterOptions = useMemo(
    () => buildTakeoffUnitFilterOptions(items),
    [items],
  );
  const filteredItems = useMemo(
    () =>
      filterAndSortTakeoffItems(items, {
        searchQuery,
        unitFilter,
        sortField,
        sortDirection,
      }),
    [items, searchQuery, sortDirection, sortField, unitFilter],
  );

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
        <div className="flex flex-wrap items-start gap-2">
          <ExportTakeoffCsvButton
            items={items}
            drawingNumber={drawingNumber}
            drawingId={drawingId}
          />
          {canEdit ? (
            <ImportTakeoffCsvButton
              companyId={companyId}
              jobId={jobId}
              drawingId={drawingId}
            />
          ) : null}
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DrawingTakeoffSummary summary={summary} />

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
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="takeoff-search">Buscar</Label>
                <Input
                  id="takeoff-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Referencia, descripción, unidad o notas"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="takeoff-unit-filter">Unidad</Label>
                <select
                  id="takeoff-unit-filter"
                  value={unitFilter}
                  onChange={(event) => setUnitFilter(event.target.value)}
                  className={selectClassName}
                >
                  {unitFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="takeoff-sort-field">Ordenar por</Label>
                <select
                  id="takeoff-sort-field"
                  value={sortField}
                  onChange={(event) =>
                    setSortField(event.target.value as TakeoffSortField)
                  }
                  className={selectClassName}
                >
                  {TAKEOFF_SORT_FIELD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="takeoff-sort-direction">Dirección</Label>
                <select
                  id="takeoff-sort-direction"
                  value={sortDirection}
                  onChange={(event) =>
                    setSortDirection(event.target.value as TakeoffSortDirection)
                  }
                  className={selectClassName}
                >
                  {TAKEOFF_SORT_DIRECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay líneas que coincidan con los filtros aplicados.
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
                {filteredItems.map((item) => (
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
                          <DuplicateTakeoffItemButton
                            companyId={companyId}
                            jobId={jobId}
                            drawingId={drawingId}
                            takeoffItemId={item.id}
                          />
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
