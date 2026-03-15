"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEffect, useState, useRef } from "react";
import { QuestionRequestTemplate } from "@/prisma";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { PrismaJson } from "@/prisma/types";
import { MultiSelect } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function QuestionRequestCreatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  const [templates, setTemplates] = useState<QuestionRequestTemplate[]>([]);
  const [template, setTemplate] = useState<QuestionRequestTemplate | null>(null);
  const [finalPrompt, setFinalPrompt] = useState<string>("");
  const [newRequest, setNewRequest] = useState({
    parameterValues: [] as PrismaJson.QuestionRequestParameterValue[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null)


  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null)

  const abortControllerCreateRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerCreateRef.current) {
        abortControllerCreateRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    async function fetchTemplates() {
      if (!isMountedRef.current) return;
      setIsLoadingTemplates(true);
      try {
        const response = await fetch("/api/templates");
        const data = await response.json();
        if (isMountedRef.current) {
          if (response.ok && Array.isArray(data)) {
            setTemplates(data);
          } else {
            console.error("Failed to load templates:", data);
          }
        }
      } catch (error: any) {
        if (isMountedRef.current) {
          console.error("Error fetching templates:", error);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoadingTemplates(false);
        }
      }
    }
    fetchTemplates();
  }, [status]);



  useEffect(() => {
    if (template) {
      const initialValues = template.parameters?.map((param) => ({
        name: param.name,
        values: param.multipleSelect ? [] : [""],
      }));
      setNewRequest({ parameterValues: initialValues });
    }
  }, [template]);



  useEffect(() => {
    async function checkPendingRequest() {
      const response = await fetch("/api/questionRequests?status=PENDING")
      const data = await response.json()

      if (data.length > 0) {
        const lastRequest = data[0];
        const createdAt = new Date(lastRequest.createdAt).getTime();
        const now = new Date().getTime();
        const diffMinutes = (now - createdAt) / (1000 * 60);

        // Só retoma o polling se a requisição for recente (menos de 5 minutos)
        if (diffMinutes < 5) {
          setActiveRequestId(lastRequest.id)
          console.log("Retomando polling para requisição recente:", lastRequest.id)
        } else {
          console.log("Ignorando requisição pendente antiga (stale):", lastRequest.id)
        }
      }
    }
    checkPendingRequest()
  }, [])

  function renderParameterInput(
    parameter: PrismaJson.QuestionRequestTemplateParameter,
    key: string
  ): React.ReactNode {

    if (parameter.values && parameter.values.length > 0) {
      if (parameter.multipleSelect) {
        return <MultiSelect
          key={key}
          placeholder={`Selecione os parâmetros de: ${parameter.name}`}
          options={parameter.values.map((value) => ({ value, label: value }))}
          onValueChange={(values) => handleParameterChange(parameter, values)}
        />
      } else {
        return <Select onValueChange={(value => handleParameterChange(parameter, [value]))} key={key}>
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
      }
    } else {
      return <Input
        key={key}
        type="text"
        value={newRequest.parameterValues.find((param) => param.name === parameter.name)?.values[0] || ""}
        onChange={(e) => handleParameterChange(parameter, [e.target.value])}
        placeholder={`Enter ${parameter.name}`}
        className="mb-4"
      />;
    }
  }


  function generateFinalPrompt(template: QuestionRequestTemplate,
    parameterValues: PrismaJson.QuestionRequestParameterValue[]) {
    // Generate the final prompt by replacing placeholders in the template with actual values
    const promptTemplate = template.promptTemplate;

    const merged = [...parameterValues, { name: "tema", values: [template.name ?? ""] }];

    const paramMap = new Map<string, string[]>(
      merged.map(param => [param.name.toLowerCase(), param.values ?? []])
    );

    return promptTemplate.replace(/<([^>]+)>/g, (_, key) => {
      const matchValues = paramMap.get(key.toLowerCase());

      if (!matchValues || matchValues.length === 0) return `<${key}>`;
      // replace with the values, if multipleSelect and multiple values, join with commas
      // using key as default value if no match found
      const replaced = matchValues.length > 1
        ? matchValues.join(", ") : matchValues?.[0] ?? `<${key}>`;

      return replaced;
    });
  }

  function handleParameterChange(parameter: PrismaJson.QuestionRequestTemplateParameter, values: string[]) {
    const updatedValues = [...newRequest.parameterValues];
    const index = updatedValues.findIndex(p => p.name === parameter.name);

    if (index >= 0) {
      updatedValues[index] = { ...updatedValues[index], values };

    } else {
      updatedValues.push({ name: parameter.name, values });
    }

    setNewRequest({ ...newRequest, parameterValues: updatedValues });

    // Generate the final prompt whenever a parameter changes
    const generatedPrompt = generateFinalPrompt(template!, updatedValues);

    setFinalPrompt(generatedPrompt);

  }

  function renderSelectTemplate() {
    return <Select onValueChange={(value) => value ? setTemplate(templates.find((t) => `${t.id}` === value) || null) : setTemplate(null)}>

      <label className="text-[1.1rem] font-semibold mt-4">Selecione um tema principal</label>
      <SelectTrigger>
        <SelectValue placeholder="Selecione uma àrea geral" />
      </SelectTrigger>
      <SelectContent>
        {templates?.map((template: QuestionRequestTemplate) => (
          <SelectItem key={template.id} value={`${template.id}`}>
            {template.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>;
  }

  async function createRequest() {
    if (!template) return;

    // Validate that all parameters have values
    interface MissingParameter {
      name: string;
      values: string[];
    }

    const missingParameters: MissingParameter[] = template.parameters.filter(
      (parameter: PrismaJson.QuestionRequestTemplateParameter) => {
        const paramValue = newRequest.parameterValues.find(
          (param: PrismaJson.QuestionRequestParameterValue) =>
            param.name === parameter.name
        );
        return (
          !paramValue ||
          paramValue.values.length === 0 ||
          paramValue.values[0] === ""
        );
      }
    );

    if (missingParameters.length > 0) {
      alert(`Por favor, selecione um valor para os seguintes parâmetros: ${missingParameters.map((p) => p.name).join(", ")}`);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: abortControllerCreateRef.current.signal,
      });

      if (!isMountedRef.current) return;

      if (!response.ok) {
        setIsLoading(false);
        console.log("Response", response);
        alert("Failed to create request");
        return;
      }

      const { id } = await response.json()
      setActiveRequestId(id) // Sincroniza o estado para mostrar o card de progresso

    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Create request aborted");
      } else {
        console.error("Error creating request:", error);
        alert("Failed to create request");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
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
      console.log("[POLLING] Iniciando polling para id:", activeRequestId);
      while (!stopped) {
        try {
          const response = await fetch(`/api/questionRequests/${activeRequestId}`);
          if (!response.ok) {
            console.error("[POLLING] Erro ao buscar status:", response.statusText);
            break;
          }
          const questionRequest = await response.json();

          console.log("[POLLING] status atual:", questionRequest.status);

          if (stopped) break;

          if (questionRequest.status === "COMPLETED") {
            console.log("[POLLING] redirecionando...");
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
            console.log("[POLLING] requisição cancelada pelo usuário ou sistema.");
            setIsLoading(false);
            setActiveRequestId(null);
            return;
          }
        } catch (error) {
          console.error("[POLLING] erro no fetch:", error);
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (stopped) break;
      }
    }

    poll();

    return () => {
      console.log("[POLLING] Parando polling para id:", activeRequestId);
      stopped = true;
    };
  }, [activeRequestId]);



  return (
    <div>
      {activeRequestId ? (
        <Card className="w-full max-w-2xl mx-auto mt-10 p-6 flex flex-col items-center gap-4">
          <Spinner>
            O SelfTest está gerando seu desafio personalizado...
            Pode sair desta página e navegar pelo site tranquilamente, o progresso continuará em segundo plano e você poderá ver o resultado no seu histórico!
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
      ) : (
        <Card className="w-full max-w-2xl mx-auto mt-10 p-6 flex">
          <CardHeader className="text-center">
            <h1 className="text-4xl font-bold">Vamos testar seu conhecimento?</h1>
            <p className="text-slate-500 py-3">
              Configure abaixo os tópicos para gerar um desafio personalizado de perguntas!
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {renderSelectTemplate()}
            {template &&
              template.parameters?.length > 0 && (
                <>
                  <h2 className="text-[1.1rem] font-semibold mt-4"> Defina os parâmetros que a IA deve priorizar</h2>
                  {template.parameters.map((parameter: PrismaJson.QuestionRequestTemplateParameter) =>
                    renderParameterInput(parameter, `${parameter.name}`)
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
