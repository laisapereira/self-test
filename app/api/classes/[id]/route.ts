import { getCurrentUser, isUserAdmin, isUserProfessor } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

async function getClassAndVerifyAccess(id: number, userId: number, isAdmin: boolean) {
  const classData = await prisma.class.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      students: { select: { id: true, name: true, email: true } },
      collaborators: { include: { user: { select: { id: true, name: true, email: true } } } },
      questionTemplates: { select: { id: true, name: true } },
      evaluationTemplates: { select: { id: true, name: true } },
    },
  });

  if (!classData) return null;

  if (isAdmin) return classData;

  const isOwner = classData.ownerId === userId;
  const isCollaborator = classData.collaborators.some((c) => c.user.id === userId);
  const isStudent = classData.students.some((s) => s.id === userId);

  if (!isOwner && !isCollaborator && !isStudent) return null;

  return classData;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    const { id } = await params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const classData = await getClassAndVerifyAccess(numericId, currentUser.id, isUserAdmin(currentUser));
    if (!classData) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const preview = new URL(req.url).searchParams.get("preview") === "true";
    if (preview) {
      const sorted = [...classData.students].sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", "pt-BR")
      );
      return NextResponse.json({
        class: {
          ...classData,
          students: sorted.slice(0, 5),
          totalStudents: classData.students.length,
        },
      });
    }

    return NextResponse.json({ class: classData });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    const { id } = await params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const classData = await prisma.class.findUnique({
      where: { id: numericId },
      include: { students: { select: { id: true } } },
    });
    if (!classData) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isOwner = classData.ownerId === currentUser.id;
    const isCollaborator = await prisma.classCollaborator.findUnique({
      where: { classId_userId: { classId: numericId, userId: currentUser.id } },
    });

    if (!isUserAdmin(currentUser) && !isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, questionTemplates, evaluationTemplates, collaborators, students } = await req.json();

    // Diff-based connect/disconnect: evita deletar e reinserir toda a lista
    let studentsDiff: Record<string, unknown> | undefined;
    if (students) {
      const existingIds = new Set(classData.students.map((s) => s.id));
      const newIds = new Set(students as number[]);
      const toConnect = [...newIds].filter((id) => !existingIds.has(id)).map((id) => ({ id }));
      const toDisconnect = [...existingIds].filter((id) => !newIds.has(id)).map((id) => ({ id }));
      studentsDiff = {
        ...(toConnect.length > 0 && { connect: toConnect }),
        ...(toDisconnect.length > 0 && { disconnect: toDisconnect }),
      };
    }

    const updated = await prisma.class.update({
      where: { id: numericId },
      data: {
        ...(name && { name }),
        ...(questionTemplates && {
          questionTemplates: { set: questionTemplates.map((tid: number) => ({ id: tid })) },
        }),
        ...(evaluationTemplates && {
          evaluationTemplates: { set: evaluationTemplates.map((tid: number) => ({ id: tid })) },
        }),
        ...((isOwner || isUserAdmin(currentUser)) && collaborators && {
          collaborators: {
            deleteMany: {},
            create: collaborators.map((uid: number) => ({ userId: uid })),
          },
        }),
        ...(studentsDiff && { students: studentsDiff }),
      },
    });

    return NextResponse.json({ class: updated });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    const { id } = await params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const classData = await prisma.class.findUnique({ where: { id: numericId } });
    if (!classData) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isOwner = classData.ownerId === currentUser.id;
    if (!isUserAdmin(currentUser) && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.class.delete({ where: { id: numericId } });
    return NextResponse.json({ message: "Class deleted" });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
