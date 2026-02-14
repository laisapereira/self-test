import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";
import { QuestionRequest } from "@/prisma";
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
  const session = await getServerSession();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId, templateId, parameterValues, questionType } = await req.json();

  // Suporta tanto o novo modelo (topicId) quanto o antigo (templateId) durante a transição
  if (!topicId && !templateId) {
    return NextResponse.json({ error: "topicId or templateId is required" }, { status: 400 });
  }

  if (!parameterValues) {
    return NextResponse.json({ error: "parameterValues is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ajustar para gerar questao baseada em um template x

    const newQuestionRequest = await prisma.questionRequest.create({
      data: {
        parameterValues,
        questionType: questionType || "multiple-choice",
        topicId: topicId || null,
        templateId: templateId || null,
        userId: user.id,
      },
    });

    await generateQuestions(newQuestionRequest);

    return NextResponse.json(newQuestionRequest, { status: 201 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Failed to create question request" }, { status: 500 });
  }
}

async function generateQuestions(questionRequest: QuestionRequest) {
  const jsonString = await requestLLM(questionRequest);

  console.log('JSON STRING', jsonString);
  if (!jsonString) {
    throw new Error("No response from LLM");
  }
  // console.log('RESULT', jsonString);
  const json: PrismaJson.MultipleChoiceQuestionResponse | PrismaJson.DiscursiveQuestionResponse = JSON.parse(jsonString);
  const questions = json.questions;

  console.log("As questoes geradas", json.questions);
  // for each question, shuffle the alternatives, updating the correctAnswerIndex
  questions.forEach((question) => {

    //questão não tem o tipo. por isso a validação está frouxa,. preciso definir o tipo antes,
    // com uma espécie de flag mesmo, na hora de criar a questão no prompt template.

    //console.log("Tipo da questão", question.type);

    if ('alternatives' in question) {

      const indices = Array.from({ length: question?.alternatives?.length }, (_, i) => i);
      indices.sort((i) => Math.random() - 0.5);
      // shuffle alternatives and update the index of the correct answer
      question.alternatives = indices.map((i) => question.alternatives[i]);
      question.correctAnswerIndex = indices.indexOf(question.correctAnswerIndex);
    } else {
      console.log('Questão discursiva gerada:', question);
    }

  });

  await prisma.question.createMany({
    data: questions.map((question) => {

      console.log("Criação da questão", question.type);
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
  let promptTemplate: string;
  let topicName: string = "";

  // Novo modelo: usa Topic + PromptTemplate genérico
  if (questionRequest.topicId) {
    const topic = await prisma.topic.findUnique({
      where: { id: questionRequest.topicId },
    });

    if (!topic) {
      throw new Error("Topic not found");
    }

    topicName = topic.name;

    // Buscar o PromptTemplate genérico baseado no tipo de questão
    const genericPromptTemplate = await prisma.promptTemplate.findFirst({
      where: { questionType: questionRequest.questionType || "multiple-choice" },
    });

    if (!genericPromptTemplate) {
      throw new Error("Generic prompt template not found for question type: " + questionRequest.questionType);
    }

    promptTemplate = genericPromptTemplate.promptTemplate;
  }
  // Modelo antigo: usa QuestionRequestTemplate
  else if (questionRequest.templateId) {
    const template = await prisma.questionRequestTemplate.findUnique({
      where: { id: questionRequest.templateId },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    topicName = template.name;
    promptTemplate = template.promptTemplate;
  } else {
    throw new Error("Neither topicId nor templateId provided");
  }

  // Substituir placeholders no prompt
  const parameterValues = questionRequest.parameterValues;

  // Adicionar o nome do tema aos parâmetros
  const allParams = [
    ...parameterValues,
    { name: "tema", values: [topicName] }
  ];

  // Montar string de parâmetros adicionais
  const paramMap = new Map(
    allParams.map((param: any) => [param.name.toLowerCase(), param.values])
  );

  const prompt = promptTemplate.replace(/<([^>]+)>/g, (_, key) => {
    const matchValues = paramMap.get(key.toLowerCase());
    if (!matchValues || matchValues.length === 0) return `<${key}>`;

    return matchValues.length > 1
      ? matchValues.join(", ")
      : matchValues[0] || `<${key}>`;
  });

  return prompt;
}

async function requestLLM(questionRequest: QuestionRequest) {
  const prompt = await generatePrompt(questionRequest);


  console.log(prompt);

  const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_API_URL,
  });

  console.log('sending request to LLM');
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'system', content: prompt }],
    model: 'deepseek-chat',
    response_format: {
      type: 'json_object'
    }
  });


  return completion.choices[0].message.content;
}