"use client";

import { PrismaJson } from "@/prisma/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Forbidden from "./forbidden";

type EvaluationTemplateSummary = {
  id: number;
  name: string;
  description: string | null;
};

type Template = {
  id?: number;
  name: string;
  promptTemplate: string;
  parameters: PrismaJson.QuestionRequestTemplateParameter[];
  evaluationTemplateId?: number | null;
};

type ParameterInput = {
  name: string;
  values: string;
  multipleSelect: boolean;
};

type TemplateFormProps = {
  defaultValues?: Template;
  onSubmit: (data: Template) => void;
  mode: "create" | "edit";
};

export default function TemplateForm({
  defaultValues,
  onSubmit,
  mode,
}: TemplateFormProps) {
  const { data: session, status } = useSession();

  const [newTemplate, setNewTemplate] = useState<Template>({
    name: defaultValues?.name || "",
    promptTemplate: defaultValues?.promptTemplate || "",
    parameters: defaultValues?.parameters || [],
    evaluationTemplateId: defaultValues?.evaluationTemplateId ?? null,
  });
  const [newParameter, setNewParameter] = useState<ParameterInput>({
    name: "",
    values: "",
    multipleSelect: false,
  });
  const [evaluationTemplates, setEvaluationTemplates] = useState<
    EvaluationTemplateSummary[]
  >([]);

  useEffect(() => {
    fetch("/api/templates/evaluation")
      .then((r) => (r.ok ? r.json() : []))
      .then(setEvaluationTemplates)
      .catch(() => {});
  }, []);

  const isForbidden =
    status === "authenticated" && session?.user?.isAdmin === false;

  if (status === "loading") {
    return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  }

  if (isForbidden) {
    return (
      <Forbidden
        message="Apenas administradores podem gerenciar templates."
        redirectTo="/dashboard"
        redirectDelay={5}
      />
    );
  }

  function addParameter() {
    if (!newParameter.name) return;
    const valuesArray =
      newParameter.values.trim().length == 0
        ? []
        : newParameter.values.split(";").map((v) => v.trim());
    setNewTemplate({
      ...newTemplate,
      parameters: [
        ...newTemplate.parameters,
        { ...newParameter, values: valuesArray },
      ],
    });
    setNewParameter({ name: "", values: "", multipleSelect: false });
  }

  function removeParameter(index: number) {
    setNewTemplate({
      ...newTemplate,
      parameters: newTemplate.parameters.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="p-4 w-full max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Modelos de Questão</h1>
      <Card className="mb-4 border-gray-200">
        <CardHeader>
          <h2 className="text-xl font-semibold">
            {mode === "create" ? "Criar novo modelo" : "Editar modelo"}
          </h2>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-3">
              Informe um nome, insira as instruções (prompt) e adicione
              parâmetros. Use markdown simples e evite textos muito extensos nas
              listagens.
            </p>
            <Input
              type="text"
              value={newTemplate.name}
              onChange={(e) =>
                setNewTemplate({ ...newTemplate, name: e.target.value })
              }
              placeholder="Nome do template"
              className="mb-3"
            />
            <Textarea
              value={newTemplate.promptTemplate}
              onChange={(e) =>
                setNewTemplate({
                  ...newTemplate,
                  promptTemplate: e.target.value,
                })
              }
              placeholder="Instruções do template (prompt)"
              className="mb-4"
              rows={6}
            />
          </div>

          <div className="grid gap-4">
            <div>
              <h3 className="text-lg font-medium mb-1">
                Template de avaliação
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                Opcional. Se selecionado, a IA usará estes critérios ao avaliar
                respostas discursivas geradas por este template.
              </p>
              <Select
                value={newTemplate.evaluationTemplateId?.toString() ?? "none"}
                onValueChange={(v) =>
                  setNewTemplate({
                    ...newTemplate,
                    evaluationTemplateId: v === "none" ? null : parseInt(v, 10),
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Nenhum (a IA define livremente)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Nenhum (a IA define livremente)
                  </SelectItem>
                  {evaluationTemplates.map((et) => (
                    <SelectItem key={et.id} value={et.id.toString()}>
                      {et.name}
                      {et.description && (
                        <span className="ml-2 text-xs text-gray-400">
                          — {et.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="text-lg font-medium">Parâmetros</h3>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {newTemplate.parameters.map((param, index) => (
              <li
                key={index}
                className="rounded-lg border border-gray-200 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm text-gray-700">
                  <strong>{param.name}</strong> (
                  {param.multipleSelect ? "Múltipla" : "Única"}):{" "}
                  <span className="break-words">{param.values.join("; ")}</span>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => removeParameter(index)}
                  className="text-sm w-full sm:w-auto"
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
          <Card className="mt-4 border-gray-200">
            <CardContent className="grid gap-4">
              <h3 className="text-lg font-medium mb-2">Adicionar parâmetro</h3>
              <div className="grid gap-3">
                <Input
                  type="text"
                  value={newParameter.name}
                  onChange={(e) =>
                    setNewParameter({ ...newParameter, name: e.target.value })
                  }
                  placeholder="Nome do parâmetro"
                />
                <Input
                  type="text"
                  value={newParameter.values}
                  onChange={(e) =>
                    setNewParameter({ ...newParameter, values: e.target.value })
                  }
                  placeholder="Valores separados por ; (ex: valor1; valor2)"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="check"
                    checked={newParameter.multipleSelect}
                    onCheckedChange={(checked) =>
                      setNewParameter({
                        ...newParameter,
                        multipleSelect: !!checked,
                      })
                    }
                  />
                  <Label htmlFor="check">Seleção múltipla</Label>
                </div>
                <Button onClick={addParameter} className="w-full sm:w-auto">
                  Adicionar parâmetro
                </Button>
              </div>
            </CardContent>
          </Card>
          <Button
            onClick={() => onSubmit(newTemplate)}
            className="mt-4 w-full sm:w-auto"
          >
            {mode === "create" ? "Criar template" : "Atualizar template"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
