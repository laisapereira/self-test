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
  const isAdmin = currentUser?.role === "ADMIN";

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
          status: "COMPLETED",
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
          status: "COMPLETED",
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

export async function fetchAllUsersForTemplate(templateId: number) {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

  if (!isAdmin) {
    return currentUser
      ? [await prisma.user.findUniqueOrThrow({ where: { id: currentUser.id } })]
      : [];
  }

  return prisma.user.findMany({
    where: {
      questionRequests: {
        some: {
          template: { id: templateId },
          status: "COMPLETED",
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Retorna usuários agrupados por turma para um template
// Usuários que responderam mas não estão em nenhuma turma com esse template ficam em "avulsos"
export async function fetchUsersByClassForTemplate(templateId: number) {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";
  const isProfessor = currentUser?.role === "PROFESSOR";

  // Aluno só vê a si mesmo
  if (!isAdmin && !isProfessor) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser.id } });
    return { byClass: [], avulsos: [user] };
  }

  // Busca classes que têm esse template, filtradas por professor se não for admin
  const classes = await prisma.class.findMany({
    where: {
      questionTemplates: { some: { id: templateId } },
      ...(!isAdmin && {
        OR: [
          { ownerId: currentUser.id },
          { collaborators: { some: { userId: currentUser.id } } },
        ],
      }),
    },
    include: {
      students: {
        where: {
          questionRequests: { some: { templateId, status: "COMPLETED" } },
        },
      },
    },
  });

  // IDs de todos os alunos já agrupados em alguma turma
  const studentIdsInClasses = new Set(
    classes.flatMap((c) => c.students.map((s) => s.id))
  );

  // Alunos que responderam mas não estão em nenhuma turma com esse template
  const avulsos = await prisma.user.findMany({
    where: {
      questionRequests: { some: { templateId, status: "COMPLETED" } },
      id: { notIn: [...studentIdsInClasses] },
    },
  });

  return {
    byClass: classes.map((c) => ({ id: c.id, name: c.name, students: c.students })),
    avulsos,
  };
}

export async function fetchRequestsForTemplate(
  templateId: number,
  userIdFilter?: number,
) {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

  // Se for USER: retorna apenas suas respostas
  const userId = !isAdmin ? currentUser?.id : userIdFilter;

  return await prisma.questionRequest.findMany({
    where: {
      templateId: templateId,
      status: "COMPLETED",
      ...(userId && { userId }),
    },
    include: {
      questions: {
        select: {
          id: true,
          type: true,
          answers: {
            ...(userId && {
              where: {
                userId,
              },
            }),
            select: {
              correct: true,
              autoEvaluation: {
                select: {
                  score: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
