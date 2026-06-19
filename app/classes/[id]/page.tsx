"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, ClipboardList, Link2, Copy, Check, BarChart2, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

type ClassDetail = {
  id: number;
  name: string;
  link: string;
  ownerId: number;
  students: { id: number; name: string; email: string }[];
  collaborators: { user: { id: number; name: string; email: string } }[];
  questionTemplates: { id: number; name: string }[];
  evaluationTemplates: { id: number; name: string }[];
};

export default function ClassDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const [classData, setClassData] = useState<ClassDetail | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [studentsPage, setStudentsPage] = useState(1);
  const STUDENTS_PER_PAGE = 10;

  const isStudent = session?.user?.typeRole === "STUDENT";

  const isProfessorOrAdmin =
    session?.user?.typeRole === "ADMIN" || session?.user?.typeRole === "PROFESSOR";

  async function fetchClass() {
    const res = await fetch(`/api/classes/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setClassData(data.class);
    }
  }

  useEffect(() => {
    if (status === "authenticated") fetchClass();
  }, [status]);

  function handleCopyLink() {
    if (!classData) return;
    navigator.clipboard.writeText(classData.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeaveClass() {
    setLeaving(true);
    const res = await fetch(`/api/classes/${params.id}/leave`, { method: "POST" });
    setLeaving(false);
    if (res.ok) {
      router.push("/classes");
    }
  }

  if (status === "loading" || !classData) {
    return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{classData.name}</h1>
        <div className="flex gap-2">
          {isProfessorOrAdmin && (
            <>
              <Link href={`/classes/${classData.id}/dashboard`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Button variant="outline" onClick={() => router.push(`/classes/${classData.id}/edit`)}>
                Editar turma
              </Button>
            </>
          )}
          {isStudent && (
            <Button
              variant="outline"
              onClick={() => setConfirmLeave(true)}
              className="flex items-center gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Sair da turma
            </Button>
          )}
        </div>
      </div>

      {/* Link de acesso */}
      <Card className="border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Link de acesso
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <span className="font-mono text-sm text-gray-700 flex-1">{classData.link}</span>
            <button
              onClick={handleCopyLink}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              title="Copiar link"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Templates de geração */}
      <Card className="border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Templates de geração
          </h2>
        </CardHeader>
        <CardContent>
          {classData.questionTemplates.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum template de geração associado.</p>
          ) : (
            <ul className="space-y-2">
              {classData.questionTemplates.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  {t.name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Templates de avaliação */}
      <Card className="border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Templates de avaliação
          </h2>
        </CardHeader>
        <CardContent>
          {classData.evaluationTemplates.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum template de avaliação associado.</p>
          ) : (
            <ul className="space-y-2">
              {classData.evaluationTemplates.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  {t.name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Alunos */}
      <Card className="border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Alunos ({classData.students.length})
          </h2>
        </CardHeader>
        <CardContent>
          {classData.students.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum aluno na turma ainda.</p>
          ) : (() => {
            const totalPages = Math.ceil(classData.students.length / STUDENTS_PER_PAGE);
            const visible = classData.students.slice(
              (studentsPage - 1) * STUDENTS_PER_PAGE,
              studentsPage * STUDENTS_PER_PAGE
            );
            return (
              <>
                <ul className="space-y-2">
                  {visible.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-700">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.email}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-gray-100">
                    <Button
                      size="sm" variant="outline"
                      disabled={studentsPage <= 1}
                      onClick={() => setStudentsPage((p) => p - 1)}
                      className="text-xs h-7 px-3"
                    >
                      ← Anterior
                    </Button>
                    <span className="text-xs text-gray-400">
                      {studentsPage} / {totalPages}
                    </span>
                    <Button
                      size="sm" variant="outline"
                      disabled={studentsPage >= totalPages}
                      onClick={() => setStudentsPage((p) => p + 1)}
                      className="text-xs h-7 px-3"
                    >
                      Próxima →
                    </Button>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Colaboradores — só visível para professor/admin */}
      {isProfessorOrAdmin && (
        <Card className="border-gray-200">
          <CardHeader>
            <h2 className="text-lg font-semibold">Colaboradores</h2>
          </CardHeader>
          <CardContent>
            {classData.collaborators.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum colaborador adicionado.</p>
            ) : (
              <ul className="space-y-2">
                {classData.collaborators.map((c) => (
                  <li
                    key={c.user.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-700">{c.user.name}</p>
                      <p className="text-xs text-gray-500">{c.user.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair da turma?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja sair de <strong>{classData.name}</strong>?
              Você perderá acesso aos materiais e precisará ser adicionado novamente pelo professor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmLeave(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={leaving}
              onClick={handleLeaveClass}
            >
              {leaving ? "Saindo..." : "Sair da turma"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
