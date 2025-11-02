import { getCurrentUser, getParamId } from "@/lib/apiUtils";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import OpenAI from "openai";


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
    const userId = userIdStr === null || userIdStr == '' ? undefined : parseInt(userIdStr, 10);

    return { question, userId };
}


async function evaluateAnswer(openai: OpenAI, prompt: string) {
    console.log('sending request to LLM');
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: prompt }],
            model: 'gpt-4o',
            response_format: {
            type: 'json_object'
            }
        });

        return completion.choices[0].message.content;
        }

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        const { question } = await getParams(req, params)

        // if an answer already exists for this question and user, return error
        const existingAnswer = await prisma.answer.findFirst({
            where: {
                questionId: question.id,
                userId: user.id,
            },
        });

        // get question
        if (existingAnswer) {
            return NextResponse.json({ error: "Answer already exists" }, { status: 400 });
        }

        //body: JSON.stringify({ openAnswer: discursiveAnswer, confidenceLevel, evaluationCriteria }),

        const { openAnswer, confidenceLevel, evaluationCriteria } = await req.json();

       const prompt = `
        Você é um especialista em avaliar respostas discursivas com base em critérios de avaliação específicos.

        Avalie a resposta do aluno abaixo utilizando os critérios fornecidos.

        Critérios de Avaliação:
        ${evaluationCriteria.join(', ')}

        Resposta do Aluno:
        """${openAnswer}"""

        Sua tarefa é analisar a resposta com base em cada critério e retornar um objeto JSON com o seguinte formato:

        {"autoEvaluation": {
            "score": Com base no ${evaluationCriteria}, forneça uma nota de 0 a 5 para a resposta do usuário. float,
            "justification": "Uma justificativa breve explicando a nota com base nos critérios ${evaluationCriteria}"
            }
        }
        `;

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL,
        });

        const llmResponse = await evaluateAnswer(openai, prompt)
        const { autoEvaluation } = JSON.parse(llmResponse as string)

        console.log(autoEvaluation)

        const answer = await prisma.answer.create({
        data: {
            questionId: question.id,
            userId: user.id,
            openAnswer,
            confidenceLevel,
            correct: autoEvaluation.score >= 3, // it's a boolean
        },
        });

       const feedbackLLM = await prisma.autoEvaluation.create({
        data: {
            answerId: answer.id,
            score: autoEvaluation.score,
            justification: autoEvaluation.justification,
            modelVersion: 'gpt-4o', 
  },
        })


    return NextResponse.json({answer, feedbackLLM}, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json({ error: "Failed to create answer" }, { status: 500 });
  }
}