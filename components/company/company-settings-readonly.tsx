type CompanySettingsReadonlyProps = {
  name: string;
  taxName: string | null;
};

export function CompanySettingsReadonly({
  name,
  taxName,
}: CompanySettingsReadonlyProps) {
  return (
    <dl className="max-w-xl space-y-4 rounded-lg border bg-card p-4">
      <div>
        <dt className="text-sm text-muted-foreground">Nombre de la empresa</dt>
        <dd className="mt-1 font-medium">{name}</dd>
      </div>
      <div>
        <dt className="text-sm text-muted-foreground">Razón social</dt>
        <dd className="mt-1 font-medium">{taxName ?? "—"}</dd>
      </div>
    </dl>
  );
}
