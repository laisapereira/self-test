import prisma from "@/lib/prisma";
import { PrismaJson } from "@/prisma/types";
import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session?.user?.isAdmin) {
      const templates = await prisma.questionRequestTemplate.findMany();
      return NextResponse.json(templates);
    } else {
      const templates = await prisma.questionRequestTemplate.findMany({
        select: { id: true, name: true, promptTemplate: true, parameters: true },
      });
      return NextResponse.json(templates);
    }
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
