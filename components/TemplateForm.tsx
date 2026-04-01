"use client";

import { PrismaJson } from "@/prisma/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { useState } from "react";
import Forbidden from "./forbidden";

type Template = {
  id?: number;
  name: string;
  promptTemplate: string;
  parameters: PrismaJson.QuestionRequestTemplateParameter[];
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
  });
  const [newParameter, setNewParameter] = useState<ParameterInput>({
    name: "",
    values: "",
    multipleSelect: false,
  });

  const isForbidden =
    status === "authenticated" && session?.user?.isAdmin === false;

  /* useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);
 */

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
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Modelos de Questão</h1>
      <Card className="mb-4 border-gray-200">
        <CardHeader>
          <h2 className="text-xl font-semibold">
            {mode === "create" ? "Criar novo modelo" : "Editar modelo"}
          </h2>
        </CardHeader>
        <CardContent>
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
              setNewTemplate({ ...newTemplate, promptTemplate: e.target.value })
            }
            placeholder="Instruções do template (prompt)"
            className="mb-4"
            rows={6}
          />
          <h3 className="text-lg font-medium">Parâmetros</h3>
          <ul className="mt-4 space-y-2">
            {newTemplate.parameters.map((param, index) => (
              <li
                key={index}
                className="rounded-lg border border-gray-200 p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <strong>{param.name}</strong> (
                  {param.multipleSelect ? "Múltipla" : "Única"}):{" "}
                  {param.values.join(", ")}
                </div>
                <Button
                  variant="destructive"
                  onClick={() => removeParameter(index)}
                  className="text-sm"
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
          <Card className="mt-4 border-gray-200">
            <CardContent>
              <h3 className="text-lg font-medium mb-2">Adicionar parâmetro</h3>
              <Input
                type="text"
                value={newParameter.name}
                onChange={(e) =>
                  setNewParameter({ ...newParameter, name: e.target.value })
                }
                placeholder="Nome do parâmetro"
                className="mb-2"
              />
              <Input
                type="text"
                value={newParameter.values}
                onChange={(e) =>
                  setNewParameter({ ...newParameter, values: e.target.value })
                }
                placeholder="Valores separados por ; (ex: valor1; valor2)"
                className="mb-2"
              />
              <Checkbox
                id="check"
                checked={newParameter.multipleSelect}
                onCheckedChange={(checked) =>
                  setNewParameter({
                    ...newParameter,
                    multipleSelect: !!checked,
                  })
                }
                className="mb-2"
              />
              <Label htmlFor="check"> Seleção múltipla</Label>
              <br />
              <Button onClick={addParameter} className="mt-2">
                Adicionar parâmetro
              </Button>
            </CardContent>
          </Card>
          <Button onClick={() => onSubmit(newTemplate)} className="mt-4">
            {mode === "create" ? "Criar template" : "Atualizar template"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
