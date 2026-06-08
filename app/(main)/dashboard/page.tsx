import { DashboardAttention } from "@/components/dashboard/dashboard-attention";
import { DashboardCompanyCard } from "@/components/dashboard/dashboard-company-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { DashboardRecentJobs } from "@/components/dashboard/dashboard-recent-jobs";
import { requireActiveCompany } from "@/lib/company";
import { getCompanyDashboardData } from "@/lib/dashboard/company-dashboard";
import { canManageJobs, getCompanyMemberCount } from "@/lib/permissions";

function buildDashboardSummaryLine(
  totalJobs: number,
  totalDrawings: number,
  takeoffLineCount: number,
): string | undefined {
  if (totalJobs === 0 && totalDrawings === 0 && takeoffLineCount === 0) {
    return undefined;
  }

  const jobLabel =
    totalJobs === 1 ? "1 trabajo" : `${totalJobs} trabajos`;
  const drawingLabel =
    totalDrawings === 1 ? "1 plano" : `${totalDrawings} planos`;
  const takeoffLabel =
    takeoffLineCount === 1
      ? "1 línea de palillería"
      : `${takeoffLineCount} líneas de palillería`;

  return `${jobLabel} · ${drawingLabel} · ${takeoffLabel}`;
}

export default async function DashboardPage() {
  const { company, membership } = await requireActiveCompany();
  const [memberCount, dashboardData] = await Promise.all([
    getCompanyMemberCount(company.id),
    getCompanyDashboardData(company.id),
  ]);

  const canCreate = canManageJobs(membership.role);
  const summaryLine = buildDashboardSummaryLine(
    dashboardData.operational.totalJobs,
    dashboardData.operational.totalDrawings,
    dashboardData.operational.takeoffLineCount,
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        companyName={company.name}
        companyId={company.id}
        canCreateJob={canCreate}
        summaryLine={summaryLine}
      />

      <DashboardKpis stats={dashboardData.operational} />

      <DashboardAttention attention={dashboardData.attention} />

      <DashboardRecentJobs
        companyId={company.id}
        jobs={dashboardData.recentJobs}
        canCreateJob={canCreate}
      />

      <DashboardCompanyCard
        companyName={company.name}
        taxName={company.taxName}
        role={membership.role}
        memberCount={memberCount}
      />
    </div>
  );
}
