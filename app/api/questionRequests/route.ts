import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";
import { QuestionRequest } from "@/prisma";
import { authOptions } from "@/lib/auth";
import { PrismaJson } from "@/prisma/types";

export async function GET(req: Request) {
  try {
    const requests = await prisma.questionRequest.findMany();
    return NextResponse.json(requests);
  } catch (error) {
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

  let newQuestionRequest;

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    newQuestionRequest = await prisma.questionRequest.create({
      data: {
        parameterValues,
        templateId,
        userId: user.id,
      },
    });

    const signal = req.signal;
    await generateQuestions(newQuestionRequest, signal);

    // atualiza o status para completado
    await prisma.questionRequest.update({
       where: { id: newQuestionRequest.id },
       data: { status: 'COMPLETED' }
    });

    return NextResponse.json(newQuestionRequest, { status: 201 });
  } catch (error: any) {
    if (error.name === "AbortError" || error.message?.includes("abort")) {
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
    }

    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

async function generateQuestions(questionRequest: QuestionRequest, signal: AbortSignal) {
  const jsonString = await requestLLM(questionRequest, signal);


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
  });

  if (!template) {
    throw new Error("Template not found");
  }

  const promptTemplate = template.promptTemplate;
  const parameterValues = questionRequest.parameterValues;
  const prompt = promptTemplate.replace(/\<(\w+)\>/g, (_, key) => {
    const value = parameterValues.find((param) => param.name === key);
    return value ? value.values[0] : "";
  });
  return prompt;
}

async function requestLLM(questionRequest: QuestionRequest, signal: AbortSignal) {
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
  }, { signal });


  return completion.choices[0].message.content;
}