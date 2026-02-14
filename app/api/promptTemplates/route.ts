import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const questionType = searchParams.get("questionType");

    const where = questionType ? { questionType } : {};

    const promptTemplates = await prisma.promptTemplate.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(promptTemplates);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch prompt templates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, questionType, promptTemplate } = await req.json();
  if (!name || !questionType || !promptTemplate) {
    return NextResponse.json(
      { error: "Name, questionType and promptTemplate are required" },
      { status: 400 }
    );
  }

  try {
    const newPromptTemplate = await prisma.promptTemplate.create({
      data: {
        name,
        questionType,
        promptTemplate,
      },
    });
    return NextResponse.json(newPromptTemplate, { status: 201 });
  } catch (error) {
    console.error("Error creating prompt template:", error);
    return NextResponse.json({ error: "Failed to create prompt template" }, { status: 500 });
  }
}
