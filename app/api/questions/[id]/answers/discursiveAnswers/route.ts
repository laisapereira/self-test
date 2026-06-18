import { EvaluationCriteria } from "@/components/questionCard";
import { DEFAULT_EVALUATION_PREAMBLE } from "@/components/EvaluationTemplateForm";
import { getCurrentUser, getParamId, isUserAdmin } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { saveLlmUsage } from "@/lib/llmUsage";

type EvaluationRequestBody = {
  openAnswer: string;
  confidenceLevel: number;
  evaluationCriteria: EvaluationCriteria[];
};

async function getParams(req: Request, params: Promise<{ id: string }>) {
  const questionId = await getParamId({ params });

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) {
    throw NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const searchParams = new URL(req.url).searchParams;
  const userIdStr = searchParams.get("userId") || null;
  const userId =
    userIdStr === null || userIdStr == "" ? undefined : parseInt(userIdStr, 10);

  return { question, userId };
}

async function getEvaluationPreamble(
  requestId: number,
): Promise<string | null> {
  const request = await prisma.questionRequest.findUnique({
    where: { id: requestId },
  });
  if (!request?.templateId) return null;

  const template = await prisma.questionRequestTemplate.findUnique({
    where: { id: request.templateId },
  });
  if (!template?.evaluationTemplateId) return null;

  const evalTemplate = (await prisma.evaluationTemplate.findUnique({
    where: { id: template.evaluationTemplateId },
  })) as unknown as { evaluationPrompt: string | null } | null;
  return evalTemplate?.evaluationPrompt ?? null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    const { question, userId: requestedUserId } = await getParams(req, params);

    // Admins podem consultar a resposta de qualquer usuário via ?userId=X
    // Demais usuários só veem a própria resposta
    const targetUserId = requestedUserId && isUserAdmin(user) ? requestedUserId : user.id;

    const answer = await prisma.answer.findFirst({
      where: {
        questionId: question.id,
        userId: targetUserId,
      },
      include: {
        autoEvaluation: {
          include: { criteria: true },
        },
      },
    });

    if (!answer) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        answer,
        feedbackLLM: answer.autoEvaluation ?? null,
        criteriaScores: answer.autoEvaluation?.criteria ?? [],
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function evaluateAnswer(openai: OpenAI, prompt: string) {
  console.log(
    "[DiscursiveAnswersAPI] request enviada para LLM | model: deepseek-chat",
  );
  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: prompt }],
    model: "deepseek-chat",
    response_format: {
      type: "json_object",
    },
  });

  return completion;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    const { question } = await getParams(req, params);

    const existingAnswer = await prisma.answer.findFirst({
      where: { questionId: question.id, userId: user.id },
    });
    if (existingAnswer) {
      return NextResponse.json(
        { error: "Answer already exists" },
        { status: 400 },
      );
    }

    const { openAnswer, confidenceLevel, evaluationCriteria } =
      (await req.json()) as EvaluationRequestBody;

    const preamble =
      (await getEvaluationPreamble(question.requestId)) ?? DEFAULT_EVALUATION_PREAMBLE;

    const destructCriteria = evaluationCriteria
      .map(
        ({ weight, description }, index) =>
          `Critério ${index + 1}: ${description} e seu peso ${weight}`,
      )
      .join("\n");

    const formatedCriteria = JSON.stringify(evaluationCriteria, null, 2);

    const prompt = `${preamble}

### Enunciado da questão
"""${question.content}"""

### Resposta do aluno
"""${openAnswer}"""

### Critérios de avaliação

Use EXATAMENTE os critérios abaixo, na ordem em que são apresentados e com os pesos definidos:

Resumo dos critérios (apenas para leitura):
${destructCriteria}

Estrutura JSON exata dos critérios (NÃO altere nada aqui, apenas use):
\`\`\`json
${formatedCriteria}
\`\`\`

### Sua tarefa

1. Para **cada critério** do array \`evaluationCriteria\`:
  - Leia "description" e "weight";
  - Atribua um "score" de **0 a 10** com base na resposta do aluno;
  - Use apenas números inteiros ou com uma casa decimal.

2. Calcule "finalScore" como **média ponderada**:
  \`finalScore = (sum(score_i × weight_i)) ÷ (sum(weight_i))\`

3. Escreva "justification" em **Markdown**, seguindo esta estrutura obrigatória e sem desvios:

  Comece com 1 a 2 frases de resumo geral em texto simples, sem negrito e sem bullets. Exemplo: "A resposta demonstra compreensão básica do conceito, mas deixou de abordar aspectos importantes da implementação."

  Em seguida, adicione as seções abaixo. Cada título de seção DEVE estar em sua própria linha, precedido por uma linha em branco:

  **O que você acertou:**
  - (bullet por ponto positivo identificado na resposta)

  **O que faltou ou pode melhorar:**
  - (bullet por lacuna ou imprecisão)

  Se finalScore < 7, adicione também a seção abaixo — caso contrário, omita-a completamente:

  **Para revisar:**
  - Nome do livro ou curso — breve descrição de por que é relevante
  - (2 a 3 sugestões de livros clássicos, cursos gratuitos ou plataformas conhecidas relacionadas ao tema da questão)

4. Retorne um JSON com o seguinte formato:

{
  "autoEvaluation": [
    { "description": "texto EXATO de description do critério 1", "weight": 2, "score": 9 },
    { "description": "texto EXATO de description do critério 2", "weight": 1, "score": 8 }
  ],
  "finalScore": 8.67,
  "finalScoreFormula": "finalScore = (9×2 + 8×1) ÷ (2 + 1) = 26 ÷ 3 ≈ 8.67",
  "justification": "Resumo geral em 1-2 frases.\n\n**O que você acertou:**\n- ponto 1\n\n**O que faltou ou pode melhorar:**\n- ponto 1\n\n**Para revisar:**\n- Livro X — motivo"
}

### Regras do formato

- NÃO crie nem remova critérios.
- NÃO altere a ordem dos critérios.
- NÃO modifique o texto de "description": apenas copie o valor recebido.
- Retorne **apenas** o JSON final, sem comentários, sem texto extra e sem blocos de código (\`\`\`).`;

    const openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_API_URL,
    });

    const completion = await evaluateAnswer(openai, prompt);

    if (completion.usage) {
      const qr = await prisma.questionRequest.findUnique({
        where: { id: question.requestId },
        select: { templateId: true },
      });
      saveLlmUsage({
        type: "ANSWER_EVALUATION",
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        model: "deepseek-chat",
        userId: user.id,
        templateId: qr?.templateId,
      });
    }

    const llmResponse = completion.choices[0].message.content;
    const llmText =
      typeof llmResponse === "string"
        ? llmResponse
        : JSON.stringify(llmResponse);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(llmText);
    } catch (err) {
      console.error(
        "[DiscursiveAnswersAPI] falha ao fazer JSON.parse no retorno do LLM | texto:",
        llmText,
        err,
      );
      return NextResponse.json(
        { error: "LLM retornou uma resposta inválida (não é JSON puro)." },
        { status: 500 },
      );
    }

    const { autoEvaluation, finalScore, justification } =
      parsedResponse as {
        autoEvaluation: {
          description: string;
          weight: number;
          score: number;
        }[];
        finalScore: number;
        justification?: string;
      };

    console.log(
      "[DiscursiveAnswersAPI] avaliacao processada | score:",
      finalScore,
    );

    const isCorrect = finalScore >= 5.0;

    const answer = await prisma.answer.create({
      data: {
        questionId: question.id,
        userId: user.id,
        openAnswer,
        confidenceLevel,
        correct: isCorrect, // it's a boolean
      },
    });

    const feedbackLLM = await prisma.autoEvaluation.create({
      data: {
        answerId: answer.id,
        score: finalScore,
        justification: justification ?? "",
        modelVersion: "deepseek-chat",
        criteria: {
          create: autoEvaluation.map((c) => ({
            description: c.description,
            weight: c.weight,
            score: c.score,
          })),
        },
      },
      include: {
        criteria: true,
      },
    });

    const criteriaScores = feedbackLLM.criteria;

    return NextResponse.json(
      { answer, feedbackLLM, criteriaScores },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[DiscursiveAnswersAPI] erro na rota de resposta discursiva ao processar submissao",
      error,
    );
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { error: "Failed to create answer" },
      { status: 500 },
    );
  }
}
