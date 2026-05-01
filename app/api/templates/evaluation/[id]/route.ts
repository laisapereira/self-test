import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function parseId(id: string) {
  const n = parseInt(id, 10);
  return isNaN(n) ? null : n;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numericId = parseId(id);
  if (!numericId) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const template = await prisma.evaluationTemplate.findUnique({
      where: { id: numericId },
      include: {
        criteria: {
          include: { criterion: true },
          orderBy: { order: "asc" },
        },
        _count: { select: { questionRequestTemplates: true } },
      },
    });
    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch evaluation template" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numericId = parseId(id);
  if (!numericId) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const { name, description, evaluationPrompt, criteria } = await req.json();
  if (!name || !criteria?.length) {
    return NextResponse.json(
      { error: "Name and criteria are required" },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.evaluationTemplateCriterion.deleteMany({
      where: { templateId: numericId },
    });

    const updated = await prisma.evaluationTemplate.update({
      where: { id: numericId },
      data: {
        name,
        description: description || null,
        evaluationPrompt: evaluationPrompt || null,
        criteria: {
          create: criteria.map(
            (c: { criterionName: string; description: string; weight: number }, index: number) => ({
              weight: c.weight,
              order: index,
              criterion: {
                create: { name: c.criterionName, description: c.description, ownerId: user.id },
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

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update evaluation template" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numericId = parseId(id);
  if (!numericId) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const linkedCount = await prisma.questionRequestTemplate.count({
      where: { evaluationTemplateId: numericId },
    });
    if (linkedCount > 0) {
      return NextResponse.json(
        {
          error: `Não é possível excluir: ${linkedCount} template(s) de questão utiliza(m) este template de avaliação.`,
        },
        { status: 409 },
      );
    }

    await prisma.evaluationTemplate.delete({ where: { id: numericId } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete evaluation template" },
      { status: 500 },
    );
  }
}
