'use server';

import { getCurrentUser } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";

export async function fetchRequests(params: { userId?: number; page?:number; pageSize?:number}) {

  const page = Number(params.page) || 1
  const pageSize = Number(params.pageSize) ||6
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Unauthorized");
  }
  if (!params.userId) {
    params.userId = currentUser.id;
  }
  if (params.userId != currentUser.id && !currentUser.admin) {
    throw new Error("Unauthorized");
  }

  const totalCount = await prisma.questionRequest.count({
    where: {
      ...(params.userId !== -1 && { userId: params.userId }),
    }
  })

const data = await prisma.questionRequest.findMany({
    where: {
      ...(params.userId !== -1 && { userId: params.userId }),
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      template: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      questions: {
        select: {
          id: true,
          correctAnswerIndex: true,
          content: true,
          type: true,
          evaluationCriteria: true,
          alternatives: true,
          answers: {
            ...(params.userId !== -1 && {
              where: {
                userId: params.userId,
              }
            }),
            select: {
              id: true,
              answerIndex: true,
              confidenceLevel: true,
              correct: true,

              autoEvaluation: {
                select: {
                  id: true,
                  score: true,
                  justification: true,
                  criteria: true,
                  evaluatedAt: true,
                  modelVersion: true,
                              }
            },
          },
        },
      },
    },
  }});

  const normalizedData = data.map(r => ({
  ...r,
  questions: r.questions.map(q => ({
    ...q,
    alternatives: q.alternatives as { content: string; feedback: string }[],
    answers: q.answers.map(a => ({
      ...a,
      autoEvaluation: a.autoEvaluation ? {
        score: a.autoEvaluation.score,
        justification: a.autoEvaluation.justification,
        evaluatedAt: a.autoEvaluation.evaluatedAt,
        modelVersion: a.autoEvaluation.modelVersion,
        criteria: a.autoEvaluation.criteria.map(c => ({
          description: c.description,
          weight: c.weight,
          score: c.score
        }))
      } : null
    }))
  }))
}));







  return {
    data: normalizedData, totalPages: Math.ceil(totalCount/pageSize),
    currentPage: page
  }
}