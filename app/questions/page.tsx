"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useState } from "react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { Marked } from "marked";
import { Suspense } from "react";
import "highlight.js/styles/github.css";
import { QuestionCard } from "@/components/questionCard";
import { QuestionRequest } from "@/prisma";
import { Spinner } from "@/components/spinner";

const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);
function QuestionsPageInner() {
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<any[]>([]);
  const [requests, setRequests] = useState<QuestionRequest[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch questions from the server
  async function fetchQuestions(params: {
    templateId?: string;
    userId?: string;
    questionRequestId?: string;
  }) {
    const { templateId, userId, questionRequestId } = params;

    const fetchSearchParams = new URLSearchParams();

    if (templateId) {
      fetchSearchParams.set("templateId", templateId);
    }
    if (userId) {
      fetchSearchParams.set("userId", userId);
    }
    if (questionRequestId) {
      fetchSearchParams.set("questionRequestId", questionRequestId);
    }

    const url = `/api/questions?${fetchSearchParams.toString()}`;
    setIsLoading(true);
    try {
      const response = await fetch(url);
      const data = await response.json();
      setQuestions(data.questions);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const templateId = searchParams?.get("templateId") || undefined;
    const userId = searchParams?.get("userId") || undefined;
    const questionRequestId =
      searchParams?.get("questionRequestId") || undefined;
    fetchQuestions({ templateId, userId, questionRequestId });
  }, [searchParams]);

  const userIdStr = searchParams?.get("userId");
  const userId = userIdStr == undefined ? undefined : parseInt(userIdStr, 10);

  return (
    <Card className="w-full max-w-[90ch] mx-auto">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Questões</h1>
          <p className="text-xs text-slate-500">Total: {questions.length}</p>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        {isLoading ? (
          <Spinner>Carregando questões...</Spinner>
        ) : questions.length > 0 ? (
          <div className="grid gap-3">
            {questions.map((question: any, index: number) => (
              <QuestionCard
                key={question.id}
                question={question}
                userId={userId}
                questionNumber={index + 1}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            Nenhuma questão disponível por aqui ;/
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <QuestionsPageInner />
    </Suspense>
  );
}
