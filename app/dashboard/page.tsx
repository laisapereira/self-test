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
  fetchAllUsersForTemplate,
  fetchRequestsForTemplate,
  fetchTemplate,
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
import { SemesterAccordion } from "@/components/SemesterAccordion";
import { groupBySemester, sortedSemesters } from "@/lib/semester";

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

function getRequestScore(
  request: DashboardQuestionRequest,
): RequestScore | null {
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
    .reduce((acc, v) => acc + v, 0 as number);

  return { value: correctCount, isDiscursive: false };
}

function ScoreCell({
  requests,
  userId,
  parameterName,
  parameterValue,
}: {
  requests: DashboardQuestionRequest[];
  userId: number;
  parameterName?: string;
  parameterValue?: string;
}) {
  const filtered = requests
    .filter((r) => r.userId === userId)
    .filter((r) =>
      parameterName && parameterValue
        ? r.parameterValues.find(
            (p: PrismaJson.QuestionRequestParameterValue) =>
              p.name === parameterName && p.values.includes(parameterValue),
          )
        : true,
    );

  const scores = filtered.map(getRequestScore).filter(Boolean) as RequestScore[];
  const best =
    scores.length > 0
      ? scores.reduce((max, cur) => (cur.value > max.value ? cur : max))
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
}

function SemesterTable({
  users,
  requests,
  parameterName,
  parameterValues,
}: {
  users: User[];
  requests: DashboardQuestionRequest[];
  parameterName: string;
  parameterValues: string[];
}) {
  return (
    <div className="overflow-x-auto bg-white">
      <Table className="w-full min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">Usuário</TableHead>
            <TableHead className="text-center">Resumo</TableHead>
            {parameterValues.map((v) => (
              <TableHead key={v} className="text-center">
                {v.substring(0, 7)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={`u${user.id}`}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <ScoreCell requests={requests} userId={user.id} />
              {parameterValues.map((value) => (
                <ScoreCell
                  key={value}
                  requests={requests}
                  userId={user.id}
                  parameterName={parameterName}
                  parameterValue={value}
                />
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
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
  const [parameterName, setParameterName] = useState("subtopico");
  const [templates, setTemplates] = useState<QuestionRequestTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [parameterValues, setParameterValues] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [questionRequests, setQuestionRequests] = useState<
    DashboardQuestionRequest[]
  >([]);

  const isAdmin = session?.user?.isAdmin || false;

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

  useEffect(() => {
    if (status !== "authenticated") return;
    if (selectedTemplateId === null) return;

    (async () => {
      const template = await fetchTemplate(selectedTemplateId);
      const params = Array.isArray(template.parameters)
        ? (template.parameters as PrismaJson.QuestionRequestTemplateParameter[])
        : [];
      const preferred =
        params.find((p) => p.name === "subtopico") ??
        params.find((p) => p.name !== "linguagem") ??
        params[0];
      setParameterName(preferred?.name || "topico");
      setParameterValues(preferred?.values || []);

      const allUsers = await fetchAllUsersForTemplate(selectedTemplateId);
      setUsers(allUsers);

      let allRequests: DashboardQuestionRequest[] = [];
      for (const user of allUsers) {
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
  }, [selectedTemplateId, status]);

  useEffect(() => {
    if (selectedTemplateId !== null) return;
    if (!templates || templates.length === 0) return;
    setSelectedTemplateId(templates[0].id);
  }, [templates, selectedTemplateId]);

  const grouped = groupBySemester(users, (u) => new Date(u.createdAt));
  const semesterKeys = sortedSemesters(Object.keys(grouped));

  return (
    <div className="p-4">
      {status === "loading" && (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      )}

      {status === "unauthenticated" && (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-red-600">
            Você precisa estar logado para acessar o dashboard
          </p>
        </div>
      )}

      {status === "authenticated" && (
        <>
          <div className="mb-6">
            <h1 className="mb-4 text-2xl font-bold">Dashboard de Desempenho</h1>

            {!isAdmin && (
              <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                Você está visualizando apenas suas próprias notas
              </div>
            )}

            {isAdmin && (
              <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                Você está visualizando as notas de todos os alunos (Modo Admin)
              </div>
            )}

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">
                Selecione um template de questão:
              </label>
              <Select
                key="mysel"
                onValueChange={(value) => {
                  setSelectedTemplateId(Number(value));
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

      {selectedTemplateId !== null && semesterKeys.length > 0 && (
        <div>
          {semesterKeys.map((semester, idx) => {
            const semesterUsers = grouped[semester];
            return (
              <SemesterAccordion
                key={semester}
                title={semester}
                count={semesterUsers.length}
                defaultOpen={idx === 0}
              >
                <SemesterTable
                  users={semesterUsers}
                  requests={questionRequests}
                  parameterName={parameterName}
                  parameterValues={parameterValues}
                />
              </SemesterAccordion>
            );
          })}
        </div>
      )}

      {selectedTemplateId !== null && semesterKeys.length === 0 && users.length === 0 && (
        <p className="text-sm text-slate-500">
          Nenhum aluno encontrado para este template.
        </p>
      )}
    </div>
  );
}
