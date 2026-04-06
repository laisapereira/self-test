"use client";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import React, { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  fetchRequestsForTemplate,
  fetchTemplate,
  fetchUsersWhoUsedTemplate,
} from "./server";
import { QuestionRequestTemplate, User } from "../../prisma";
import { PrismaJson } from "@/prisma/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardQuestion {
  id: number;
  type: string;
  answers: Array<{
    correct: boolean;
    autoEvaluation?: { score: number } | null;
  }>;
}

interface DashboardQuestionRequest {
  id: number;
  userId: number;
  parameterValues: PrismaJson.QuestionRequestParameterValue[];
  questions: DashboardQuestion[];
}

interface RequestScore {
  value: number;
  isDiscursive: boolean;
  tooltip?: string;
}

function getRequestScore(request: DashboardQuestionRequest): RequestScore | null {
  const questions = request.questions || [];
  if (questions.length === 0) return null;

  const allDiscursive = questions.every((q) => q.type === "discursive");
  if (allDiscursive) {
    let sum = 0;
    let count = 0;
    for (const q of questions) {
      const score = q.answers?.[0]?.autoEvaluation?.score;
      if (typeof score === "number" && !Number.isNaN(score)) {
        sum += score;
        count += 1;
      }
    }
    if (count === 0) return null;
    return {
      value: sum / count,
      isDiscursive: true,
      tooltip: `Média baseada em ${count} questão(ões) avaliadas (de ${questions.length})`,
    };
  }

  const correctCount = questions
    .map((q) => (q.answers?.some((a) => a.correct) ? 1 : 0))
    .reduce((acc, v) => acc + v, 0);

  return { value: correctCount, isDiscursive: false };
}
export default function Dashboard() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const { data: session, status } = useSession();
  const [parameterName, setParameterName] = useState("topico");
  const [templates, setTemplates] = useState<QuestionRequestTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [parameterValues, setParameterValues] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [questionRequests, setQuestionRequests] = useState<
    DashboardQuestionRequest[]
  >([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const isAdmin = session?.user?.isAdmin || false;

  // Fetch templates
  useEffect(() => {
    (async () => {
      const response = await fetch("/api/templates");
      if (!response.ok) {
        setTemplates([]);
        return;
      }
      const data = await response.json();
      setTemplates(data);
    })();
  }, []);

  // Fetch users and requests for selected template
  useEffect(() => {
    if (status !== "authenticated") return;
    if (selectedTemplateId === null) return;

    (async () => {
      const template = await fetchTemplate(selectedTemplateId);
      const params = Array.isArray(template.parameters)
        ? (template.parameters as PrismaJson.QuestionRequestTemplateParameter[])
        : [];
      const preferred =
        params.find((p) => p.name === "topico") ?? params[0];
      setParameterName(preferred?.name || "topico");
      setParameterValues(preferred?.values || []);

      const result = await fetchUsersWhoUsedTemplate(
        selectedTemplateId,
        page,
        pageSize,
      );
      setUsers(result.users);
      setTotalPages(result.totalPages);

      // Fetch requests for all users on this page (for admin) or just current user (for regular user)
      let allRequests: DashboardQuestionRequest[] = [];
      for (const user of result.users) {
        const requests = await fetchRequestsForTemplate(
          selectedTemplateId,
          user.id,
        );
        allRequests = allRequests.concat(
          requests as DashboardQuestionRequest[],
        );
      }
      setQuestionRequests(allRequests);
    })();
  }, [selectedTemplateId, page, status]);

  // Auto-select first template when list loads
  useEffect(() => {
    if (selectedTemplateId !== null) return;
    if (!templates || templates.length === 0) return;
    setSelectedTemplateId(templates[0].id);
  }, [templates, selectedTemplateId]);

  return (
    <div className="p-4">
      {status === "loading" && (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      )}

      {status === "unauthenticated" && (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-sm text-red-600">
            Você precisa estar logado para acessar o dashboard
          </p>
        </div>
      )}

      {status === "authenticated" && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-4">Dashboard de Desempenho</h1>

            {!isAdmin && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-700">
                Você está visualizando apenas suas próprias notas
              </div>
            )}

            {isAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 text-sm text-amber-700">
                Você está visualizando as notas de todos os alunos (Modo Admin)
              </div>
            )}

            <div className="mb-4">
              <label className="text-sm font-medium block mb-2">
                Selecione um template de questão:
              </label>
              <Select
                key="mysel"
                onValueChange={(value) => {
                  setSelectedTemplateId(Number(value));
                  setPage(1); // Reset page when template changes
                }}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map(
                    (template: QuestionRequestTemplate, index: number) => (
                      <SelectItem
                        key={`k${index}`}
                        value={template.id.toString()}
                      >
                        {template.name}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {selectedTemplateId && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Usuário</TableHead>
                <TableHead className="text-center">Resumo</TableHead>
                {parameterValues.length > 0 &&
                  parameterValues.map((v) => (
                    <React.Fragment key={v}>
                      <TableHead className="text-center">
                        {v.substring(0, 7)}
                      </TableHead>
                    </React.Fragment>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={`u${user.id}`}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  {(() => {
                    const scores = questionRequests
                      .filter(
                        (r: DashboardQuestionRequest) => r.userId === user.id,
                      )
                      .map(getRequestScore)
                      .filter(Boolean) as RequestScore[];

                    const best =
                      scores.length > 0
                        ? scores.reduce((max, cur) =>
                            cur.value > max.value ? cur : max,
                          )
                        : null;

                    const displayValue = best
                      ? best.isDiscursive
                        ? best.value.toFixed(1)
                        : String(best.value)
                      : "";

                    const numericValue = best ? best.value : -Infinity;
                    return (
                      <TableCell
                        className={`text-center ${numericValue !== 0 && numericValue !== -Infinity ? "bg-gray-200" : ""}`}
                        title={best?.isDiscursive ? best.tooltip : undefined}
                      >
                        {displayValue}
                      </TableCell>
                    );
                  })()}
                  {parameterValues.length > 0 &&
                    parameterValues.map((value: string) => (
                      <React.Fragment key={value}>
                        {(() => {
                          const scores = questionRequests
                            .filter(
                              (r: DashboardQuestionRequest) =>
                                r.userId === user.id,
                            )
                            .filter((r: DashboardQuestionRequest) =>
                              r.parameterValues.find(
                                (p: PrismaJson.QuestionRequestParameterValue) =>
                                  p.name === parameterName &&
                                  p.values.includes(value),
                              ),
                            )
                            .map(getRequestScore)
                            .filter(Boolean) as RequestScore[];

                          const best =
                            scores.length > 0
                              ? scores.reduce((max, cur) =>
                                  cur.value > max.value ? cur : max,
                                )
                              : null;

                          const displayValue = best
                            ? best.isDiscursive
                              ? best.value.toFixed(1)
                              : String(best.value)
                            : "";

                          const numericValue = best ? best.value : -Infinity;
                          return (
                            <TableCell
                              className={`text-center ${numericValue !== 0 && numericValue !== -Infinity ? "bg-gray-200" : ""}`}
                              title={
                                best?.isDiscursive ? best.tooltip : undefined
                              }
                            >
                              {displayValue}
                            </TableCell>
                          );
                        })()}
                      </React.Fragment>
                    ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination - only show for admin */}
          {isAdmin && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Página {page} de {totalPages} ({users.length} usuários nesta
                página)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-2 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
