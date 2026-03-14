import { QuestionRequest } from "@/prisma";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeQuestionRequests(payload: any): QuestionRequest[] {
  const arr = Array.isArray(payload) ? payload : [payload];

  return arr.map((r: any) => ({


    id: Number(r.id),
    status: r.status,
    userId: Number(r.userId),
    templateId: Number(r.templateId),
    createdAt: new Date(r.createdAt),
    parameterValues: r.parameterValues ?? [],

    user: { id: Number(r.user?.id), name: r.user?.name ?? null },
    template: r.template ? { id: Number(r.template.id), name: String(r.template.name) } : null,

    questions: (r.questions ?? []).map((q: any) => ({
      id: Number(q.id),
      content: String(q.content ?? ""),
      type: q.type,
      correctAnswerIndex: q.correctAnswerIndex ?? null,

      // ensure alternatives is either null or the expected shape
      alternatives: Array.isArray(q.alternatives)
        ? q.alternatives.map((a: any) => ({ content: String(a.content ?? ""), feedback: String(a.feedback ?? "") }))
        : null,

      // convert JsonValue[] | null -> string[] | undefined
      evaluationCriteria: Array.isArray(q.evaluationCriteria)
        ? q.evaluationCriteria.filter((v: any) => typeof v === "string").map(String)
        : undefined,

      referenceAnswer: q.referenceAnswer ? String(q.referenceAnswer) : undefined,

      answers: (q.answers ?? []).map((a: any) => ({
        id: Number(a.id),
        answerIndex: a.answerIndex ?? null,
        confidenceLevel: Number(a.confidenceLevel ?? 0),
        correct: Boolean(a.correct),
        content: a.content,

        autoEvaluation: a.autoEvaluation
          ? {
            score: Number(a.autoEvaluation.score),
            justification: String(a.autoEvaluation.justification ?? ""),
            modelVersion: a.autoEvaluation.modelVersion ?? null,
            // convert Date -> string if needed
            evaluatedAt:
              typeof a.autoEvaluation.evaluatedAt === "string"
                ? a.autoEvaluation.evaluatedAt
                : new Date(a.autoEvaluation.evaluatedAt).toISOString(),
            criteria: (a.autoEvaluation.criteria ?? []).map((c: any) => ({
              description: String(c.description ?? ""),
              weight: Number(c.weight ?? 0),
              score: Number(c.score ?? 0),
            })),
          }
          : null,
      })),
    })),
  }));
}

