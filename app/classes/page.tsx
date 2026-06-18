"use client";

import { useState, useEffect, Fragment } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Link2, Crown, UsersRound, ChevronDown, ChevronRight, ExternalLink, Globe } from "lucide-react";

type ClassItem = {
  id: number;
  name: string;
  link: string;
  ownerId: number;
  _count?: { students: number; questionTemplates: number };
};

export default function ClassesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [owned, setOwned] = useState<ClassItem[]>([]);
  const [collaborated, setCollaborated] = useState<ClassItem[]>([]);
  const [others, setOthers] = useState<ClassItem[]>([]);
  const [studentClasses, setStudentClasses] = useState<ClassItem[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/classes")
      .then((r) => r.json())
      .then((data) => {
        if ("owned" in data) {
          setOwned(data.owned ?? []);
          setCollaborated(data.collaborated ?? []);
          setOthers(data.others ?? []);
        } else {
          setStudentClasses(data.classes ?? []);
        }
      });
  }, [status]);

  if (status === "loading") return <div className="p-8 text-center text-slate-500">Carregando...</div>;

  const isStudent = session?.user?.typeRole === "STUDENT";
  const canCreate = session?.user?.typeRole === "ADMIN" || session?.user?.typeRole === "PROFESSOR";

  if (isStudent) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Turmas</h1>
        {studentClasses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-500 text-sm">Você ainda não foi adicionado a nenhuma turma.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {studentClasses.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/classes/${c.id}`)}
                className="text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
              >
                <p className="font-semibold text-slate-800 text-base leading-snug">{c.name}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {c._count?.questionTemplates ?? 0} tema(s)
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {c._count?.students ?? 0} aluno(s)
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const hasNoClasses = owned.length === 0 && collaborated.length === 0 && others.length === 0;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Turmas</h1>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {hasNoClasses ? (
          <p className="text-slate-500 text-sm p-6">Você ainda não tem turmas.</p>
        ) : (
          <>
            {owned.length > 0 && (
              <>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Crown className="h-3 w-3" /> Minhas turmas — {owned.length}
                </div>
                <ClassTable
                  classes={owned}
                  onNavigate={(id) => router.push(`/classes/${id}`)}
                  role="Titular"
                  showRole
                />
              </>
            )}
            {collaborated.length > 0 && (
              <>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <UsersRound className="h-3 w-3" /> Como colaborador — {collaborated.length}
                </div>
                <ClassTable
                  classes={collaborated}
                  onNavigate={(id) => router.push(`/classes/${id}`)}
                  role="Colaborador"
                  showRole
                />
              </>
            )}
            {others.length > 0 && (
              <>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> Outras turmas — {others.length}
                </div>
                <ClassTable
                  classes={others}
                  onNavigate={(id) => router.push(`/classes/${id}`)}
                  role="Sem vínculo"
                  showRole
                />
              </>
            )}
          </>
        )}
      </div>

      {canCreate && (
        <Button
          onClick={() => router.push("/classes/create")}
          className="mt-2"
        >
          + Criar turma
        </Button>
      )}
    </div>
  );
}

function ClassTable({
  classes,
  onNavigate,
  role,
  showRole,
}: {
  classes: ClassItem[];
  onNavigate: (id: number) => void;
  role?: string;
  showRole: boolean;
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
        <tr className="border-b border-slate-100 bg-slate-50/40">
          <th className="text-left px-4 py-3 font-medium text-slate-500 w-8"></th>
          <th className="text-left px-4 py-3 font-medium text-slate-500">Nome</th>
          <th className="text-center px-4 py-3 font-medium text-slate-500 w-24">Alunos</th>
          <th className="text-center px-4 py-3 font-medium text-slate-500 w-28">Templates</th>
          {showRole && <th className="text-center px-4 py-3 font-medium text-slate-500 w-28">Papel</th>}
          <th className="text-right px-4 py-3 font-medium text-slate-500 w-24">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {classes.map((c) => {
          const isOpen = expanded.has(c.id);
          return (
            <Fragment key={c.id}>
              <tr
                className="hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => toggle(c.id)}
              >
                <td className="px-4 py-3 text-slate-400">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                <td className="px-4 py-3 text-center text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {c._count?.students ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {c._count?.questionTemplates ?? 0}
                  </span>
                </td>
                {showRole && (
                  <td className="px-4 py-3 text-center">
                    {role === "Titular" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                        <Crown className="h-3 w-3" /> Titular
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-600">
                        <UsersRound className="h-3 w-3" /> Colaborador
                      </span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      title="Gerenciar turma"
                      onClick={() => onNavigate(c.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              {isOpen && (
                <tr className="bg-slate-50/70">
                  <td colSpan={showRole ? 6 : 5} className="px-8 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Link2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-mono text-xs select-all">{c.link}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigate(c.id)}
                        className="ml-auto gap-1.5 text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Gerenciar turma
                      </Button>
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
