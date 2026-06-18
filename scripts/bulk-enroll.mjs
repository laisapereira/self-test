// Configuração — edite antes de rodar
const CLASS_NAME = "Turma 2025.2";
const OWNER_EMAIL = "email@professor";

import { PrismaClient } from "../prisma/index.js";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) {
    console.error(`Usuário não encontrado: ${OWNER_EMAIL}`);
    process.exit(1);
  }

  const newClass = await prisma.class.create({
    data: {
      name: CLASS_NAME,
      link: nanoid(8),
      owner: { connect: { id: owner.id } },
    },
  });
  console.log(`Turma criada: "${newClass.name}" (id=${newClass.id})`);

  const studentsWithoutClass = await prisma.user.findMany({
    where: { role: "STUDENT", studentClasses: { none: {} } },
    select: { id: true },
  });
  console.log(`Alunos sem turma encontrados: ${studentsWithoutClass.length}`);

  await prisma.class.update({
    where: { id: newClass.id },
    data: { students: { connect: studentsWithoutClass.map((s) => ({ id: s.id })) } },
  });

  console.log(`Pronto! ${studentsWithoutClass.length} alunos matriculados.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
