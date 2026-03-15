import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } 

  const questionRequest = await prisma.questionRequest.findUnique({
    where: {id: Number(id)}
  })

  if (!questionRequest) {
    return NextResponse.json({ error: "Question request not found" }, { status: 404 });
  }

  return NextResponse.json(questionRequest);

}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } 

  const {status} = await req.json() 

  const updated = await prisma.questionRequest.update({
    where: {id: Number(id)},
    data: {status}
  })

  return NextResponse.json(updated);

}
