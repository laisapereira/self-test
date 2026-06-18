import { SemesterAccordion } from "@/components/SemesterAccordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser, isUserAdmin } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { groupBySemester, sortedSemesters } from "@/lib/semester";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export default async function UsersPage() {
  async function toggleAdmin(formData: FormData) {
    "use server";

    const currentUser = await getCurrentUser();
    if (!isUserAdmin(currentUser)) {
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
      data: { role: makeAdmin ? "ADMIN" : "STUDENT" },
    });

    revalidatePath("/users");
  }

  const currentUser = await getCurrentUser();
  if (!isUserAdmin(currentUser)) {
    throw new Error("Unauthorized");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  const grouped = groupBySemester(users, (u) => u.createdAt);
  const semesterKeys = sortedSemesters(Object.keys(grouped));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-slate-800">Usuários</h1>

        {semesterKeys.map((semester, idx) => {
          const semesterUsers = grouped[semester];
          return (
            <SemesterAccordion
              key={semester}
              title={semester}
              count={semesterUsers.length}
              defaultOpen={idx === 0}
            >
              <div className="overflow-x-auto bg-white">
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
                    {semesterUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-slate-50">
                        <TableCell>{user.id}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role === "ADMIN" ? "Sim" : "Não"}</TableCell>
                        <TableCell className="space-x-2">
                          <Link
                            href={`/questions?userId=${user.id}`}
                            className="text-blue-500 hover:underline"
                          >
                            View Questions
                          </Link>
                          <span>|</span>
                          <Link
                            href={`/questionRequests?userId=${user.id}`}
                            className="text-blue-500 hover:underline"
                          >
                            View Requests
                          </Link>
                          <form action={toggleAdmin} className="inline">
                            <input
                              type="hidden"
                              name="userId"
                              value={user.id}
                            />
                            <input
                              type="hidden"
                              name="admin"
                              value={user.role !== "ADMIN" ? "true" : "false"}
                            />
                            <button
                              type="submit"
                              className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {user.role === "ADMIN" ? "Remover admin" : "Dar admin"}
                            </button>
                          </form>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SemesterAccordion>
          );
        })}
      </div>
    </div>
  );
}
