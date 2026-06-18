import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { saveLlmUsage } from "@/lib/llmUsage";

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_API_URL,
  });
}

export async function generateAndSaveFeedbackSummary(
  studentId: number,
  templateId: number,
): Promise<string | null> {
  // Busca todos os feedbacks (justificativas) desse aluno para esse template
  const justifications = await prisma.autoEvaluation.findMany({
    where: {
      answer: {
        userId: studentId,
        question: {
          request: { templateId },
        },
      },
    },
    select: { justification: true, evaluatedAt: true },
    orderBy: { evaluatedAt: "asc" },
  });

  if (justifications.length === 0) return null;

  const template = await prisma.questionRequestTemplate.findUnique({
    where: { id: templateId },
    select: { name: true },
  });

  const feedbackList = justifications
    .map((j, i) => `Feedback ${i + 1}:\n${j.justification}`)
    .join("\n\n---\n\n");

  const prompt = `Você é um assistente educacional. Abaixo estão os feedbacks de avaliação recebidos por um aluno ao responder questões sobre o tema "${template?.name ?? "desconhecido"}":

${feedbackList}

Com base nesses feedbacks, escreva um resumo em **3 a 5 tópicos** em português sobre o que esse aluno deveria estudar e melhorar. Seja específico, prático e foque nas lacunas identificadas — não nos acertos. Use bullet points iniciados com "- ".

Retorne apenas JSON no formato: { "summary": "- tópico 1\n- tópico 2\n- tópico 3" }`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system", content: prompt }],
    response_format: { type: "json_object" },
  });

  if (completion.usage) {
    saveLlmUsage({
      type: "PERFORMANCE_SUMMARY",
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      model: "deepseek-chat",
      userId: studentId,
      templateId,
    });
  }

  const raw = completion.choices[0].message.content;
  if (!raw) return null;

  let summary: string;
  try {
    summary = JSON.parse(raw).summary as string;
  } catch {
    return null;
  }

  await prisma.studentTemplateFeedbackSummary.upsert({
    where: { studentId_templateId: { studentId, templateId } },
    create: { studentId, templateId, summary },
    update: { summary },
  });

  return summary;
}
