import { SemesterUsersSection } from "@/components/admin/SemesterUsersSection";
import { UserSearch } from "@/components/admin/UserSearch";
import { getCurrentUser, isUserAdmin } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { groupBySemester, sortedSemesters } from "@/lib/semester";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q || "").trim();
  const whereClause =
    query.length > 0
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : undefined;

  async function toggleAdmin(formData: FormData) {
    "use server";

    const currentUser = await getCurrentUser();
    if (!currentUser.role || currentUser.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const userIdString = formData.get("userId");
    const role = formData.get("role") as string;

    if (!userIdString || !role) {
      throw new Error("Missing required fields");
    }

    if (!["STUDENT", "PROFESSOR", "ADMIN"].includes(role)) {
      throw new Error("Invalid role");
    }

    const userId = Number(userIdString);
    if (Number.isNaN(userId)) {
      throw new Error("Invalid userId");
    }

    if (currentUser.id === userId) {
      throw new Error("Você não pode alterar seu próprio role aqui");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: role as "STUDENT" | "PROFESSOR" | "ADMIN" },
    });

    revalidatePath("/admin/users");
  }

  const currentUser = await getCurrentUser();
  
  if (!isUserAdmin(currentUser)) {
    throw new Error("Unauthorized");
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });

  const totalUsers = await prisma.user.count();
  const adminsCount = await prisma.user.count({ where: { role: "ADMIN" } });

  const adminUsers = users.filter((u) => u.role === "ADMIN");
  const regularUsers = users.filter((u) => u.role !== "ADMIN");

  const grouped = groupBySemester(regularUsers, (u) => u.createdAt);
  const semesterKeys = sortedSemesters(Object.keys(grouped));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Painel de usuários
            </h1>
            <p className="text-slate-500">Gerenciamento de Administradores</p>
          </div>
          <Link
            href="/admin/users/new"
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + Novo Admin
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total de Usuários
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-800">
              {totalUsers}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Admins Ativos</p>
            <p className="mt-1 text-3xl font-bold text-green-600">
              {adminsCount}
            </p>
          </div>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-700">
              Usuários do Sistema
            </h2>
            <UserSearch initialQuery={query} />
          </div>

          {adminUsers.length > 0 && (
            <SemesterUsersSection
              semester="Administradores"
              users={adminUsers}
              defaultOpen
              showCreatedAt
              toggleAdmin={toggleAdmin}
              revalidationPath="/admin/users"
            />
          )}

          {semesterKeys.length === 0 && regularUsers.length === 0 && (
            <p className="text-sm text-slate-500">
              Nenhum usuário encontrado{query ? ` para "${query}"` : ""}.
            </p>
          )}

          {semesterKeys.map((semester, idx) => (
            <SemesterUsersSection
              key={semester}
              semester={semester}
              users={grouped[semester]}
              defaultOpen={idx === 0 && adminUsers.length === 0}
              toggleAdmin={toggleAdmin}
              revalidationPath="/admin/users"
            />
          ))}
        </section>
      </div>
    </div>
  );
}
