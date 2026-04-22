"use client";

import { useState, useEffect, Fragment } from "react";
import { PrismaJson } from "@/prisma/types";
import { QuestionRequestTemplate } from "../../prisma";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Forbidden from "@/components/forbidden";
import { Eye, EyeOff } from "lucide-react";

export default function QuestionRequestTemplates() {
  const { data: session, status } = useSession();

  const router = useRouter();

  const [templates, setTemplates] = useState<QuestionRequestTemplate[]>([]);
  const [newTemplate, setNewTemplate] = useState<any>({name: "", promptTemplate: "", parameters: [] as PrismaJson.QuestionRequestTemplateParameter[],});
  const [newParameter, setNewParameter] = useState<any>({ name: "", values: "",multipleSelect: false,
  });

  const isForbidden =
    status === "authenticated" && session?.user?.isAdmin === false;

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

  async function toggleVisibility(id: number, current: boolean) {
    await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !current }),
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
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Templates de Questões</h1>
        <Button
          onClick={() => router.push("/templates/create")}
          className="h-11"
        >
          Criar novo template
        </Button>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <TemplateList templates={templates} removeTemplate={removeTemplate} toggleVisibility={toggleVisibility} />
      </div>
    </div>
  );
}

function TemplateList(props: {
  templates: QuestionRequestTemplate[];
  removeTemplate: (id: number) => void;
  toggleVisibility: (id: number, current: boolean) => void;
}) {
  const { templates, removeTemplate, toggleVisibility } = props;
  const router = useRouter();
  const [expanded, setExpanded] = useState<number[]>([]);

  const toggleExpanded = (id: number) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <Fragment>
      <h2 className="text-xl font-semibold mb-4">Templates</h2>
      <ul className="space-y-4">
        {templates && templates.length > 0 ? (
          templates.map((template) => {
            const isExpanded = expanded.includes(template.id);
            const shortPrompt = template.promptTemplate?.trim().slice(0, 240);
            const needsMore = template.promptTemplate?.length > 240;

            return (
              <Card
                key={template.id}
                className={`border-gray-200 transition-opacity ${!template.visible ? "opacity-50 grayscale" : ""}`}
              >
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{template.name}</h3>
                      {!template.visible && (
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          <EyeOff className="h-3 w-3" />
                          Oculto
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {template.parameters?.length ?? 0} parâmetro(s)
                      </span>
                      <button
                        title={template.visible ? "Ocultar dos alunos" : "Publicar para alunos"}
                        onClick={() => toggleVisibility(template.id, template.visible)}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      >
                        {template.visible
                          ? <Eye className="h-4 w-4" />
                          : <EyeOff className="h-4 w-4" />
                        }
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {isExpanded
                      ? template.promptTemplate
                      : `${shortPrompt}${needsMore ? "..." : ""}`}
                  </p>
                  {needsMore && (
                    <button
                      className="text-sm text-blue-600 hover:underline"
                      onClick={() => toggleExpanded(template.id)}
                    >
                      {isExpanded ? "Ver menos" : "Ver mais"}
                    </button>
                  )}

                  <ul className="mt-2 grid gap-2 text-sm text-gray-600">
                    {template.parameters?.map((param, index) => (
                      <li
                        key={index}
                        className="rounded border border-gray-100 bg-gray-50 px-2 py-1 flex items-center justify-between"
                      >
                        <span>
                          <strong>{param.name}</strong> (
                          {param.multipleSelect ? "Múltipla" : "Única"}):{" "}
                          {param.values.join(", ")}
                        </span>
                        <span className="text-xs text-slate-500">
                          {param.values.length} valor(es)
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => router.push(`/templates/${template.id}/edit`)}
                      variant="secondary"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() => removeTemplate(template.id)}
                      variant="destructive"
                    >
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <li className="text-sm text-gray-500">
            Nenhum template encontrado. Crie um modelo para começar.
          </li>
        )}
      </ul>
    </Fragment>
  );
}
