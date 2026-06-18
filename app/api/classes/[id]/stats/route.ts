import { getCurrentUser, isUserAdmin } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const STUDENTS_PAGE_SIZE = 20;

function buildTopicLabel(parameterValues: unknown[]): string {
  const params = parameterValues as Array<{ name: string; values: string[] }>;
  const label = params.flatMap((p) => p.values ?? []).filter(Boolean).join(" · ");
  return label || "Geração";
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const classId = parseInt(id, 10);
    if (isNaN(classId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: { select: { id: true, name: true, email: true } },
        collaborators: { select: { userId: true } },
        questionTemplates: { select: { id: true, name: true } },
      },
    });

    if (!classData) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = classData.ownerId === user.id;
    const isCollaborator = classData.collaborators.some((c) => c.userId === user.id);
    if (!isUserAdmin(user) && !isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const studentIds = classData.students.map((s) => s.id);
    const templateIds = classData.questionTemplates.map((t) => t.id);

    if (studentIds.length === 0) {
      return NextResponse.json({ totalStudents: 0, totalRequests: 0, students: [], perTemplate: [] });
    }

    const requests = await prisma.questionRequest.findMany({
      where: {
        userId: { in: studentIds },
        ...(templateIds.length > 0 ? { templateId: { in: templateIds } } : {}),
        status: "COMPLETED",
      },
      select: {
        id: true,
        userId: true,
        templateId: true,
        createdAt: true,
        parameterValues: true,
        questions: {
          select: {
            type: true,
            answers: {
              where: { userId: { in: studentIds } },
              select: { correct: true, userId: true, autoEvaluation: { select: { score: true } } },
            },
          },
        },
      },
    });

    let summaryMap = new Map<string, { summary: string; updatedAt: Date }>();
    try {
      const summaries = await prisma.studentTemplateFeedbackSummary.findMany({
        where: {
          studentId: { in: studentIds },
          ...(templateIds.length > 0 ? { templateId: { in: templateIds } } : {}),
        },
        select: { studentId: true, templateId: true, summary: true, updatedAt: true },
      });
      summaryMap = new Map(summaries.map((s) => [`${s.studentId}:${s.templateId}`, s]));
    } catch (err) {
      console.error("[stats] summaries query failed:", err);
    }

    type StudentAgg = {
      id: number; name: string | null; email: string;
      totalRequests: number; totalAnswers: number; correctAnswers: number;
      scoreSum: number; scoredAnswers: number;
      lastActivityAt: Date | null;
    };
    const studentAgg = new Map<number, StudentAgg>(
      classData.students.map((s) => [s.id, {
        ...s, totalRequests: 0, totalAnswers: 0, correctAnswers: 0,
        scoreSum: 0, scoredAnswers: 0, lastActivityAt: null,
      }])
    );

    type GenerationItem = { label: string; score: number | null; questionCount: number };
    type TemplateStudentAgg = { totalRequests: number; scoreSum: number; scoredAnswers: number; generations: GenerationItem[] };
    type TemplateAgg = {
      templateId: number; templateName: string;
      usageCount: number; scoreSum: number; scoredAnswers: number;
      studentAgg: Map<number, TemplateStudentAgg>;
    };
    const templateAgg = new Map<number, TemplateAgg>(
      classData.questionTemplates.map((t) => [t.id, {
        templateId: t.id, templateName: t.name,
        usageCount: 0, scoreSum: 0, scoredAnswers: 0,
        studentAgg: new Map(),
      }])
    );

    for (const req of requests) {
      const sa = studentAgg.get(req.userId);
      if (!sa) continue;

      sa.totalRequests++;
      const reqDate = new Date(req.createdAt);
      if (!sa.lastActivityAt || reqDate > sa.lastActivityAt) sa.lastActivityAt = reqDate;

      const ta = req.templateId ? templateAgg.get(req.templateId) : null;
      if (ta) {
        ta.usageCount++;
        if (!ta.studentAgg.has(req.userId)) {
          ta.studentAgg.set(req.userId, { totalRequests: 0, scoreSum: 0, scoredAnswers: 0, generations: [] });
        }
        ta.studentAgg.get(req.userId)!.totalRequests++;
      }

      // Calcula score unificado por geração: MC → correct?10:0, discursiva → autoEvaluation.score
      let reqScoreSum = 0;
      let reqScoredCount = 0;

      for (const q of req.questions) {
        const answer = q.answers.find((a) => a.userId === req.userId);
        if (!answer) continue;
        sa.totalAnswers++;
        if (answer.correct) sa.correctAnswers++;

        let questionScore: number | null = null;
        if (q.type === "multiple-choice") {
          questionScore = answer.correct ? 10 : 0;
        } else if (answer.autoEvaluation) {
          questionScore = answer.autoEvaluation.score;
        }

        if (questionScore !== null) {
          reqScoreSum += questionScore;
          reqScoredCount++;
          sa.scoreSum += questionScore;
          sa.scoredAnswers++;
          if (ta) {
            ta.scoreSum += questionScore;
            ta.scoredAnswers++;
            const tsa = ta.studentAgg.get(req.userId);
            if (tsa) { tsa.scoreSum += questionScore; tsa.scoredAnswers++; }
          }
        }
      }

      // Registra geração no template
      if (ta) {
        const tsa = ta.studentAgg.get(req.userId);
        if (tsa) {
          const genScore = reqScoredCount > 0
            ? Math.round((reqScoreSum / reqScoredCount) * 10) / 10
            : null;
          tsa.generations.push({
            label: buildTopicLabel(req.parameterValues as unknown[]),
            score: genScore,
            questionCount: req.questions.length,
          });
        }
      }
    }

    const allStudents = Array.from(studentAgg.values()).map((s) => ({
      id: s.id, name: s.name, email: s.email,
      totalRequests: s.totalRequests, totalAnswers: s.totalAnswers, correctAnswers: s.correctAnswers,
      avgScore: s.scoredAnswers > 0 ? Math.round((s.scoreSum / s.scoredAnswers) * 10) / 10 : null,
      lastActivityAt: s.lastActivityAt,
    })).sort((a, b) => b.totalRequests - a.totalRequests);

    const totalStudentsPages = Math.ceil(allStudents.length / STUDENTS_PAGE_SIZE);
    const students = allStudents.slice((page - 1) * STUDENTS_PAGE_SIZE, page * STUDENTS_PAGE_SIZE);

    const perTemplate = Array.from(templateAgg.values()).map((t) => {
      const templateStudents = classData.students
        .filter((s) => t.studentAgg.has(s.id))
        .map((s) => {
          const tsa = t.studentAgg.get(s.id)!;
          const summaryData = summaryMap.get(`${s.id}:${t.templateId}`);
          return {
            id: s.id, name: s.name, email: s.email,
            totalRequests: tsa.totalRequests,
            avgScore: tsa.scoredAnswers > 0 ? Math.round((tsa.scoreSum / tsa.scoredAnswers) * 10) / 10 : null,
            generations: tsa.generations,
            summary: summaryData?.summary ?? null,
            summaryUpdatedAt: summaryData?.updatedAt ?? null,
          };
        });

      return {
        templateId: t.templateId, templateName: t.templateName,
        usageCount: t.usageCount,
        avgScore: t.scoredAnswers > 0 ? Math.round((t.scoreSum / t.scoredAnswers) * 10) / 10 : null,
        students: templateStudents,
      };
    });

    return NextResponse.json({
      totalStudents: classData.students.length,
      totalRequests: requests.length,
      students, studentsPage: page, studentsTotalPages: totalStudentsPages,
      perTemplate,
    });
  } catch (error) {
    console.error("[stats] unhandled error:", error);
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
