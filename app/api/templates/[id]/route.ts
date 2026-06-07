import { getCurrentUser, isUserAdmin, getParamId } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const numericId = await getParamId({ params });

    const template = await prisma.questionRequestTemplate.findUnique({
      where: { id: numericId },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (!isUserAdmin(user) && template.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(template, { status: 200 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const numericId = await getParamId({ params });

    const template = await prisma.questionRequestTemplate.findUnique({
      where: { id: numericId },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (!isUserAdmin(user) && template.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updatedTemplate = await prisma.questionRequestTemplate.update({
      where: { id: numericId },
      data: body,
    });
    return NextResponse.json(updatedTemplate, { status: 200 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const numericId = await getParamId({ params });

    const template = await prisma.questionRequestTemplate.findUnique({
      where: { id: numericId },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (!isUserAdmin(user) && template.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { visible } = await req.json();
    if (typeof visible !== "boolean") {
      return NextResponse.json({ error: "visible must be a boolean" }, { status: 400 });
    }

    const updated = await prisma.questionRequestTemplate.update({
      where: { id: numericId },
      data: { visible },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const numericId = await getParamId({ params });

    const template = await prisma.questionRequestTemplate.findUnique({
      where: { id: numericId },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (!isUserAdmin(user) && template.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.questionRequestTemplate.delete({ where: { id: numericId } });
    return NextResponse.json({ message: "Template deleted successfully" }, { status: 200 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
