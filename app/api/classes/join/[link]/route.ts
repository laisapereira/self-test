import { getCurrentUser } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ link: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    const { link } = await params;

    // Busca a turma pelo link de acesso
    const classData = await prisma.class.findUnique({
      where: { link },
      select: { id: true, ownerId: true },
    });

    if (!classData) {
      return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });
    }

    // Dono da turma não precisa entrar como aluno
    if (classData.ownerId === currentUser.id) {
      return NextResponse.json({ classId: classData.id });
    }

    // Adiciona o usuário como aluno, ignorando se já estiver na turma
    await prisma.class.update({
      where: { id: classData.id },
      data: {
        students: { connect: { id: currentUser.id } },
      },
    });

    return NextResponse.json({ classId: classData.id });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
