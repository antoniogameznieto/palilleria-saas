"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import {
  createTakeoffItemAction,
  updateTakeoffItemAction,
} from "@/lib/actions/takeoff";
import { ExportTakeoffCsvButton } from "@/components/drawings/takeoff/export-takeoff-csv-button";
import { TakeoffItemNotesCell } from "@/components/drawings/takeoff/takeoff-item-notes-cell";
import { TakeoffItemRowActions } from "@/components/drawings/takeoff/takeoff-item-row-actions";
import { ImportTakeoffCsvButton } from "@/components/drawings/takeoff/import-takeoff-csv-button";
import { DrawingTakeoffItemForm } from "@/components/drawings/takeoff/drawing-takeoff-item-form";
import { DrawingTakeoffReviewStatus } from "@/components/drawings/takeoff/drawing-takeoff-review-status";
import { DrawingTakeoffSummary } from "@/components/drawings/takeoff/drawing-takeoff-summary";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import {
  buildTakeoffFormSuggestions,
  toTakeoffSuggestionSourceItems,
  type TakeoffSuggestionSourceItem,
} from "@/lib/drawings/takeoff-suggestions";
import { buildTakeoffSummary } from "@/lib/drawings/takeoff-summary";

type DrawingTakeoffSectionProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  drawingNumber: string | null;
  items: SerializedTakeoffItem[];
  jobSuggestionItems: TakeoffSuggestionSourceItem[];
  canEdit: boolean;
  takeoffReviewedAt: string | null;
  takeoffReviewedByLabel: string | null;
  variant?: "page" | "workspace";
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
  jobSuggestionItems,
  canEdit,
  takeoffReviewedAt,
  takeoffReviewedByLabel,
  variant = "page",
}: DrawingTakeoffSectionProps) {
  const isWorkspace = variant === "workspace";
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
    const updateChanged =
      updateState.success &&
      updateState.success !== "La línea de palillería no ha cambiado.";

    if (createState.success || updateChanged) {
      router.refresh();
    }
  }, [createState.success, router, updateState.success]);

  const editingItem = items.find((item) => item.id === editingItemId) ?? null;
  const summary = useMemo(() => buildTakeoffSummary(items), [items]);
  const formSuggestions = useMemo(
    () =>
      buildTakeoffFormSuggestions(
        toTakeoffSuggestionSourceItems(items),
        jobSuggestionItems,
      ),
    [items, jobSuggestionItems],
  );
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
    <Card
      id="palilleria"
      className={cn(
        "scroll-mt-4",
        isWorkspace && "border-0 bg-transparent shadow-none",
      )}
    >
      <CardHeader
        className={cn(
          "flex flex-row flex-wrap items-start justify-between gap-3",
          !isWorkspace && "border-b pb-4",
          isWorkspace && "px-0 pt-0",
        )}
      >
        <div>
          <CardTitle className={isWorkspace ? "text-base" : "text-lg"}>
            Palillería
          </CardTitle>
          <CardDescription>
            Líneas del plano. Revisa antes de marcar como revisada; la propuesta
            beta solo importa lo que confirmes.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {!isWorkspace ? (
            <ExportTakeoffCsvButton
              items={items}
              drawingNumber={drawingNumber}
              drawingId={drawingId}
            />
          ) : null}
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
              data-testid="takeoff-add-line"
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
      <CardContent className={cn("space-y-4", isWorkspace && "px-0 pb-0")}>
        <DrawingTakeoffReviewStatus
          companyId={companyId}
          jobId={jobId}
          drawingId={drawingId}
          takeoffLineCount={items.length}
          takeoffReviewedAt={takeoffReviewedAt}
          takeoffReviewedByLabel={takeoffReviewedByLabel}
          canManage={canEdit}
        />

        <DrawingTakeoffSummary summary={summary} compact />

        {canEdit && showCreateForm ? (
          <DrawingTakeoffItemForm
            key={`create-${items.length}`}
            companyId={companyId}
            jobId={jobId}
            drawingId={drawingId}
            suggestions={formSuggestions}
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
            key={`${editingItem.id}-${editingItem.updatedAt}`}
            companyId={companyId}
            jobId={jobId}
            drawingId={drawingId}
            takeoffItemId={editingItem.id}
            initialValues={editingItem}
            suggestions={formSuggestions}
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
          <div className="space-y-3">
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/15 p-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[12rem] flex-1 space-y-1">
                <Label htmlFor="takeoff-search" className="text-xs">
                  Buscar
                </Label>
                <Input
                  id="takeoff-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Referencia, descripción o notas"
                  className="h-8"
                />
              </div>

              <div className="w-full space-y-1 sm:w-36">
                <Label htmlFor="takeoff-unit-filter" className="text-xs">
                  Unidad
                </Label>
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

              <div className="w-full space-y-1 sm:w-40">
                <Label htmlFor="takeoff-sort-field" className="text-xs">
                  Ordenar
                </Label>
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

              <div className="w-full space-y-1 sm:w-32">
                <Label htmlFor="takeoff-sort-direction" className="text-xs">
                  Dirección
                </Label>
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
          <div
            className={cn(
              "overflow-x-auto rounded-lg border",
              isWorkspace && "max-h-[min(58vh,540px)] overflow-y-auto",
            )}
          >
            <table className="w-full min-w-[36rem] table-fixed text-sm">
              <colgroup>
                <col className="w-[11%]" />
                <col className="w-[36%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[17%]" />
                {canEdit ? <col className="w-[20%]" /> : null}
              </colgroup>
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Referencia</th>
                  <th className="px-3 py-2 font-medium">Descripción</th>
                  <th className="px-3 py-2 font-medium">Cant.</th>
                  <th className="px-3 py-2 font-medium">Ud.</th>
                  <th className="px-3 py-2 font-medium">Origen / notas</th>
                  {canEdit ? (
                    <th className="px-3 py-2 font-medium">Acciones</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-b-0 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2 align-top text-muted-foreground whitespace-nowrap">
                      {formatCell(item.reference)}
                    </td>
                    <td className="px-3 py-2 align-top font-medium">
                      <span
                        className="line-clamp-3 text-foreground"
                        title={item.description}
                      >
                        {item.description}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2 align-top text-muted-foreground whitespace-nowrap">
                      {formatCell(item.unit)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <TakeoffItemNotesCell notes={item.notes} />
                    </td>
                    {canEdit ? (
                      <td className="px-3 py-2 align-top">
                        <TakeoffItemRowActions
                          companyId={companyId}
                          jobId={jobId}
                          drawingId={drawingId}
                          takeoffItemId={item.id}
                          onEdit={() => {
                            setEditingItemId(item.id);
                            setShowCreateForm(false);
                          }}
                        />
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
