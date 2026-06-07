"use client";

import { useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Forbidden from "@/components/forbidden";
import { Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";

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
  const isProfessor = session?.user?.typeRole === "PROFESSOR";
  const isForbidden = status === "authenticated" && !isAdmin && !isProfessor;

  async function fetchTemplates() {
    setLoading(true);
    const res = await fetch("/api/templates/evaluation");
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    if (status === "authenticated" && !isForbidden) fetchTemplates();
  }, [status, isForbidden]);

  async function deleteTemplate(id: number, linkedCount: number) {
    if (linkedCount > 0) {
      alert(`Não é possível excluir: ${linkedCount} template(s) de questão utiliza(m) este template.`);
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este template?")) return;
    const res = await fetch(`/api/templates/evaluation/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchTemplates();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Erro ao excluir template.");
    }
  }

  if (status === "loading") return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  if (isForbidden) return <Forbidden message="Apenas administradores e professores podem gerenciar templates de avaliação." redirectTo="/dashboard" redirectDelay={5} />;

  const grouped = isAdmin
    ? templates.reduce((acc, t) => {
        const key = t.owner?.name ?? t.owner?.email ?? `ID ${t.id}`;
        (acc[key] ??= []).push(t);
        return acc;
      }, {} as Record<string, EvaluationTemplate[]>)
    : { "": templates };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Templates de Avaliação</h1>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-500 p-6">Carregando templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-slate-500 p-6">Nenhum template de avaliação encontrado.</p>
        ) : (
          Object.entries(grouped).map(([ownerName, group]) => (
            <div key={ownerName}>
              {isAdmin && ownerName && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {ownerName} — {group.length} template(s)
                </div>
              )}
              <EvaluationTemplateTable
                templates={group}
                onEdit={(id) => router.push(`/templates/evaluation/${id}/edit`)}
                onDelete={(id, linked) => deleteTemplate(id, linked)}
              />
            </div>
          ))
        )}
      </div>

      <Button
        onClick={() => router.push("/templates/evaluation/create")}
        className="mt-2"
      >
        + Novo template de avaliação
      </Button>
    </div>
  );
}

function EvaluationTemplateTable({
  templates,
  onEdit,
  onDelete,
}: {
  templates: EvaluationTemplate[];
  onEdit: (id: number) => void;
  onDelete: (id: number, linked: number) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <th className="text-left px-4 py-3 font-medium text-slate-500 w-8"></th>
          <th className="text-left px-4 py-3 font-medium text-slate-500">Nome</th>
          <th className="text-center px-4 py-3 font-medium text-slate-500 w-28">Critérios</th>
          <th className="text-center px-4 py-3 font-medium text-slate-500 w-36">Vinculados</th>
          <th className="text-right px-4 py-3 font-medium text-slate-500 w-28">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {templates.map((t) => {
          const isOpen = expanded.has(t.id);
          const linked = t._count.questionRequestTemplates;
          return (
            <Fragment key={t.id}>
              <tr
                className="hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => toggle(t.id)}
              >
                <td className="px-4 py-3 text-slate-400">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{t.name}</p>
                  {t.owner && (
                    <p className="text-xs text-slate-400 mt-0.5">Autor: {t.owner.name ?? t.owner.email}</p>
                  )}
                  {t.description && <p className="text-xs text-slate-400">{t.description}</p>}
                </td>
                <td className="px-4 py-3 text-center text-slate-500">{t.criteria.length}</td>
                <td className="px-4 py-3 text-center">
                  {linked > 0 ? (
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      {linked} template(s)
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      title="Editar"
                      onClick={() => onEdit(t.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      title={linked > 0 ? "Remova os vínculos antes de excluir" : "Excluir"}
                      onClick={() => onDelete(t.id, linked)}
                      disabled={linked > 0}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              {isOpen && (
                <tr className="bg-slate-50/70">
                  <td colSpan={5} className="px-8 py-4 border-b border-slate-100">
                    <div className="space-y-1 max-w-2xl">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Critérios de avaliação</p>
                      {t.criteria.length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhum critério cadastrado.</p>
                      ) : (
                        t.criteria.map((tc) => (
                          <div key={tc.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-slate-700">
                                {tc.criterion.name || tc.criterion.description}
                              </span>
                              {tc.criterion.name && tc.criterion.description && (
                                <p className="text-xs text-slate-400 truncate">{tc.criterion.description}</p>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-blue-600 whitespace-nowrap">
                              {Math.round(tc.weight * 100)}%
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
