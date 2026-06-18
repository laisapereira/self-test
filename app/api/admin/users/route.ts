import { getCurrentUser, isUserAdmin } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "PROFESSOR", "ADMIN"]),
});

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!isUserAdmin(currentUser)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const name = parsed.data.name?.trim();
    const email = parsed.data.email.toLowerCase();
    const role = parsed.data?.role
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: name ?? undefined,
        role,
        passwordHash,
      },
      create: {
        email,
        name: name ?? null,
        role,
        passwordHash,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
