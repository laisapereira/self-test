import { getCurrentUser, isUserAdmin } from "@/lib/apiUtils";
import { generateAndSaveFeedbackSummary } from "@/lib/feedbackSummary";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/classes/[id]/summaries — gera summary sob demanda para um aluno + template
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const classId = parseInt(id, 10);
    if (isNaN(classId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: { collaborators: { select: { userId: true } } },
    });
    if (!classData) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = classData.ownerId === user.id;
    const isCollaborator = classData.collaborators.some((c) => c.userId === user.id);
    if (!isUserAdmin(user) && !isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { studentId, templateId } = await req.json() as { studentId: number; templateId: number };
    if (!studentId || !templateId) {
      return NextResponse.json({ error: "studentId e templateId são obrigatórios" }, { status: 400 });
    }

    const summary = await generateAndSaveFeedbackSummary(studentId, templateId);
    if (!summary) {
      return NextResponse.json({ error: "Sem feedbacks suficientes para gerar resumo" }, { status: 422 });
    }

    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET /api/classes/[id]/summaries — retorna summaries existentes para a turma
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const classId = parseInt(id, 10);
    if (isNaN(classId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        collaborators: { select: { userId: true } },
        students: { select: { id: true } },
        questionTemplates: { select: { id: true } },
      },
    });
    if (!classData) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = classData.ownerId === user.id;
    const isCollaborator = classData.collaborators.some((c) => c.userId === user.id);
    if (!isUserAdmin(user) && !isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const summaries = await prisma.studentTemplateFeedbackSummary.findMany({
      where: {
        studentId: { in: classData.students.map((s) => s.id) },
        templateId: { in: classData.questionTemplates.map((t) => t.id) },
      },
    });

    return NextResponse.json({ summaries });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
