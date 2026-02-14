import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  try {
    await prisma.promptTemplate.delete({
      where: { id: numericId },
    });
    return NextResponse.json({ message: "Prompt template deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete prompt template" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  try {
    const { name, questionType, promptTemplate } = await req.json();
    const updatedPromptTemplate = await prisma.promptTemplate.update({
      where: { id: numericId },
      data: {
        name,
        questionType,
        promptTemplate,
      },
    });
    return NextResponse.json(updatedPromptTemplate, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update prompt template" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  try {
    const promptTemplate = await prisma.promptTemplate.findUnique({
      where: { id: numericId },
    });
    if (!promptTemplate) {
      return NextResponse.json({ error: "Prompt template not found" }, { status: 404 });
    }
    return NextResponse.json(promptTemplate, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch prompt template" }, { status: 500 });
  }
}
