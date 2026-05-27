import { getCurrentUser, isUserAdmin, isUserProfessor } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!isUserAdmin(currentUser) && !isUserProfessor(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "email query param is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
