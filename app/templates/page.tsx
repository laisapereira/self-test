"use client";

import { useState, useEffect, Fragment } from "react";
import { QuestionRequestTemplate } from "../../prisma";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Forbidden from "@/components/forbidden";
import { Eye, EyeOff, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";

type TemplateWithOwner = QuestionRequestTemplate & {
  owner?: { id: number; name: string | null; email: string };
};

export default function QuestionRequestTemplates() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateWithOwner[]>([]);

  const isAdmin = session?.user?.typeRole === "ADMIN";
  const isForbidden =
    status === "authenticated" &&
    session?.user?.typeRole !== "ADMIN" &&
    session?.user?.typeRole !== "PROFESSOR";

  async function fetchTemplates() {
    const response = await fetch("/api/templates");
    if (response.ok) setTemplates(await response.json());
  }

  useEffect(() => {
    if (status === "authenticated" && !isForbidden) fetchTemplates();
  }, [status, isForbidden]);

  async function removeTemplate(id: number) {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
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

  if (status === "loading") return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  if (isForbidden) return <Forbidden message="Apenas administradores e professores podem gerenciar templates." redirectTo="/dashboard" redirectDelay={5} />;

  // Agrupa por dono para admin
  const grouped = isAdmin
    ? templates.reduce((acc, t) => {
        const key = t.owner?.name ?? t.owner?.email ?? `ID ${t.ownerId}`;
        (acc[key] ??= []).push(t);
        return acc;
      }, {} as Record<string, TemplateWithOwner[]>)
    : { "": templates };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Templates de Questões</h1>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {templates.length === 0 ? (
          <p className="text-sm text-slate-500 p-6">Nenhum template encontrado. Crie um modelo para começar.</p>
        ) : (
          Object.entries(grouped).map(([ownerName, group]) => (
            <div key={ownerName}>
              {isAdmin && ownerName && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {ownerName} — {group.length} template(s)
                </div>
              )}
              <TemplateTable
                templates={group}
                onEdit={(id) => router.push(`/templates/${id}/edit`)}
                onDelete={removeTemplate}
                onToggleVisibility={toggleVisibility}
              />
            </div>
          ))
        )}
      </div>

      <Button
        onClick={() => router.push("/templates/create")}
        className="mt-2"
      >
        + Criar novo template
      </Button>
    </div>
  );
}

function TemplateTable({
  templates,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  templates: TemplateWithOwner[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleVisibility: (id: number, current: boolean) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [fullPrompt, setFullPrompt] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePrompt(id: number) {
    setFullPrompt((prev) => {
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
          <th className="text-center px-4 py-3 font-medium text-slate-500 w-32">Parâmetros</th>
          <th className="text-center px-4 py-3 font-medium text-slate-500 w-28">Status</th>
          <th className="text-right px-4 py-3 font-medium text-slate-500 w-36">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {templates.map((t) => {
          const isOpen = expanded.has(t.id);
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
                </td>
                <td className="px-4 py-3 text-center text-slate-500">
                  {t.parameters?.length ?? 0}
                </td>
                <td className="px-4 py-3 text-center">
                  {t.visible ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      <Eye className="h-3 w-3" /> Visível
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      <EyeOff className="h-3 w-3" /> Oculto
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      title={t.visible ? "Ocultar" : "Publicar"}
                      onClick={() => onToggleVisibility(t.id, t.visible)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      {t.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      title="Editar"
                      onClick={() => onEdit(t.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      title="Excluir"
                      onClick={() => onDelete(t.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              {isOpen && (
                <tr className="bg-slate-50/70">
                  <td colSpan={5} className="px-8 py-4 border-b border-slate-100">
                    <div className="space-y-3 max-w-3xl">
                      {t.promptTemplate && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Prompt</p>
                          <p className={`text-sm text-slate-600 leading-relaxed whitespace-pre-wrap ${fullPrompt.has(t.id) ? "" : "line-clamp-3"}`}>
                            {t.promptTemplate}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePrompt(t.id); }}
                            className="mt-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            {fullPrompt.has(t.id) ? "Ver menos" : "Ver completo"}
                          </button>
                        </div>
                      )}
                      {t.parameters?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Parâmetros</p>
                          <div className="space-y-1">
                            {t.parameters.map((p, i) => (
                              <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                                <span className="font-medium text-slate-700 w-36 truncate">{p.name}</span>
                                <span className="text-xs text-slate-400 w-20">{p.multipleSelect ? "Múltipla" : "Única"}</span>
                                <span className="text-slate-500 truncate flex-1">{p.values.join(", ")}</span>
                                <span className="text-xs text-slate-400 shrink-0">{p.values.length} valor(es)</span>
                              </div>
                            ))}
                          </div>
                        </div>
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
