import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await prisma.evaluationTemplate.findMany({
      include: {
        criteria: {
          include: { criterion: true },
          orderBy: { order: "asc" },
        },
        _count: { select: { questionRequestTemplates: true } },
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const template = await prisma.evaluationTemplate.create({
      data: {
        name,
        description: description || null,
        evaluationPrompt: evaluationPrompt || null,
        ownerId: user.id,
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

    return NextResponse.json(template, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create evaluation template" },
      { status: 500 },
    );
  }
}
