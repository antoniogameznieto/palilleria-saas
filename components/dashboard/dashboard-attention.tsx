import {
  hasDashboardAttentionItems,
  type CompanyDashboardAttentionStats,
} from "@/lib/dashboard/company-dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DashboardAttentionProps = {
  attention: CompanyDashboardAttentionStats;
};

type AttentionItemProps = {
  label: string;
  value: number;
};

function AttentionItem({ label, value }: AttentionItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function DashboardAttention({ attention }: DashboardAttentionProps) {
  const needsAttention = hasDashboardAttentionItems(attention);

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Necesitan atención</CardTitle>
        <CardDescription>
          Pendientes operativos que conviene revisar.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {needsAttention ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {attention.draftJobs > 0 ? (
              <AttentionItem
                label="Trabajos en borrador"
                value={attention.draftJobs}
              />
            ) : null}
            {attention.pendingReviewDrawings > 0 ? (
              <AttentionItem
                label="Planos pendientes de revisar"
                value={attention.pendingReviewDrawings}
              />
            ) : null}
            {attention.drawingsWithoutMetadata > 0 ? (
              <AttentionItem
                label="Planos sin metadatos"
                value={attention.drawingsWithoutMetadata}
              />
            ) : null}
            {attention.errorDrawings > 0 ? (
              <AttentionItem
                label="Planos en error"
                value={attention.errorDrawings}
              />
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
            Todo al día por ahora.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
