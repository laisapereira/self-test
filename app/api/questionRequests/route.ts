import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { QuestionRequest, QuestionRequestStatus } from "@/prisma";
import { PrismaJson } from "@/prisma/types";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const requests = await prisma.questionRequest.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as QuestionRequestStatus } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("[QuestionRequestsAPI] error in GET", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId, parameterValues } = await req.json();
  if (!templateId || !parameterValues) {
    return NextResponse.json({ error: "templateId and parameterValues are required" }, { status: 400 });
  }
 
  const signal = req.signal;

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

   const newQuestionRequest = await prisma.questionRequest.create({
      data: {
        parameterValues,
        templateId,
        userId: user.id,
        status: 'PENDING'
      },
    });

    backgroundProcessing(newQuestionRequest);
    return NextResponse.json(newQuestionRequest, { status: 202 });

 /*    // atualiza o status para completado
    await prisma.questionRequest.update({
       where: { id: newQuestionRequest.id },
       data: { status: 'COMPLETED' }
    }); */

    
  } catch (error: any) {
    /* if (error.name === "AbortError" || error.message?.includes("abort")) {
      console.log("[QuestionRequestsAPI] request cancelada pelo cliente, marcando como CANCELED...");
      
      if (newQuestionRequest?.id) {
         await prisma.questionRequest.update({
            where: { id: newQuestionRequest.id },
            data: { status: 'CANCELED' }
         });
         console.log("[QuestionRequestsAPI] status atualizado para CANCELED.");
      }

      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }
    
    console.error("[QuestionRequestsAPI] falha ao gerar request, marcando como FAILED...", error);
    if (newQuestionRequest?.id) {
       await prisma.questionRequest.update({
          where: { id: newQuestionRequest.id },
          data: { status: 'FAILED' }
       });
    } */

    console.error("[QuestionRequestsAPI] falha ao criar request", error);

    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}


async function backgroundProcessing(questionRequest: QuestionRequest) {

  try {

    await generateQuestions(questionRequest)

    const currentRequest = await prisma.questionRequest.findUnique({
      where: { id: questionRequest.id }
    })

    if (currentRequest?.status ==='CANCELED') return

    await prisma.questionRequest.update({
      where: { id: questionRequest.id },
      data: { status: 'COMPLETED' }
    })

 console.log("[QuestionRequestsAPI] questões geradas com sucesso | id:", questionRequest.id)

  } catch (error: any) {
    console.error("[QuestionRequestsAPI] falha no background | id:", questionRequest.id, error)
    await prisma.questionRequest.update({
      where: { id: questionRequest.id },
      data: { status: "FAILED" }
    })
  }
}

async function generateQuestions(questionRequest: QuestionRequest) {
  const jsonString = await requestLLM(questionRequest);


  if (!jsonString) {
    throw new Error("No response from LLM");
  }
  // console.log('RESULT', jsonString);
  const json: PrismaJson.MultipleChoiceQuestionResponse | PrismaJson.DiscursiveQuestionResponse = JSON.parse(jsonString);
  const questions = json.questions;

  console.log("[QuestionRequestsAPI] questoes geradas com sucesso | qtd:", questions.length);
  // for each question, shuffle the alternatives, updating the correctAnswerIndex
  questions.forEach((question) => {

    //questão não tem o tipo. por isso a validação está frouxa,. preciso definir o tipo antes,
    // com uma espécie de flag mesmo, na hora de criar a questão no prompt template.



    if ('alternatives' in question) {

      const indices = Array.from({ length: question?.alternatives?.length }, (_, i) => i);
      indices.sort((i) => Math.random() - 0.5);
      // shuffle alternatives and update the index of the correct answer
      question.alternatives = indices.map((i) => question.alternatives[i]);
      question.correctAnswerIndex = indices.indexOf(question.correctAnswerIndex);
    } else {
      console.log('[QuestionRequestsAPI] questao discursiva formatada');
    }

  });

  await prisma.question.createMany({
    data: questions.map((question) => {


      if ('alternatives' in question) {
        return {
          content: question.content,
          correctAnswerIndex: question.correctAnswerIndex,
          type: "multiple-choice",
          requestId: questionRequest.id,
          alternatives: question.alternatives.map((alternative) => ({
            content: alternative.content,
            feedback: alternative.feedback,
          })),
        };
      } else {

        return {
          content: question.content,
          correctAnswerIndex: null,
          type: "discursive",
          requestId: questionRequest.id,
          alternatives: [],
          evaluationCriteria: question.evaluationCriteria,
        };
      }
    }),
  });
}

async function generatePrompt(questionRequest: QuestionRequest) {
  if (!questionRequest.templateId) {
    throw new Error("templateId is null");
  }

  const template = await prisma.questionRequestTemplate.findUnique({
    where: { id: questionRequest.templateId },
    include: {
      evaluationTemplate: {
        include: {
          criteria: {
            include: { criterion: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  const parameterValues = questionRequest.parameterValues;
  let prompt = template.promptTemplate.replace(/\<(\w+)\>/g, (_, key) => {
    const value = parameterValues.find((param) => param.name === key);
    return value ? value.values[0] : "";
  });

  if (template.evaluationTemplate?.criteria?.length) {
    const criteriaBase = template.evaluationTemplate.criteria.map((tc) => ({
      name: tc.criterion.name || tc.criterion.description,
      description: tc.criterion.description,
      weight: tc.weight,
    }));

    const criteriaJson = JSON.stringify(criteriaBase, null, 2);

    prompt +=
      `\n\nPara questões discursivas, preencha o campo "evaluationCriteria" de cada questão` +
      ` usando os critérios base abaixo. Para cada critério:\n` +
      `- Mantenha o "weight" exatamente como especificado.\n` +
      `- Reescreva o "description" de forma específica para o conteúdo da questão gerada,` +
      ` mencionando explicitamente o que será avaliado naquele critério para aquela questão em particular.` +
      ` Não copie a descrição genérica — adapte-a ao enunciado.\n\n` +
      `Critérios base:\n${criteriaJson}`;
  }

  return prompt;
}

async function requestLLM(questionRequest: QuestionRequest) {
  const prompt = await generatePrompt(questionRequest);




  const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_API_URL,
  });

  console.log('[QuestionRequestsAPI] request enviada para LLM | model: deepseek-chat');
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'system', content: prompt }],
    model: 'deepseek-chat',
    response_format: {
      type: 'json_object'
    }
  });


  return completion.choices[0].message.content;
}