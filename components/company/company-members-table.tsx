import type { CompanyRole } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

type CompanyMemberRow = {
  id: string;
  role: CompanyRole;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

type CompanyMembersTableProps = {
  members: CompanyMemberRow[];
};

export function CompanyMembersTable({ members }: CompanyMembersTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Usuario</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Rol</th>
            <th className="px-4 py-3 font-medium">Alta</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-b last:border-b-0">
              <td className="px-4 py-3">
                {member.user.name ?? "Sin nombre"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {member.user.email}
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary" className="capitalize">
                  {member.role}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {member.createdAt.toLocaleDateString("es-ES")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
