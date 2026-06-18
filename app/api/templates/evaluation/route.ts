import prisma from "@/lib/prisma";
import { getCurrentUser, isUserAdmin, isUserProfessor } from "@/lib/apiUtils";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!isUserAdmin(currentUser) && !isUserProfessor(currentUser)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Admin vê todos; professor vê apenas os seus
    const where = isUserAdmin(currentUser) ? {} : { ownerId: currentUser.id };

    const templates = await prisma.evaluationTemplate.findMany({
      where,
      include: {
        criteria: {
          include: { criterion: true },
          orderBy: { order: "asc" },
        },
        _count: { select: { questionRequestTemplates: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch evaluation templates" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!isUserAdmin(currentUser) && !isUserProfessor(currentUser)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, description, evaluationPrompt, criteria } = await req.json();
    if (!name || !criteria?.length) {
      return NextResponse.json(
        { error: "Name and criteria are required" },
        { status: 400 },
      );
    }

    const template = await prisma.evaluationTemplate.create({
      data: {
        name,
        description: description || null,
        evaluationPrompt: evaluationPrompt || null,
        ownerId: currentUser.id,
        criteria: {
          create: criteria.map(
            (c: { criterionName: string; description: string; weight: number }, index: number) => ({
              weight: c.weight,
              order: index,
              criterion: {
                create: { name: c.criterionName, description: c.description, ownerId: currentUser.id },
              },
            }),
          ),
        },
      },
      include: {
        criteria: {
          include: { criterion: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Failed to create evaluation template" },
      { status: 500 },
    );
  }
}
