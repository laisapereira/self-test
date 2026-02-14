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
    await prisma.topic.delete({
      where: { id: numericId },
    });
    return NextResponse.json({ message: "Topic deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete topic" }, { status: 500 });
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
    const { name, parameters, evaluationCriteria } = await req.json();
    const updatedTopic = await prisma.topic.update({
      where: { id: numericId },
      data: {
        name,
        parameters,
        evaluationCriteria,
      },
    });
    return NextResponse.json(updatedTopic, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update topic" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  try {
    const topic = await prisma.topic.findUnique({
      where: { id: numericId },
    });
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }
    return NextResponse.json(topic, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch topic" }, { status: 500 });
  }
}
