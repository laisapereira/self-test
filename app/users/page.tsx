import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export default async function UsersPage() {

  async function toggleAdmin(formData: FormData) {
    'use server';

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

    revalidatePath("/users");
  }

  async function fetchUsers() {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser.admin) {
      throw new Error("Unauthorized");
    }

    return prisma.user.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  const users = await fetchUsers();

  return (
    <div>
      <h1>Users</h1>
      <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
        <Table className="w-full min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">ID</TableHead>
            <TableHead className="text-left">Name</TableHead>
            <TableHead className="text-left">Email</TableHead>
            <TableHead className="text-left">Is Admin</TableHead>
            <TableHead className="text-left">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.admin ? "Sim" : "Não"}</TableCell>
              <TableCell className="space-x-2">
                <Link href={`/questions?userId=${user.id}`} className="text-blue-500 hover:underline">
                  View Questions
                </Link>
                <span>|</span>
                <Link href={`/questionRequests?userId=${user.id}`} className="text-blue-500 hover:underline">
                  View Requests
                </Link>
                <form action={toggleAdmin} className="inline">
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="admin" value={!user.admin ? "true" : "false"} />
                  <button
                    type="submit"
                    className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {user.admin ? "Remover admin" : "Dar admin"}
                  </button>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>
    </div>
  );
}
