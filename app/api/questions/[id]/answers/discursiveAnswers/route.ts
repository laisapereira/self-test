import { EvaluationCriteria } from "@/components/questionCard";
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
            model: 'deepkseek-chat',
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

        const { openAnswer, confidenceLevel, evaluationCriteria} = await req.json();

        console.log("CRITERIOS VINDO DO SUBMIT", evaluationCriteria)
      

/*         const criteriaJSON: EvaluationCriteria[] = evaluationCriteria.map((criteria: EvaluationCriteria) => ({
            description: criteria.description,
            weight: criteria.weight,
        })); */

          const formatedCriteria = JSON.stringify(evaluationCriteria, null, 2);

       const prompt = `
        Você é um especialista em avaliar respostas discursivas com base em critérios de avaliação específicos. A Resposta do Aluno é
        """${openAnswer}"""

        Avalie a resposta do aluno utilizando os critérios fornecidos, que são ${formatedCriteria}
        e seus respectivos pesos fornecidos em questão, em sua ordem respectiva em weight de ${formatedCriteria}

            1. Atribuir uma nota de **0 a 10** para **cada critério**, com base na resposta do aluno;
            2. Gerar um objeto JSON com:
            - "autoEvaluation": lista de objetos, cada um contendo:
                - "description": o nome do critério,
                - "weight": o peso atribuído a esse critério,
                - "score": a nota atribuída (0 a 10);
            - "finalScore": valor calculado pela **média ponderada** dos critérios;
            - "finalScoreFormula": string descritiva explicando como o cálculo foi feito.

            **Importante**: Retorne **apenas** o JSON no seguinte formato (exemplo):

            \`\`\`json
            {
            "autoEvaluation": [
                {
                "description": "Primeiro <criterio de teste> ",
                "weight": 2,
                "score": 9
                },
                {
                "description": "Segundo <criterio de teste>",
                "weight": 3,
                "score": 8
                }
            ],
            "finalScore": 8.43,
            "finalScoreFormula": "finalScore = (9×2 + 8×3) ÷ (2 + 3) = 42 ÷ 5 = 8.4"
            }
            \`\`\`

            Se algum critério não for aplicável, justifique no campo "score" com o valor 0 e mantenha a explicação na sua análise interna.

            Evite comentários fora do JSON. Apenas retorne o JSON conforme o formato acima.
            `;;

            console.log(prompt)

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
            modelVersion: 'deepseek-chat', 
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