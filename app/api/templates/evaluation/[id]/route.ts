import { getCurrentUser, isUserAdmin, getParamId } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    const numericId = await getParamId({ params });

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
    if (!isUserAdmin(user) && template.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Failed to fetch evaluation template" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    const numericId = await getParamId({ params });

    const template = await prisma.evaluationTemplate.findUnique({
      where: { id: numericId },
    });
    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isUserAdmin(user) && template.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, description, evaluationPrompt, criteria } = await req.json();
    if (!name || !criteria?.length) {
      return NextResponse.json({ error: "Name and criteria are required" }, { status: 400 });
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
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Failed to update evaluation template" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    const numericId = await getParamId({ params });

    const template = await prisma.evaluationTemplate.findUnique({
      where: { id: numericId },
    });
    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isUserAdmin(user) && template.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const linkedCount = await prisma.questionRequestTemplate.count({
      where: { evaluationTemplateId: numericId },
    });
    if (linkedCount > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: ${linkedCount} template(s) de questão utiliza(m) este template de avaliação.` },
        { status: 409 },
      );
    }

    await prisma.evaluationTemplate.delete({ where: { id: numericId } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Failed to delete evaluation template" }, { status: 500 });
  }
}
