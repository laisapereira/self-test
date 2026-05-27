import { isUserAdmin, isUserProfessor } from "@/lib/apiUtils";
import{ authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import{ nanoid } from "nanoid";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

   if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (isUserAdmin(user)) {
      const classes = await prisma.class.findMany();
      return NextResponse.json({ classes });
    }

    if (isUserProfessor(user)) {
      const classes = await prisma.class.findMany({
        where: {
          OR: [
            { ownerId: user.id },
            { collaborators: { some: { userId: user.id } } },
          ],
        },
      });
      return NextResponse.json({ classes });
    }

    const classes = await prisma.class.findMany({
      where: {
        students: { some: { id: user.id } },
      },
    });

    return NextResponse.json({ classes });

  } catch (error) {
    console.error("[ClassesAPI] error in GET", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try{
    
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!(isUserAdmin(user) || isUserProfessor(user))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, collaborators = [], students = [], questionTemplates = [], evaluationTemplates = [] } = await req.json();

    const newClass = await prisma.class.create({
      data: {
        owner: { connect: { id: user.id } },
        name,
        link: nanoid(8),
        collaborators: { create: collaborators.map((userId: number) => ({ userId })) },
        students: { connect: students.map((id: number) => ({ id })) },
        questionTemplates: { connect: questionTemplates.map((id: number) => ({ id })) },
        evaluationTemplates: { connect: evaluationTemplates.map((id: number) => ({ id })) },
      },
    });

    return NextResponse.json({ class: newClass }, { status : 201});

     } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("[ClassesAPI] error in POST", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}