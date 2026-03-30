"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSearchParams } from "next/navigation";
import { fetchRequests } from "./server";
import { Suspense, useEffect, useState } from "react";
import Pagination from "@/components/pagination";
import { useRouter } from "next/navigation";
import { Question, QuestionRequest, QuestionRequestTemplate } from "@/prisma";
import { normalizeQuestionRequests } from "@/lib/utils";

interface ParameterValue {
  name: string;
  values: string[];
}

interface AutoEvaluation {
  score: number;
  justification: string;
  modelVersion: string | null;
  evaluatedAt: string;
  criteria: Array<{
    description: string;
    weight: number;
    score: number;
  }>;
}

interface Answer {
  id: number;
  answerIndex: number | null;
  confidenceLevel: number;
  correct: boolean;
  content: string;
  autoEvaluation: AutoEvaluation | null;
}

interface NormalizedQuestion extends Question {
  answers: Answer[];
}

interface NormalizedQuestionRequest extends QuestionRequest {
  user: { id: number; name: string | null };
  template: { id: number; name: string } | null;
  questions: NormalizedQuestion[];
}

interface ScoreResult {
  total: number;
  correct?: number;
  answered?: number;
  isDiscursive?: boolean;
  average?: number;
}

export default function QuestionRequestsPage() {
  return (
    <Suspense>
      <QuestionRequestsPageInner />
    </Suspense>
  );
}

