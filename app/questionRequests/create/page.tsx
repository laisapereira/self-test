"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEffect, useState, useRef } from "react";
import { QuestionRequestTemplate } from "@/prisma";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { PrismaJson } from "@/prisma/types";
import { MultiSelect } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type ClassOption = { id: number; name: string };
type ClassGroups = { owned: ClassOption[]; collaborated: ClassOption[]; enrolled: ClassOption[] };

export default function QuestionRequestCreatePage({
  classId,
  onClassChange,
}: {
  classId?: string;
  onClassChange?: (classId: string, className: string) => void;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  const [classGroups, setClassGroups] = useState<ClassGroups>({ owned: [], collaborated: [], enrolled: [] });
  const [classesLoaded, setClassesLoaded] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>(classId ?? "");

  const [templates, setTemplates] = useState<QuestionRequestTemplate[]>([]);
  const [template, setTemplate] = useState<QuestionRequestTemplate | null>(null);
  const [finalPrompt, setFinalPrompt] = useState<string>("");
  const [newRequest, setNewRequest] = useState({
    parameterValues: [] as PrismaJson.QuestionRequestParameterValue[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);

  const abortControllerCreateRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const allClasses = [...classGroups.owned, ...classGroups.collaborated, ...classGroups.enrolled];
  const isStudent = session?.user?.typeRole === "STUDENT";

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerCreateRef.current) {
        abortControllerCreateRef.current.abort();
      }
    };
  }, []);

  // Fetch classes
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/classes")
      .then((r) => r.json())
      .then((data) => {
        if (!isMountedRef.current) return;
        if (data.classes) {
          // Student
          const enrolled: ClassOption[] = data.classes;
          setClassGroups({ owned: [], collaborated: [], enrolled });
          if (enrolled.length === 1 && !classId) {
            setSelectedClassId(String(enrolled[0].id));
          }
        } else {
          // Admin/Professor
          const owned: ClassOption[] = data.owned ?? [];
          const collaborated: ClassOption[] = data.collaborated ?? [];
          setClassGroups({ owned, collaborated, enrolled: [] });
          const total = owned.length + collaborated.length;
          if (total === 1 && !classId) {
            setSelectedClassId(String(total > 0 ? (owned[0] ?? collaborated[0]).id : ""));
          }
        }
        setClassesLoaded(true);
      });
  }, [status]);

  // Notifica o pai quando a turma selecionada muda
  useEffect(() => {
    if (!onClassChange || !classesLoaded) return;
    const selected = allClasses.find((c) => String(c.id) === selectedClassId);
    onClassChange(selectedClassId, selected?.name ?? "");
  }, [selectedClassId, classesLoaded]);

  // Fetch templates when selected class changes
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!selectedClassId) {
      setTemplates([]);
      setTemplate(null);
      return;
    }
    setIsLoadingTemplates(true);
    setTemplate(null);
    fetch(`/api/templates?classId=${selectedClassId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isMountedRef.current) return;
        if (Array.isArray(data)) setTemplates(data);
      })
      .finally(() => {
        if (isMountedRef.current) setIsLoadingTemplates(false);
      });
  }, [status, selectedClassId]);

  useEffect(() => {
    async function checkPendingRequest() {
      const response = await fetch("/api/questionRequests?status=PENDING");
      const data = await response.json();

      if (data.length > 0) {
        const lastRequest = data[0];
        const createdAt = new Date(lastRequest.createdAt).getTime();
        const now = new Date().getTime();
        const diffMinutes = (now - createdAt) / (1000 * 60);

        if (diffMinutes < 5) {
          setActiveRequestId(lastRequest.id);
        }
      }
    }
    checkPendingRequest();
  }, []);

  useEffect(() => {
    if (template) {
      const initialValues = template.parameters?.map((param) => ({
        name: param.name,
        values: param.multipleSelect ? [] : [""],
      }));
      setNewRequest({ parameterValues: initialValues });
    }
  }, [template]);

  function renderParameterInput(
    parameter: PrismaJson.QuestionRequestTemplateParameter,
    key: string,
  ): React.ReactNode {
    if (parameter.values && parameter.values.length > 0) {
      if (parameter.multipleSelect) {
        return (
          <MultiSelect
            key={key}
            placeholder={`Selecione os parâmetros de: ${parameter.name}`}
            options={parameter.values.map((value) => ({ value, label: value }))}
            onValueChange={(values) => handleParameterChange(parameter, values)}
          />
        );
      } else {
        return (
          <Select
            onValueChange={(value) => handleParameterChange(parameter, [value])}
            key={key}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Selecione o parâmetro: ${parameter.name}`} />
            </SelectTrigger>
            <SelectContent>
              {parameter.values.map((value: string) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
    } else {
      return (
        <Input
          key={key}
          type="text"
          value={
            newRequest.parameterValues.find((param) => param.name === parameter.name)?.values[0] || ""
          }
          onChange={(e) => handleParameterChange(parameter, [e.target.value])}
          placeholder={`Enter ${parameter.name}`}
          className="mb-4"
        />
      );
    }
  }

  function generateFinalPrompt(
    template: QuestionRequestTemplate,
    parameterValues: PrismaJson.QuestionRequestParameterValue[],
  ) {
    const promptTemplate = template.promptTemplate;
    const merged = [
      ...parameterValues,
      { name: "tema", values: [template.name ?? ""] },
    ];
    const paramMap = new Map<string, string[]>(
      merged.map((param) => [param.name.toLowerCase(), param.values ?? []]),
    );
    return promptTemplate.replace(/<([^>]+)>/g, (_, key) => {
      const matchValues = paramMap.get(key.toLowerCase());
      if (!matchValues || matchValues.length === 0) return `<${key}>`;
      return matchValues.length > 1 ? matchValues.join(", ") : (matchValues?.[0] ?? `<${key}>`);
    });
  }

  function handleParameterChange(
    parameter: PrismaJson.QuestionRequestTemplateParameter,
    values: string[],
  ) {
    const updatedValues = [...newRequest.parameterValues];
    const index = updatedValues.findIndex((p) => p.name === parameter.name);
    if (index >= 0) {
      updatedValues[index] = { ...updatedValues[index], values };
    } else {
      updatedValues.push({ name: parameter.name, values });
    }
    setNewRequest({ ...newRequest, parameterValues: updatedValues });
    setFinalPrompt(generateFinalPrompt(template!, updatedValues));
  }

  function renderSelectClass() {
    const hasGroups = classGroups.owned.length > 0 || classGroups.collaborated.length > 0;

    return (
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[1.1rem] font-semibold">Selecione a turma</label>
        <Select
          value={selectedClassId}
          onValueChange={(value) => setSelectedClassId(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Escolha uma turma..." />
          </SelectTrigger>
          <SelectContent>
            {hasGroups ? (
              <>
                {classGroups.owned.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Suas turmas</SelectLabel>
                    {classGroups.owned.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {classGroups.collaborated.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Colaborando</SelectLabel>
                    {classGroups.collaborated.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </>
            ) : (
              classGroups.enrolled.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  function renderSelectTemplate() {
    return (
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[1.1rem] font-semibold">Selecione um tema principal</label>

        {isLoadingTemplates ? (
          <p className="text-sm text-gray-400">Carregando templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum template disponível para esta turma.</p>
        ) : (
          <Select
            onValueChange={(value) =>
              setTemplate(templates.find((t) => `${t.id}` === value) || null)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione uma área geral" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={`${t.id}`}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  }

  async function createRequest() {
    if (!template) return;

    interface MissingParameter { name: string; values: string[] }
    const missingParameters: MissingParameter[] = template.parameters.filter(
      (parameter: PrismaJson.QuestionRequestTemplateParameter) => {
        const paramValue = newRequest.parameterValues.find(
          (param: PrismaJson.QuestionRequestParameterValue) => param.name === parameter.name,
        );
        return !paramValue || paramValue.values.length === 0 || paramValue.values[0] === "";
      },
    );

    if (missingParameters.length > 0) {
      alert(
        `Por favor, selecione um valor para os seguintes parâmetros: ${missingParameters.map((p) => p.name).join(", ")}`,
      );
      return;
    }

    const request = {
      templateId: template.id,
      parameterValues: newRequest.parameterValues,
      generatedPrompt: finalPrompt,
    };

    setIsLoading(true);
    abortControllerCreateRef.current = new AbortController();

    try {
      const response = await fetch("/api/questionRequests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: abortControllerCreateRef.current.signal,
      });

      if (!isMountedRef.current) return;

      if (!response.ok) {
        setIsLoading(false);
        alert("Failed to create request");
        return;
      }

      const { id } = await response.json();
      setActiveRequestId(id);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error creating request:", error);
        alert("Failed to create request");
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }

  async function cancelRequest() {
    if (!activeRequestId) return;
    try {
      await fetch(`/api/questionRequests/${activeRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED" }),
      });
      setActiveRequestId(null);
      setIsLoading(false);
    } catch (error) {
      console.error("Erro ao cancelar requisição:", error);
      alert("Não foi possível cancelar a geração.");
    }
  }

  useEffect(() => {
    if (!activeRequestId) return;
    let stopped = false;

    async function poll() {
      while (!stopped) {
        try {
          const response = await fetch(`/api/questionRequests/${activeRequestId}`);
          if (!response.ok) break;
          const questionRequest = await response.json();
          if (stopped) break;

          if (questionRequest.status === "COMPLETED") {
            window.location.href = `/questions?questionRequestId=${activeRequestId}`;
            return;
          }
          if (questionRequest.status === "FAILED") {
            setIsLoading(false);
            setActiveRequestId(null);
            alert("Falha ao gerar questões");
            return;
          }
          if (questionRequest.status === "CANCELED") {
            setIsLoading(false);
            setActiveRequestId(null);
            return;
          }
        } catch (error) {
          console.error("[POLLING] erro no fetch:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (stopped) break;
      }
    }

    poll();
    return () => { stopped = true; };
  }, [activeRequestId]);

  // Empty state: classes loaded but user has none
  const showEmptyState = classesLoaded && allClasses.length === 0;

  return (
    <div>
      {activeRequestId ? (
        <Card className="w-full max-w-2xl mx-auto mt-10 p-6 flex flex-col items-center gap-4">
          <Spinner>
            O SelfTest está gerando seu desafio personalizado... Pode sair desta
            página e navegar pelo site tranquilamente, o progresso continuará em
            segundo plano e você poderá ver o resultado no seu histórico!
          </Spinner>
          <div className="flex flex-col w-full gap-2">
            <Button variant="outline" className="w-full" asChild>
              <a href="/questionRequests">Acompanhar no histórico</a>
            </Button>
            <Button variant="destructive" className="w-full" onClick={cancelRequest}>
              Cancelar geração
            </Button>
          </div>
        </Card>
      ) : showEmptyState ? (
        <Card className="w-full max-w-2xl mx-auto mt-10 p-8 flex flex-col items-center gap-3 text-center">
          <p className="text-lg font-semibold text-gray-700">Nenhuma turma encontrada</p>
          <p className="text-sm text-gray-500">
            {isStudent
              ? "Você ainda não está em nenhuma turma. Aguarde seu professor te adicionar."
              : "Crie uma turma e associe templates a ela para começar a gerar questões."}
          </p>
          {!isStudent && (
            <Button variant="outline" asChild className="mt-2">
              <a href="/classes/new">Criar turma</a>
            </Button>
          )}
        </Card>
      ) : (
        <Card className="w-full max-w-2xl mx-auto mt-10 p-6 flex flex-col gap-6">
          <CardHeader className="text-center">
            <h1 className="text-4xl font-bold">Vamos testar seu conhecimento?</h1>
            <p className="text-slate-500 py-3">
              Configure abaixo os tópicos para gerar um desafio personalizado de perguntas!
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Só mostra o seletor de turma se houver mais de uma opção */}
            {allClasses.length > 1 && renderSelectClass()}

            {selectedClassId && renderSelectTemplate()}

            {template && template.parameters?.length > 0 && (
              <>
                <h2 className="text-[1.1rem] font-semibold mt-4">
                  Defina os parâmetros que a IA deve priorizar
                </h2>
                {template.parameters.map(
                  (parameter: PrismaJson.QuestionRequestTemplateParameter) =>
                    renderParameterInput(parameter, `${parameter.name}`),
                )}
              </>
            )}
            {template && (
              <Button onClick={createRequest} disabled={isLoading || isLoadingTemplates}>
                {isLoading ? <span className="spinner" /> : "Gerar minhas questões"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
