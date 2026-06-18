import { getCurrentUser } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const classId = parseInt(id, 10);

    if (isNaN(classId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const enrolled = await prisma.class.findFirst({
      where: { id: classId, students: { some: { id: user.id } } },
    });

    if (!enrolled) {
      return NextResponse.json({ error: "Você não está matriculado nesta turma." }, { status: 404 });
    }

    await prisma.class.update({
      where: { id: classId },
      data: { students: { disconnect: { id: user.id } } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
