"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/apiUtils";

export async function fetchTemplates() {
  return await prisma.questionRequestTemplate.findMany();
}

export async function fetchTemplate(templateId: number) {
  return await prisma.questionRequestTemplate.findUniqueOrThrow({
    where: {
      id: templateId,
    },
  });
}

export async function fetchUsersWhoUsedTemplate(
  templateId: number,
  page: number = 1,
  pageSize: number = 10,
) {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.admin || false;

  // Se for USER: retorna apenas ele mesmo
  if (!isAdmin) {
    return {
      users: currentUser
        ? [
            await prisma.user.findUniqueOrThrow({
              where: { id: currentUser.id },
            }),
          ]
        : [],
      total: 1,
      page: 1,
      totalPages: 1,
    };
  }

  // Se for ADMIN: retorna todos com paginação
  const skip = (page - 1) * pageSize;
  const total = await prisma.user.count({
    where: {
      questionRequests: {
        some: {
          template: {
            id: templateId,
          },
        },
      },
    },
  });

  const users = await prisma.user.findMany({
    where: {
      questionRequests: {
        some: {
          template: {
            id: templateId,
          },
        },
      },
    },
    orderBy: { name: "asc" },
    skip,
    take: pageSize,
  });

  const totalPages = Math.ceil(total / pageSize);

  return {
    users,
    total,
    page,
    totalPages,
  };
}

export async function fetchRequestsForTemplate(
  templateId: number,
  userIdFilter?: number,
) {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.admin || false;

  // Se for USER: retorna apenas suas respostas
  const userId = !isAdmin ? currentUser?.id : userIdFilter;

  return await prisma.questionRequest.findMany({
    where: {
      templateId: templateId,
      ...(userId && { userId }),
    },
    include: {
      questions: {
        include: {
          answers: {
            select: {
              correct: true,
            },
          },
        },
      },
    },
  });
}
