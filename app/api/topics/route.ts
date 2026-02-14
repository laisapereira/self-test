import prisma from "@/lib/prisma";
import { PrismaJson } from "@/prisma/types";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET(req: Request) {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(topics);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, parameters, evaluationCriteria } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newTopic = await prisma.topic.create({
      data: {
        name,
        parameters: parameters as PrismaJson.QuestionRequestTemplateParameter[] || [],
        evaluationCriteria: evaluationCriteria || null,
        ownerId: user.id,
      },
    });
    return NextResponse.json(newTopic, { status: 201 });
  } catch (error) {
    console.error("Error creating topic:", error);
    return NextResponse.json({ error: "Failed to create topic" }, { status: 500 });
  }
}
