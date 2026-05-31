import prisma from "@/lib/prisma";
import { PrismaJson } from "@/prisma/types";
import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCurrentUser, isUserAdmin, isUserProfessor } from "@/lib/apiUtils";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const onlyVisible = searchParams.get("visible") === "true";
    const classId = searchParams.get("classId");

    // Se classId fornecido, retorna só os templates daquela turma
    if (classId) {
      const templates = await prisma.questionRequestTemplate.findMany({
        where: {
          classes: { some: { id: parseInt(classId, 10) } },
        },
        select: { id: true, name: true, promptTemplate: true, parameters: true },
      });
      return NextResponse.json(templates);
    }

    const currentUser = await getCurrentUser();

    // Admin vê tudo, com owner incluído para agrupamento
    if (isUserAdmin(currentUser) && !onlyVisible) {
      const templates = await prisma.questionRequestTemplate.findMany({
        include: { owner: { select: { id: true, name: true, email: true } } },
      });
      return NextResponse.json(templates);
    }

    // Professor vê os seus + os das turmas que gerencia
    if (isUserProfessor(currentUser)) {
      const templates = await prisma.questionRequestTemplate.findMany({
        where: {
          OR: [
            { ownerId: currentUser.id },
            {
              classes: {
                some: {
                  OR: [
                    { ownerId: currentUser.id },
                    { collaborators: { some: { userId: currentUser.id } } },
                  ],
                },
              },
            },
          ],
        },
      });
      return NextResponse.json(templates);
    }

    // RF05: aluno sem turma não vê templates
    const hasClass = await prisma.class.findFirst({
      where: { students: { some: { id: currentUser.id } } },
    });

    if (!hasClass) return NextResponse.json([]);

    // Aluno com turma vê templates visíveis das suas turmas
    const templates = await prisma.questionRequestTemplate.findMany({
      where: {
        visible: true,
        classes: { some: { students: { some: { id: currentUser.id } } } },
      },
      select: { id: true, name: true, promptTemplate: true, parameters: true },
    });
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 },
    );
  }
}
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !session.user ||
    !session.user.email ||
    !session.user.isAdmin
  ) {
    console.log("[POST /api/templates] Unauthorized reject:", {
      hasSession: !!session,
      email: session?.user?.email,
      isAdmin: session?.user?.isAdmin
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, promptTemplate, parameters } = await req.json();
  if (!name || !promptTemplate) {
    return NextResponse.json(
      { error: "Name and promptTemplate are required" },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newTemplate = await prisma.questionRequestTemplate.create({
      data: {
        name,
        promptTemplate,
        parameters: parameters as PrismaJson.QuestionRequestTemplateParameter[],
        ownerId: user.id,
      },
    });
    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 },
    );
  }
}
