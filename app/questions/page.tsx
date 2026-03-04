'use client';

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useState } from "react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { Marked } from "marked";
import { Suspense } from "react";
import 'highlight.js/styles/github.css';
import { QuestionCard } from "@/components/questionCard";
import { QuestionRequest } from "@/prisma";

const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);
function QuestionsPageInner() {
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<any[]>([]);
  const [requests, setRequests] = useState<QuestionRequest[] | null>(null);


  // Fetch questions from the server
  async function fetchQuestions(params: { templateId?: string, userId?: string, questionRequestId?: string }) {
    const { templateId, userId, questionRequestId } = params;



    const fetchSearchParams = new URLSearchParams();

    if (templateId) {
      fetchSearchParams.set('templateId', templateId);
    }
    if (userId) {
      fetchSearchParams.set('userId', userId);
    }
    if (questionRequestId) {
      fetchSearchParams.set('questionRequestId', questionRequestId);
    }

    const url = `/api/questions?${fetchSearchParams.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    setQuestions(data.questions);
  }

  useEffect(() => {
    const templateId = searchParams?.get("templateId") || undefined;
    const userId = searchParams?.get("userId") || undefined;
    const questionRequestId = searchParams?.get("questionRequestId") || undefined;
    fetchQuestions({ templateId, userId, questionRequestId });
  }, [searchParams]);

  const userIdStr = searchParams?.get('userId');
  const userId = userIdStr == undefined ? undefined : parseInt(userIdStr, 10);

  return <Card className="w-full">
    <CardHeader>
      <h1 className="text-2xl font-bold">Questões</h1>
    </CardHeader>
    <CardContent>
      {questions.length > 0 ? (
        questions.map((question: any, index: number) => (
          <div key={question.id} className="mb-4">
            <QuestionCard question={question} userId={userId} questionNumber={index + 1} />
          </div>
        ))
      ) : (
        <p className="text-gray-500">Nenhuma questão disponível por aqui ;/</p>
      )}
    </CardContent>
  </Card>
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <QuestionsPageInner />
    </Suspense>
  );
}
