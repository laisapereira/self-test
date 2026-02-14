'use client';

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { PrismaJson } from "@/prisma/types";
import { MultiSelect } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Topic = {
  id: number;
  name: string;
  parameters: PrismaJson.QuestionRequestTemplateParameter[];
  evaluationCriteria?: any;
};

export default function QuestionRequestCreatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [questionType, setQuestionType] = useState<"discursive" | "multiple-choice" | "both">("both");
  const [newRequest, setNewRequest] = useState({
    parameterValues: [] as PrismaJson.QuestionRequestParameterValue[],
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchTopics() {
      const response = await fetch("/api/topics");
      const data = await response.json();
      setTopics(data);
    }
    fetchTopics();
  }, []);

  useEffect(() => {
    if (selectedTopic) {
      const initialValues = selectedTopic.parameters.map((param) => ({
        name: param.name,
        values: param.multipleSelect ? [] : [""],
      }));
      setNewRequest({ parameterValues: initialValues });
    }
  }, [selectedTopic]);

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


  function handleParameterChange(parameter: PrismaJson.QuestionRequestTemplateParameter, values: string[]) {
    const updatedValues = [...newRequest.parameterValues];
    const index = updatedValues.findIndex(p => p.name === parameter.name);

    if (index >= 0) {
      updatedValues[index] = { ...updatedValues[index], values };
    } else {
      updatedValues.push({ name: parameter.name, values });
    }

    setNewRequest({ ...newRequest, parameterValues: updatedValues });
  }

  function renderSelectTopic() {
    return <Select onValueChange={(value) => value ? setSelectedTopic(topics.find((t) => `${t.id}` === value) || null) : setSelectedTopic(null)}>
      <label className="text-[1.1rem] font-semibold mt-4">Selecione um tema</label>
      <SelectTrigger>
        <SelectValue placeholder="Escolha o tema" />
      </SelectTrigger>
      <SelectContent>
        {topics.map((topic: Topic) => (
          <SelectItem key={topic.id} value={`${topic.id}`}>
            {topic.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>;
  }

  function renderSelectQuestionType() {
    return (
      <Select 
        value={questionType}
        onValueChange={(value) => setQuestionType(value as "discursive" | "multiple-choice" | "both")}
      >
        <label className="text-[1.1rem] font-semibold mt-4">Tipo de questão</label>
        <SelectTrigger>
          <SelectValue placeholder="Escolha o tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="discursive">Discursiva</SelectItem>
          <SelectItem value="multiple-choice">Múltipla escolha</SelectItem>
          <SelectItem value="both">Ambas</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  async function createRequest() {
    if (!selectedTopic) return;

    // Validate that all parameters have values
    const missingParameters = selectedTopic.parameters.filter((parameter) => {
      const paramValue = newRequest.parameterValues.find((param) => param.name === parameter.name);
      return !paramValue || paramValue.values.length === 0 || paramValue.values[0] === "";
    });

    if (missingParameters.length > 0) {
      alert(`Por favor, selecione um valor para os seguintes parâmetros: ${missingParameters.map((p) => p.name).join(", ")}`);
      return;
    }

    const request = {
      topicId: selectedTopic.id,
      parameterValues: newRequest.parameterValues,
      questionType,
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
          Escolha um tema, tipo de questão e configure os parâmetros!
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {renderSelectTopic()}
        {renderSelectQuestionType()}
        {selectedTopic && selectedTopic.parameters?.length > 0 && <>
          <h2 className="text-[1.1rem] font-semibold mt-4">Defina os parâmetros</h2>
          {selectedTopic.parameters.map((parameter: PrismaJson.QuestionRequestTemplateParameter) =>
            renderParameterInput(parameter, `${parameter.name}`))}
        </>}
        {selectedTopic && (
          isLoading ? (
            <Spinner>O SelfTest está estruturando um desafio personalizado para você...</Spinner>
          ) : (
            <Button onClick={createRequest} disabled={isLoading}>
              Gerar minhas questões
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}