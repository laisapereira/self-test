"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Forbidden from "@/components/forbidden";
import { Trash2, Pencil, ChevronDown, ChevronUp } from "lucide-react";

type EvaluationCriterion = {
  id: number;
  weight: number;
  order: number;
  criterion: { id: number; name: string; description: string };
};

type EvaluationTemplate = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  criteria: EvaluationCriterion[];
  _count: { questionRequestTemplates: number };
  owner?: { id: number; name: string | null; email: string };
};

export default function EvaluationTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.typeRole === "ADMIN";
  const isForbidden = status === "authenticated" && !isAdmin;

  async function fetchTemplates() {
    setLoading(true);
    const res = await fetch("/api/templates/evaluation");
    if (res.ok) {
      setTemplates(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    if (status === "authenticated" && !isForbidden) {
      fetchTemplates();
    }
  }, [status, isForbidden]);

  async function deleteTemplate(id: number, linkedCount: number) {
    if (linkedCount > 0) {
      alert(
        `Não é possível excluir: ${linkedCount} template(s) de questão utiliza(m) este template de avaliação.`,
      );
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este template?")) return;
    const res = await fetch(`/api/templates/evaluation/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchTemplates();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Erro ao excluir template.");
    }
  }

  if (status === "loading") {
    return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  }

  if (isForbidden) {
    return (
      <Forbidden
        message="Apenas administradores podem gerenciar templates de avaliação."
        redirectTo="/dashboard"
        redirectDelay={5}
      />
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Templates de Avaliação</h1>
        <Button
          onClick={() => router.push("/templates/evaluation/create")}
          className="h-11"
        >
          Novo template de avaliação
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-500">Carregando templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum template de avaliação encontrado. Crie um para começar.
          </p>
        ) : isAdmin ? (
          // Admin: agrupa por criador
          Object.entries(
            templates.reduce((acc, t) => {
              const key = t.owner?.name ?? t.owner?.email ?? `ID ${t.id}`;
              if (!acc[key]) acc[key] = [];
              acc[key].push(t);
              return acc;
            }, {} as Record<string, EvaluationTemplate[]>)
          ).map(([ownerName, ownerTemplates]) => (
            <div key={ownerName} className="mb-6">
              <h2 className="text-base font-semibold text-slate-600 mb-3 flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-0.5 text-sm">{ownerName}</span>
                <span className="text-xs text-gray-400">{ownerTemplates.length} template(s)</span>
              </h2>
              <ul className="space-y-4">
                {ownerTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => router.push(`/templates/evaluation/${template.id}/edit`)}
                    onDelete={() => deleteTemplate(template.id, template._count.questionRequestTemplates)}
                  />
                ))}
              </ul>
            </div>
          ))
        ) : (
          <ul className="space-y-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => router.push(`/templates/evaluation/${template.id}/edit`)}
                onDelete={() => deleteTemplate(template.id, template._count.questionRequestTemplates)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: EvaluationTemplate;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const linked = template._count.questionRequestTemplates;

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">{template.name}</h3>
            {template.description && (
              <p className="text-sm text-gray-500 mt-0.5">
                {template.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {template.criteria.length} critério(s)
            </span>
            {linked > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {linked} template(s) vinculado(s)
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-slate-50 border border-gray-100 divide-y divide-gray-100">
          {(expanded ? template.criteria : template.criteria.slice(0, 3)).map(
            (tc) => (
              <div
                key={tc.id}
                className="flex items-center justify-between px-3 py-2 text-sm gap-4"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800">
                    {tc.criterion.name || tc.criterion.description}
                  </span>
                  {tc.criterion.name && tc.criterion.description && (
                    <p className="text-xs text-gray-400 truncate">
                      {tc.criterion.description}
                    </p>
                  )}
                </div>
                <span className="font-semibold text-blue-600 whitespace-nowrap">
                  {Math.round(tc.weight * 100)}%
                </span>
              </div>
            ),
          )}
        </div>

        {template.criteria.length > 3 && (
          <button
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" /> Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" /> Ver mais{" "}
                {template.criteria.length - 3} critério(s)
              </>
            )}
          </button>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={onEdit} variant="secondary" className="gap-2">
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button
            onClick={onDelete}
            variant="destructive"
            disabled={linked > 0}
            title={
              linked > 0
                ? "Remova o vínculo dos templates de questão antes de excluir"
                : undefined
            }
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
