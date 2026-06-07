import { getCurrentUser, isUserAdmin } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();

    const questionRequest = await prisma.questionRequest.findUnique({
      where: { id: Number(id) },
    });

    if (!questionRequest) {
      return NextResponse.json({ error: "Question request not found" }, { status: 404 });
    }

    if (questionRequest.userId !== user.id && !isUserAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(questionRequest);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();

    const questionRequest = await prisma.questionRequest.findUnique({
      where: { id: Number(id) },
    });

    if (!questionRequest) {
      return NextResponse.json({ error: "Question request not found" }, { status: 404 });
    }

    if (questionRequest.userId !== user.id && !isUserAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status } = await req.json();

    const updated = await prisma.questionRequest.update({
      where: { id: Number(id) },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
