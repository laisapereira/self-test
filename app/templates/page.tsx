'use client';

import { useState, useEffect, Fragment } from "react";
import { PrismaJson } from "@/prisma/types";
import { QuestionRequestTemplate } from "../../prisma";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Forbidden from "@/components/forbidden";

export default function QuestionRequestTemplates() {
  const { data: session, status } = useSession();

  const router = useRouter();

  const [templates, setTemplates] = useState<QuestionRequestTemplate[]>([]);
  const [newTemplate, setNewTemplate] = useState<any>({
    name: "",
    promptTemplate: "",
    parameters: [] as PrismaJson.QuestionRequestTemplateParameter[],
  });
  const [newParameter, setNewParameter] = useState({
    name: "",
    values: "",
    multipleSelect: false,
  });

  const isForbidden = status === "authenticated" && session?.user?.isAdmin === false;

  async function fetchTemplates() {
    const response = await fetch("/api/templates");
    if (response.ok) {
      const data = await response.json();
      setTemplates(data);
    }
  }

  useEffect(() => {
    if (status === "authenticated" && !isForbidden) {
      fetchTemplates();
    }
  }, [status, isForbidden]);

  async function removeTemplate(id: number) {
    await fetch(`/api/templates/${id}`, {
      method: "DELETE",
    });
    fetchTemplates();
  }

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

  return (
    <div className="p-4">
      <Button onClick={() => router.push("/templates/create")} className="mb-4">
        Criar Novo Template
      </Button>
      <h1 className="text-2xl font-bold mb-4">Templates de Questões</h1>
      <TemplateList templates={templates} removeTemplate={removeTemplate} />
    </div>
  );
}

function TemplateList(props: { templates: QuestionRequestTemplate[], removeTemplate: (id: number) => void }) {
  const { templates, removeTemplate } = props;

  const router = useRouter();

  return (<Fragment>
    <h2 className="text-xl font-semibold mb-4">Templates</h2>
    <ul className="space-y-4">
      {templates && templates?.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <h3 className="text-lg font-medium">{template.name}</h3>
          </CardHeader>
          <CardContent>
            <p>{template.promptTemplate}</p>
            <ul className="mt-2 space-y-2">
              {template.parameters && template.parameters?.map((param, index) => (
                <li key={index}>
                  <strong>{param.name}</strong> ({param.multipleSelect ? "Multiple" : "Single"}): {param.values.join(", ")}
                </li>
              ))}
            </ul>
            <Button onClick={() => removeTemplate(template.id)} className="ml-4">Excluir</Button>
            <Button onClick={() => router.push(`/templates/${template.id}/edit`)} className="ml-4">Editar</Button>
          </CardContent>
        </Card>
      ))}
    </ul>
  </Fragment>);
}