import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { UserSearch } from "@/components/admin/UserSearch";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const query = (params.q || "").trim();
  const limit = 10;
  const skip = (page - 1) * limit;
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
    if (!currentUser.admin) {
      throw new Error("Unauthorized");
    }

    const userIdString = formData.get("userId");
    const makeAdminString = formData.get("admin");

    if (!userIdString || !makeAdminString) {
      throw new Error("Missing required fields");
    }

    const userId = Number(userIdString);
    if (Number.isNaN(userId)) {
      throw new Error("Invalid userId");
    }

    const makeAdmin = makeAdminString === "true";

    if (currentUser.id === userId) {
      throw new Error("Você não pode alterar seu próprio perfil de admin aqui");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { admin: makeAdmin },
    });

    revalidatePath("/admin/users");
  }

  async function fetchUsers() {
    "use server";
    const currentUser = await getCurrentUser();
    if (!currentUser.admin) {
      throw new Error("Unauthorized");
    }

    return prisma.user.findMany({
      where: whereClause,
      orderBy: {
        name: "asc",
      },
      skip,
      take: limit,
    });
  }

  const users = await fetchUsers();
  const totalUsers = await prisma.user.count();
  const filteredUsersCount = await prisma.user.count({ where: whereClause });
  const totalPages = Math.max(1, Math.ceil(filteredUsersCount / limit));
  const adminsCount = await prisma.user.count({ where: { admin: true } });
  const queryParam = query ? `&q=${encodeURIComponent(query)}` : "";

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

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-700">
              Usuários do Sistema
            </h2>
            <UserSearch initialQuery={query} />
          </div>
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[720px]">
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50">
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          user.admin
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {user.admin ? "ADMIN" : "USER"}
                      </span>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <form action={toggleAdmin} className="inline">
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          type="hidden"
                          name="admin"
                          value={!user.admin ? "true" : "false"}
                        />
                        <button
                          type="submit"
                          className={`rounded px-2 py-1 text-sm font-medium ${
                            user.admin
                              ? "bg-rose-500 text-white hover:bg-rose-600"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {user.admin ? "Remover" : "Tornar admin"}
                        </button>
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
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Página {page} de {totalPages} • {filteredUsersCount} resultado(s)
              {query && ` para "${query}"`}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/users?page=${page - 1}${queryParam}`}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/users?page=${page + 1}${queryParam}`}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Próxima
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
