import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "./auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    throw NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return user;
}

export async function getParamId({ params }: { params: Promise<{ id: string }> }) {
  const idString = (await params).id;
  if (!idString) {
    throw NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const id = parseInt(idString, 10);
  if (isNaN(id)) {
    throw NextResponse.json({ error: "id must be a number" }, { status: 400 });
  }

  return id;
}

export function isUserAdmin(user: { role?: string }) {
  return user.role === "ADMIN";
}

export function isUserStudent(user: { role?: string }) {
  return user.role === "STUDENT";
}

export function isUserProfessor(user: { role?: string }) {
  return user.role === "PROFESSOR";
}
