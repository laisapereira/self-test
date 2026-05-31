"use client";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SemesterAccordion } from "@/components/SemesterAccordion";
import { getSemester } from "@/lib/semester";
import Link from "next/link";

interface User {
  id: number;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
}

interface Props {
  semester: string;
  users: User[];
  defaultOpen?: boolean;
  pageSize?: number;
  showCreatedAt?: boolean;
  toggleAdmin: (formData: FormData) => Promise<void>;
  revalidationPath: "/admin/users" | "/users";
}

export function SemesterUsersSection({
  semester,
  users,
  defaultOpen = false,
  pageSize = 10,
  showCreatedAt = false,
  toggleAdmin,
}: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageUsers = users.slice(start, start + pageSize);

  return (
    <SemesterAccordion
      title={semester}
      count={users.length}
      defaultOpen={defaultOpen}
    >
      <div className="overflow-x-auto bg-white">
        <Table className="w-full min-w-[720px]">
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Admin</TableHead>
              {showCreatedAt && <TableHead>Semestre / Cadastro</TableHead>}
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageUsers.map((user) => (
              <TableRow key={user.id} className="hover:bg-slate-50">
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      user.role === "ADMIN"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {user.role === "ADMIN" ? "ADMIN" : "USER"}
                  </span>
                </TableCell>
                {showCreatedAt && (
                  <TableCell className="text-sm text-slate-500">
                    <span className="font-medium text-slate-700">
                      {getSemester(new Date(user.createdAt))}
                    </span>
                    <span className="ml-2 text-xs">
                      ({new Date(user.createdAt).toLocaleDateString("pt-BR")})
                    </span>
                  </TableCell>
                )}
                <TableCell className="flex gap-2">
                  <form action={toggleAdmin} className="inline-flex items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="role"
                      defaultValue={user.role}
                      className="rounded border border-slate-200 px-2 py-1 text-sm text-slate-700"
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    >
                      <option value="STUDENT">Aluno</option>
                      <option value="PROFESSOR">Professor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </form>
                  <Link
                    href={`/questionRequests?userId=${user.id}`}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Questões
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-500">
            Página {page} de {totalPages} • {users.length} usuário(s)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </SemesterAccordion>
  );
}
