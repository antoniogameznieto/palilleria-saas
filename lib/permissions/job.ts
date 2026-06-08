import type { CompanyRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";

import { requireCompanyMember } from "@/lib/permissions/company";

const EDIT_JOB_ROLES: CompanyRole[] = ["owner", "admin", "engineer"];
const ARCHIVE_JOB_ROLES: CompanyRole[] = ["owner", "admin"];

export function canManageJobs(role: CompanyRole): boolean {
  return EDIT_JOB_ROLES.includes(role);
}

export function canEditJob(role: CompanyRole): boolean {
  return EDIT_JOB_ROLES.includes(role);
}

export function canArchiveJob(role: CompanyRole): boolean {
  return ARCHIVE_JOB_ROLES.includes(role);
}

export async function getJobForUser(companyId: string, jobId: string) {
  const { user, membership } = await requireCompanyMember(companyId);

  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      companyId,
    },
    include: {
      settings: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          drawings: true,
          pipeSegments: true,
        },
      },
    },
  });

  if (!job) {
    return null;
  }

  return { user, membership, job };
}

export async function requireJobAccess(companyId: string, jobId: string) {
  const result = await getJobForUser(companyId, jobId);

  if (!result) {
    redirect(`/companies/${companyId}/jobs`);
  }

  return result;
}

export async function requireJobRole(
  companyId: string,
  jobId: string,
  allowedRoles: CompanyRole[],
) {
  const result = await requireJobAccess(companyId, jobId);

  if (!allowedRoles.includes(result.membership.role)) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  return result;
}

export async function getCompanyJobs(companyId: string) {
  return prisma.job.findMany({
    where: { companyId },
    include: {
      _count: {
        select: {
          drawings: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCompanyJobStats(companyId: string) {
  const [total, byStatus] = await Promise.all([
    prisma.job.count({ where: { companyId } }),
    prisma.job.groupBy({
      by: ["status"],
      where: { companyId },
      _count: { status: true },
    }),
  ]);

  return { total, byStatus };
}
