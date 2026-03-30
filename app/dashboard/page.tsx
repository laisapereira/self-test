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
  fetchTemplates,
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
  answers: Array<{ correct: boolean }>;
}

interface DashboardQuestionRequest {
  id: number;
  userId: number;
  parameterValues: PrismaJson.QuestionRequestParameterValue[];
  questions: DashboardQuestion[];
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
  const parameterName = "topico";
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
      const templates = await fetchTemplates();
      setTemplates(templates);
    })();
  }, []);

  // Fetch users and requests for selected template
  useEffect(() => {
    if (selectedTemplateId === null) return;

    (async () => {
      const template = await fetchTemplate(selectedTemplateId);
      const param = template.parameters.find(
        (p: PrismaJson.QuestionRequestTemplateParameter) =>
          p.name === parameterName,
      );
      setParameterValues(param?.values || []);

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
  }, [selectedTemplateId, page]);

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
                {parameterValues.map((v) => (
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
                  {parameterValues.map((value: string) => (
                    <React.Fragment key={value}>
                      {(() => {
                        const x = Math.max(
                          ...questionRequests
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
                            .map(
                              (r: DashboardQuestionRequest) =>
                                r.questions.filter((q: DashboardQuestion) =>
                                  q.answers.find((a) => a.correct),
                                ).length,
                            ),
                        );
                        return (
                          <TableCell
                            className={`text-center ${x !== 0 && x !== -Infinity ? "bg-gray-200" : ""}`}
                          >
                            {x === -Infinity ? "" : x}
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
