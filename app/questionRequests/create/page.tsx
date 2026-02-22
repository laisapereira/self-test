'use client';

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    async function fetchTemplates() {
      const response = await fetch("/api/templates");
      const data = await response.json();
      setTemplates(data);
    }
    fetchTemplates();
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

  function renderParameterInput(parameter: PrismaJson.QuestionRequestTemplateParameter, key: string): any {
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
        className="mb-2"
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
      console.log("Replaced é assim:", replaced);
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
    console.log("PROMPT GERADO:", generatedPrompt);
  }

  function renderSelectTemplate() {
    return <Select onValueChange={(value) => value ? setTemplate(templates.find((t) => `${t.id}` === value) || null) : setTemplate(null)}>

      <label className="text-[1.1rem] font-semibold mt-4">Selecione um tema principal</label>
      <SelectTrigger>
        <SelectValue placeholder="Selecione uma àrea geral" />
      </SelectTrigger>
      <SelectContent>
        {templates.map((template: QuestionRequestTemplate) => (
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
    const missingParameters = template.parameters.filter((parameter) => {
      const paramValue = newRequest.parameterValues.find((param) => param.name === parameter.name);
      return !paramValue || paramValue.values.length === 0 || paramValue.values[0] === "";
    });

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
    const response = await fetch("/api/questionRequests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    setIsLoading(false);
    if (response.ok) {
      const newQuestionRequest = await response.json();
      window.location.href = `/questions?questionRequestId=${newQuestionRequest.id}`;
    } else {
      console.log('Response', response);
      alert("Failed to create request");
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-10 p-6 flex">
      <CardHeader className="text-center">
        <h1 className="text-4xl font-bold">Vamos testar seu conhecimento?</h1>
        <p className="text-slate-500 py-3">
          Configure abaixo os tópicos para gerar um desafio personalizado de perguntas!
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {renderSelectTemplate()}
        {template && template.parameters?.length > 0 && <>
          <h2 className="text-[1.1rem] font-semibold mt-4">Defina os parâmetros que a IA deve priorizar</h2>
          {template.parameters.map((parameter: PrismaJson.QuestionRequestTemplateParameter) =>
            renderParameterInput(parameter, `${parameter.name}`))}
        </>
        }
        {template &&
          (
            isLoading
              ? <Spinner>
                O SelfTest está estruturando um desafio personalizado para você...
              </Spinner>
              : <Button onClick={createRequest} disabled={isLoading}>
                {isLoading ? <span className="spinner" /> : "Gerar minhas questões"}
              </Button>
          )
        }
      </CardContent>
    </Card>
  );

}