function QuestionRequestsPageInner() {
  const [requests, setRequests] = useState<NormalizedQuestionRequest[] | null>(
    null,
  );
  const [templates, setTemplates] = useState<QuestionRequestTemplate[]>([]);
  const searchParams = useSearchParams();
  const userIdStr = searchParams?.get("userId") || null;
  const userId =
    userIdStr === null || userIdStr == "" ? undefined : parseInt(userIdStr, 10);
  const templateIdStr = searchParams?.get("templateId") || null;
  const templateId = templateIdStr ? parseInt(templateIdStr, 10) : undefined;

  const pageStr = searchParams?.get("page");
  const page = pageStr ? parseInt(pageStr, 10) : 1;
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();

  useEffect(() => {
    async function fetchTemplates() {
      const response = await fetch("/api/templates");
      const data = await response.json();
      setTemplates(data);
    }
    fetchTemplates();
  }, []);

  useEffect(() => {
    async function fetchData() {
      const result = await fetchRequests({
        userId,
        page,
        pageSize: 6,
        templateId,
      });
      setRequests(
        normalizeQuestionRequests(result.data) as NormalizedQuestionRequest[],
      );

      setTotalPages(result.totalPages);

      setCurrentPage(result.currentPage);
    }

    fetchData();
  }, [userId, page, templateId]);

  const handleRowClick = (requestId: number, requestUserId: number) => {
    router.push(
      `/questions?questionRequestId=${requestId}&userId=${requestUserId}`,
    );
  };

  const handleTemplateChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value === "all") {
      params.delete("templateId");
    } else {
      params.set("templateId", value);
    }
    params.set("page", "1"); // Reset to first page on filter change
    router.push(`/questionRequests?${params.toString()}`);
  };

  return (
    <>
      <div className="w-full max-w-5xl mx-auto p-4 my-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-slate-800 text-center">
            Histórico de Perguntas Geradas
          </h1>

          <div className="flex items-center gap-4">
            <div className="w-64">
              <h3> Filtros</h3>
              <Select
                onValueChange={handleTemplateChange}
                value={templateId ? templateId.toString() : "all"}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Filtrar por Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Templates</SelectItem>
                  {templates?.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id.toString()}
                    >
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {userId !== -1 ? (
              <a
                href="/questionRequests?userId=-1"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                Ver de todos os usuários&rarr;
              </a>
            ) : (
              <a
                href="/questionRequests"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                Ver minhas questões &rarr;
              </a>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[100px]">Data de Geração</TableHead>

                {userId === -1 && (
                  <TableHead className="w-[150px]">Usuário</TableHead>
                )}

                <TableHead className="text-center">Tema e Parâmetros</TableHead>

                {/* Score compacto */}
                <TableHead className="text-right">Desempenho</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.map((request: NormalizedQuestionRequest) => {
                const score = getNumberOfCorrectAnswers(request.questions);

                const scoreColor =
                  score?.correct &&
                  score.correct > 0 &&
                  score.correct === score.total
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-700";

                const isCompleted = request.status === "COMPLETED";
                const isCanceled = request.status === "CANCELED";
                const isFailed = request.status === "FAILED";

                return (
                  <TableRow
                    key={request.id}
                    className={`transition-colors ${isCompleted ? "cursor-pointer hover:bg-blue-50/50 group" : "opacity-60 bg-slate-50/50"}`}
                    onClick={() =>
                      isCompleted && handleRowClick(request.id, request.userId)
                    }
                  >
                    <TableCell className="align-top py-4">
                      <div className="text-sm font-medium text-slate-700">
                        {new Date(request.createdAt).toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "2-digit", year: "2-digit" },
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex">
                        Hora:{" "}
                        {new Date(request.createdAt).toLocaleTimeString(
                          "pt-BR",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </div>
                    </TableCell>

                    {/* USUÁRIO (Apenas se admin) */}
                    {userId === -1 && (
                      <TableCell className="align-top py-4">
                        <div className="font-medium text-sm">
                          {request.user.name}
                        </div>
                      </TableCell>
                    )}

                    <TableCell className="align-top py-4 max-w-[400px]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold text-slate-900 transition-colors ${isCompleted ? "group-hover:text-blue-600" : ""}`}
                          >
                            {request.template?.name}
                          </span>
                        </div>

                        <span
                          className="text-xs text-slate-500 truncate block w-full"
                          title={getParameterString(request.parameterValues)}
                        >
                          {getParameterString(request.parameterValues)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right align-top py-4">
                      {isCompleted ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            score.isDiscursive
                              ? "bg-blue-100 text-blue-700"
                              : scoreColor
                          }`}
                        >
                          {score.isDiscursive
                            ? `Média: ${score.average?.toFixed(2) || "0.00"}`
                            : `${score.correct} / ${score.total} acertos`}
                        </span>
                      ) : isCanceled ? (
                        <span className="text-xs text-slate-500 italic font-medium">
                          Cancelado
                        </span>
                      ) : isFailed ? (
                        <span className="text-xs text-red-500 italic font-medium">
                          Falha
                        </span>
                      ) : (
                        <span className="text-xs text-yellow-600 italic font-medium">
                          Processando...
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>{" "}
          </Table>
        </div>
        <div className="mt-4">
          <Pagination totalPages={totalPages} currentPage={currentPage} />
        </div>
      </div>
    </>
  );
}

function getParameterString(parameterValues: ParameterValue[]): string {
  if (parameterValues.length === 0) {
    return "Sem parâmetros";
  }
  return parameterValues
    .map((param: ParameterValue) => {
      if (param.values.length > 0) {
        return `${param.name}: ${param.values.join(", ")}`;
      } else {
        return `${param.name}: No values`;
      }
    })
    .join(", ");
}

function getNumberOfCorrectAnswers(
  questions: NormalizedQuestion[],
): ScoreResult {
  const questionsArray = Array.isArray(questions) ? questions : [questions];

  if (!Array.isArray(questionsArray) || questionsArray.length === 0)
    return {
      total: 0,
      correct: 0,
      answered: 0,
      isDiscursive: false,
      average: 0,
    };

  const total = questionsArray.length;
  const allDiscursive = questionsArray.every(
    (q: NormalizedQuestion) => q.type === "discursive",
  );

  // Se todas as questões forem discursivas, calcula a média
  if (allDiscursive) {
    let sum = 0;
    let count = 0;

    for (const question of questionsArray) {
      const autoEvaluation = question.answers[0]?.autoEvaluation;
      if (autoEvaluation) {
        const numericScore = Number(autoEvaluation.score);
        if (!isNaN(numericScore)) {
          sum += numericScore;
          count++;
        }
      }
    }

    const average = count > 0 ? sum / count : 0;
    return { total, isDiscursive: true, average };
  }

  // Lógica original para múltipla escolha
  let correct = 0;
  let answered = 0;

  for (const question of questionsArray) {
    if (question.type === "multiple-choice") {
      const answerIndex = question.answers[0]?.answerIndex;
      if (answerIndex !== undefined && answerIndex !== null) {
        answered++;
        if (answerIndex === question.correctAnswerIndex) {
          correct++;
        }
      }
    }
  }

  return { total, correct, answered, isDiscursive: false };
}
