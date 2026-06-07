import { getCurrentUser } from "@/lib/apiUtils";
import { generateAndSaveFeedbackSummary } from "@/lib/feedbackSummary";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos entre gerações

// POST /api/users/me/summaries — aluno gera a própria análise para um template
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    const body = await req.json();
    const templateId = Number(body?.templateId);
    if (!Number.isInteger(templateId) || templateId <= 0) {
      return NextResponse.json({ error: "templateId inválido." }, { status: 400 });
    }

    // Cooldown: impede geração repetida em menos de 5 minutos
    const existing = await prisma.studentTemplateFeedbackSummary.findUnique({
      where: { studentId_templateId: { studentId: user.id, templateId } },
      select: { updatedAt: true },
    });
    if (existing) {
      const elapsed = Date.now() - existing.updatedAt.getTime();
      if (elapsed < COOLDOWN_MS) {
        const waitSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json(
          { error: `Aguarde ${waitSec}s antes de gerar novamente.` },
          { status: 429 },
        );
      }
    }

    // Verifica que o aluno realmente usou esse template (tem pelo menos 1 request concluído)
    const hasRequests = await prisma.questionRequest.findFirst({
      where: { userId: user.id, templateId, status: "COMPLETED" },
      select: { id: true },
    });
    if (!hasRequests) {
      return NextResponse.json(
        { error: "Você ainda não tem respostas avaliadas neste tema." },
        { status: 422 },
      );
    }

    const summary = await generateAndSaveFeedbackSummary(user.id, templateId);
    if (!summary) {
      return NextResponse.json(
        { error: "Sem feedbacks suficientes para gerar análise." },
        { status: 422 },
      );
    }

    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
