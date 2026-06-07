import { getCurrentUser } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();

    const requests = await prisma.questionRequest.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      select: {
        id: true,
        templateId: true,
        createdAt: true,
        template: { select: { id: true, name: true } },
        questions: {
          select: {
            id: true,
            type: true,
            correctAnswerIndex: true,
            answers: {
              where: { userId: user.id },
              select: {
                correct: true,
                answerIndex: true,
                autoEvaluation: { select: { score: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Summaries existentes para este aluno
    const summaries = await prisma.studentTemplateFeedbackSummary.findMany({
      where: { studentId: user.id },
      select: { templateId: true, summary: true, updatedAt: true },
    });
    const summaryMap = new Map(summaries.map((s) => [s.templateId, s.summary]));

    // Agrega globais
    let totalAnswers = 0;
    let correctAnswers = 0;
    let scoredCount = 0;
    let scoreSum = 0;

    // Agrega por template
    const byTemplateMap = new Map<
      number,
      { templateId: number; templateName: string; requests: number; answers: number; correctAnswers: number; scoreSum: number; scoredCount: number }
    >();

    for (const req of requests) {
      if (!req.template) continue;
      const tid = req.template.id;
      if (!byTemplateMap.has(tid)) {
        byTemplateMap.set(tid, {
          templateId: tid,
          templateName: req.template.name,
          requests: 0,
          answers: 0,
          correctAnswers: 0,
          scoreSum: 0,
          scoredCount: 0,
        });
      }
      const entry = byTemplateMap.get(tid)!;
      entry.requests++;

      for (const q of req.questions) {
        const answer = q.answers[0];
        if (!answer) continue;
        totalAnswers++;
        entry.answers++;
        if (answer.correct) { correctAnswers++; entry.correctAnswers++; }
        if (answer.autoEvaluation) {
          scoreSum += answer.autoEvaluation.score;
          scoredCount++;
          entry.scoreSum += answer.autoEvaluation.score;
          entry.scoredCount++;
        }
      }
    }

    const byTemplate = Array.from(byTemplateMap.values()).map((e) => ({
      templateId: e.templateId,
      templateName: e.templateName,
      requests: e.requests,
      answers: e.answers,
      correctAnswers: e.correctAnswers,
      avgScore: e.scoredCount > 0 ? Math.round((e.scoreSum / e.scoredCount) * 10) / 10 : null,
      summary: summaryMap.get(e.templateId) ?? null,
    }));

    // Evolução ao longo do tempo: últimos 10 requests com score médio
    const evolution = requests
      .filter((r) => r.questions.some((q) => q.answers[0]?.autoEvaluation))
      .slice(-10)
      .map((r) => {
        const scored = r.questions.flatMap((q) =>
          q.answers[0]?.autoEvaluation ? [q.answers[0].autoEvaluation.score] : []
        );
        const avg = scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
        return {
          requestId: r.id,
          date: r.createdAt,
          templateName: r.template?.name ?? "",
          avgScore: avg !== null ? Math.round(avg * 10) / 10 : null,
        };
      });

    return NextResponse.json({
      totalRequests: requests.length,
      totalAnswers,
      correctAnswers,
      avgScore: scoredCount > 0 ? Math.round((scoreSum / scoredCount) * 10) / 10 : null,
      byTemplate,
      evolution,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
