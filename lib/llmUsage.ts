import prisma from "@/lib/prisma";
import { LlmUsageType } from "@/prisma";

export async function saveLlmUsage(params: {
  type: LlmUsageType;
  promptTokens: number;
  completionTokens: number;
  model: string;
  userId?: number;
  templateId?: number | null;
}) {
  try {
    let classId: number | undefined;

    // Resolve classId: find the class that has this template and this user (student, owner, or collaborator)
    if (params.userId && params.templateId) {
      const cls = await prisma.class.findFirst({
        where: {
          questionTemplates: { some: { id: params.templateId } },
          OR: [
            { students: { some: { id: params.userId } } },
            { ownerId: params.userId },
            { collaborators: { some: { userId: params.userId } } },
          ],
        },
        select: { id: true },
      });
      classId = cls?.id;
    }

    await prisma.llmUsage.create({
      data: {
        type: params.type,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        model: params.model,
        userId: params.userId,
        templateId: params.templateId ?? undefined,
        classId,
      },
    });
  } catch {
    // best-effort — never block the main flow
  }
}
