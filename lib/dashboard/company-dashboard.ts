import type { DrawingStatus, JobStatus } from "@prisma/client";

import { formatTakeoffQuantity } from "@/lib/drawings/takeoff-summary";
import { prisma } from "@/lib/db";

const REVIEWED_DRAWING_STATUSES: DrawingStatus[] = ["reviewed", "approved"];
const PENDING_REVIEW_DRAWING_STATUSES: DrawingStatus[] = [
  "uploaded",
  "processing",
  "detected",
];

export type CompanyDashboardOperationalStats = {
  totalJobs: number;
  activeJobs: number;
  totalDrawings: number;
  reviewedDrawings: number;
  takeoffLineCount: number;
  totalTakeoffQuantity: string;
};

export type CompanyDashboardAttentionStats = {
  draftJobs: number;
  pendingReviewDrawings: number;
  drawingsWithoutMetadata: number;
  errorDrawings: number;
};

export type DashboardRecentJob = {
  id: string;
  name: string;
  clientName: string | null;
  createdAt: Date;
  status: JobStatus;
  drawingCount: number;
  reviewedDrawingCount: number;
  takeoffLineCount: number;
};

export type CompanyDashboardData = {
  operational: CompanyDashboardOperationalStats;
  attention: CompanyDashboardAttentionStats;
  recentJobs: DashboardRecentJob[];
};

function countByStatus<T extends string>(
  groups: Array<{ status: T; _count: { status: number } }>,
): Partial<Record<T, number>> {
  return Object.fromEntries(
    groups.map((item) => [item.status, item._count.status]),
  ) as Partial<Record<T, number>>;
}

function sumStatusCounts<T extends string>(
  counts: Partial<Record<T, number>>,
  statuses: T[],
): number {
  return statuses.reduce((total, status) => total + (counts[status] ?? 0), 0);
}

function buildRecentJobMetrics(
  jobId: string,
  drawingGroups: Array<{
    jobId: string;
    status: DrawingStatus;
    _count: { status: number };
  }>,
  takeoffGroups: Array<{ jobId: string; _count: { jobId: number } }>,
) {
  const drawingCounts = drawingGroups
    .filter((group) => group.jobId === jobId)
    .map((group) => ({
      status: group.status,
      count: group._count.status,
    }));

  const drawingCount = drawingCounts.reduce((total, item) => total + item.count, 0);
  const reviewedDrawingCount = drawingCounts
    .filter((item) => REVIEWED_DRAWING_STATUSES.includes(item.status))
    .reduce((total, item) => total + item.count, 0);
  const takeoffLineCount =
    takeoffGroups.find((group) => group.jobId === jobId)?._count.jobId ?? 0;

  return {
    drawingCount,
    reviewedDrawingCount,
    takeoffLineCount,
  };
}

export async function getCompanyDashboardData(
  companyId: string,
): Promise<CompanyDashboardData> {
  const [
    jobs,
    jobStatusGroups,
    drawingStatusGroups,
    drawingGroupsByJob,
    takeoffGroupsByJob,
    drawingsWithoutMetadata,
    takeoffAggregate,
  ] = await Promise.all([
    prisma.job.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        clientName: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.job.groupBy({
      by: ["status"],
      where: { companyId },
      _count: { status: true },
    }),
    prisma.drawing.groupBy({
      by: ["status"],
      where: { companyId },
      _count: { status: true },
    }),
    prisma.drawing.groupBy({
      by: ["jobId", "status"],
      where: { companyId },
      _count: { status: true },
    }),
    prisma.drawingTakeoffItem.groupBy({
      by: ["jobId"],
      where: { companyId },
      _count: { jobId: true },
    }),
    prisma.drawing.count({
      where: {
        companyId,
        AND: [
          { OR: [{ drawingNumber: null }, { drawingNumber: "" }] },
          { OR: [{ lineNumber: null }, { lineNumber: "" }] },
          { OR: [{ revision: null }, { revision: "" }] },
        ],
      },
    }),
    prisma.drawingTakeoffItem.aggregate({
      where: { companyId },
      _count: true,
      _sum: { quantity: true },
    }),
  ]);

  const jobStatusCounts = countByStatus(jobStatusGroups);
  const drawingStatusCounts = countByStatus(drawingStatusGroups);
  const totalJobs = Object.values(jobStatusCounts).reduce(
    (total, count) => total + (count ?? 0),
    0,
  );
  const totalDrawings = Object.values(drawingStatusCounts).reduce(
    (total, count) => total + (count ?? 0),
    0,
  );

  const recentJobs = jobs.map((job) => {
    const metrics = buildRecentJobMetrics(
      job.id,
      drawingGroupsByJob,
      takeoffGroupsByJob,
    );

    return {
      id: job.id,
      name: job.name,
      clientName: job.clientName,
      createdAt: job.createdAt,
      status: job.status,
      ...metrics,
    };
  });

  return {
    operational: {
      totalJobs,
      activeJobs: jobStatusCounts.in_progress ?? 0,
      totalDrawings,
      reviewedDrawings: sumStatusCounts(
        drawingStatusCounts,
        REVIEWED_DRAWING_STATUSES,
      ),
      takeoffLineCount: takeoffAggregate._count,
      totalTakeoffQuantity: formatTakeoffQuantity(
        Number(takeoffAggregate._sum.quantity ?? 0),
      ),
    },
    attention: {
      draftJobs: jobStatusCounts.draft ?? 0,
      pendingReviewDrawings: sumStatusCounts(
        drawingStatusCounts,
        PENDING_REVIEW_DRAWING_STATUSES,
      ),
      drawingsWithoutMetadata,
      errorDrawings: drawingStatusCounts.error ?? 0,
    },
    recentJobs,
  };
}

export function hasDashboardAttentionItems(
  attention: CompanyDashboardAttentionStats,
): boolean {
  return (
    attention.draftJobs > 0 ||
    attention.pendingReviewDrawings > 0 ||
    attention.drawingsWithoutMetadata > 0 ||
    attention.errorDrawings > 0
  );
}
