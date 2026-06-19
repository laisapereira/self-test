"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Collaborator = { id: number; name: string; email: string };
type Student = { id: number; name: string; email: string };
type Template = { id: number; name: string };
type UserResult = { id: number; name: string; email: string; role: string };

export type ClassFormData = {
  name: string;
  collaborators: Collaborator[];
  students: Student[];
  questionTemplates: Template[];
  evaluationTemplates: Template[];
};

type ClassFormProps = {
  mode: "create" | "edit";
  owner?: { id: number; name: string; email: string };
  defaultValues?: ClassFormData;
  onSubmit: (data: ClassFormData) => void;
};

function UserSearchInput({
  placeholder,
  onAdd,
  filterResults,
}: {
  placeholder: string;
  onAdd: (user: UserResult) => string | null;
  filterResults?: (u: UserResult) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const filterResultsRef = useRef(filterResults);
  filterResultsRef.current = filterResults;

  useEffect(() => {
    setError("");
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          const users: UserResult[] = data.users ?? [];
          const fn = filterResultsRef.current;
          setResults(fn ? users.filter(fn) : users);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function select(user: UserResult) {
    const err = onAdd(user);
    if (err) {
      setError(err);
    } else {
      setQuery("");
      setResults([]);
      setOpen(false);
      setError("");
    }
  }

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              onMouseDown={() => select(u)}
            >
              <p className="text-sm font-medium text-gray-700">{u.name}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </button>
          ))}
          {!loading && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">Nenhum usuário encontrado.</p>
          )}
        </div>
      )}
      {loading && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function ClassForm({ mode, owner, defaultValues, onSubmit }: ClassFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [collaborators, setCollaborators] = useState<Collaborator[]>(defaultValues?.collaborators ?? []);
  const [students, setStudents] = useState<Student[]>(defaultValues?.students ?? []);
  const [questionTemplates, setQuestionTemplates] = useState<Template[]>(defaultValues?.questionTemplates ?? []);
  const [evaluationTemplates, setEvaluationTemplates] = useState<Template[]>(defaultValues?.evaluationTemplates ?? []);

  const [availableQuestionTemplates, setAvailableQuestionTemplates] = useState<Template[]>([]);
  const [availableEvaluationTemplates, setAvailableEvaluationTemplates] = useState<Template[]>([]);
  const [confirmRemove, setConfirmRemove] = useState<Student | null>(null);
  const [selectedQuestionTemplateId, setSelectedQuestionTemplateId] = useState("");
  const [selectedEvaluationTemplateId, setSelectedEvaluationTemplateId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const STUDENTS_PER_PAGE = 10;

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((data) => {
      setAvailableQuestionTemplates(Array.isArray(data) ? data : []);
    });
    fetch("/api/templates/evaluation").then((r) => r.json()).then((data) => {
      setAvailableEvaluationTemplates(Array.isArray(data) ? data : []);
    });
  }, []);

  function handleAddCollaborator(user: UserResult): string | null {
    if (user.role !== "PROFESSOR" && user.role !== "ADMIN") {
      return "Apenas professores podem ser colaboradores.";
    }
    if (owner && user.id === owner.id) {
      return "Esse professor já é o dono da turma.";
    }
    if (collaborators.some((c) => c.id === user.id)) {
      return "Esse professor já foi adicionado.";
    }
    setCollaborators((prev) => [...prev, { id: user.id, name: user.name, email: user.email }]);
    return null;
  }

  function handleRemoveCollaborator(id: number) {
    setCollaborators((prev) => prev.filter((c) => c.id !== id));
  }

  function handleAddStudent(user: UserResult): string | null {
    if (owner && user.id === owner.id) {
      return "O dono da turma não pode ser adicionado como aluno.";
    }
    if (students.some((s) => s.id === user.id)) {
      return "Esse usuário já está na turma.";
    }
    if (collaborators.some((c) => c.id === user.id)) {
      return "Esse usuário já é colaborador da turma.";
    }
    setStudents((prev) => [...prev, { id: user.id, name: user.name, email: user.email }]);
    return null;
  }

  function handleRemoveStudent(id: number) {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }

  function handleRemoveQuestionTemplate(id: number) {
    setQuestionTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function handleAddQuestionTemplate() {
    const template = availableQuestionTemplates.find((t) => String(t.id) === selectedQuestionTemplateId);
    if (!template) return;
    if (questionTemplates.some((t) => t.id === template.id)) return;
    setQuestionTemplates((prev) => [...prev, template]);
    setSelectedQuestionTemplateId("");
  }

  function handleRemoveEvaluationTemplate(id: number) {
    setEvaluationTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function handleAddEvaluationTemplate() {
    const template = availableEvaluationTemplates.find((t) => String(t.id) === selectedEvaluationTemplateId);
    if (!template) return;
    if (evaluationTemplates.some((t) => t.id === template.id)) return;
    setEvaluationTemplates((prev) => [...prev, template]);
    setSelectedEvaluationTemplateId("");
  }

  function handleSubmit() {
    onSubmit({ name, collaborators, students, questionTemplates, evaluationTemplates });
  }

  return (
    <div className="space-y-4">
      {/* Dados básicos */}
      <Card className="border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold">Dados básicos</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da turma *</Label>
            <Input
              id="name"
              placeholder="Ex: Algoritmos 2025.2"
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Colaboradores */}
      <Card className="border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold">Colaboradores</h2>
          <p className="text-sm text-gray-500">
            Professores que poderão gerenciar esta turma junto com você.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {/* Owner imutável */}
            {owner && (
              <li className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-100 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">{owner.name}</p>
                  <p className="text-xs text-gray-500">{owner.email}</p>
                </div>
                <span className="text-xs text-gray-400 font-medium px-2 py-0.5 rounded bg-gray-200">
                  Criador
                </span>
              </li>
            )}
            {collaborators.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.email}</p>
                </div>
                <button
                  onClick={() => handleRemoveCollaborator(c.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <Card className="border-dashed border-gray-300 bg-gray-50/50">
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm text-gray-500">Buscar professor por nome ou e-mail</p>
              <UserSearchInput
                placeholder="Nome ou e-mail do professor..."
                onAdd={handleAddCollaborator}
                filterResults={(u) => (u.role === "PROFESSOR" || u.role === "ADMIN") && (!owner || u.id !== owner.id)}
              />
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Alunos */}
      <Card className="border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold">Alunos ({students.length})</h2>
          <p className="text-sm text-gray-500">
            Adicione alunos à turma pelo nome ou e-mail.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {students.length > 0 && (() => {
            const q = studentSearch.toLowerCase();
            const filtered = q
              ? students.filter((s) =>
                  (s.name ?? "").toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
                )
              : students;
            const totalPages = Math.ceil(filtered.length / STUDENTS_PER_PAGE);
            const safePage = Math.min(studentPage, totalPages || 1);
            const visible = filtered.slice((safePage - 1) * STUDENTS_PER_PAGE, safePage * STUDENTS_PER_PAGE);
            return (
              <div className="space-y-3">
                <Input
                  placeholder="Filtrar alunos matriculados..."
                  value={studentSearch}
                  onChange={(e) => { setStudentSearch(e.target.value); setStudentPage(1); }}
                  className="h-8 text-sm"
                />
                {visible.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">Nenhum aluno encontrado.</p>
                ) : (
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
                        <button
                          onClick={() => setConfirmRemove(s)}
                          title="Remover aluno"
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-2 border-t border-gray-100">
                    <Button size="sm" variant="outline" disabled={safePage <= 1}
                      onClick={() => setStudentPage((p) => p - 1)} className="text-xs h-7 px-3">
                      ← Anterior
                    </Button>
                    <span className="text-xs text-gray-400">{safePage} / {totalPages}</span>
                    <Button size="sm" variant="outline" disabled={safePage >= totalPages}
                      onClick={() => setStudentPage((p) => p + 1)} className="text-xs h-7 px-3">
                      Próxima →
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}

          <Card className="border-dashed border-gray-300 bg-gray-50/50">
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm text-gray-500">Buscar aluno por nome ou e-mail</p>
              <UserSearchInput
                placeholder="Nome ou e-mail do aluno..."
                onAdd={handleAddStudent}
              />
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Templates de geração */}
      <Card className="border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold">Templates de geração</h2>
          <p className="text-sm text-gray-500">
            Templates que os alunos desta turma poderão usar para gerar questões.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {questionTemplates.length > 0 && (
            <ul className="space-y-2">
              {questionTemplates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <span className="text-sm text-gray-700">{t.name}</span>
                  <button
                    onClick={() => handleRemoveQuestionTemplate(t.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Card className="border-dashed border-gray-300 bg-gray-50/50">
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm text-gray-500">Selecionar template de geração</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={selectedQuestionTemplateId} onValueChange={setSelectedQuestionTemplateId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Escolha um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableQuestionTemplates
                      .filter((t) => !questionTemplates.some((qt) => qt.id === t.id))
                      .map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleAddQuestionTemplate} className="w-full sm:w-auto">
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Templates de avaliação */}
      <Card className="border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold">Templates de avaliação</h2>
          <p className="text-sm text-gray-500">
            Templates de avaliação associados a esta turma.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {evaluationTemplates.length > 0 && (
            <ul className="space-y-2">
              {evaluationTemplates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <span className="text-sm text-gray-700">{t.name}</span>
                  <button
                    onClick={() => handleRemoveEvaluationTemplate(t.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Card className="border-dashed border-gray-300 bg-gray-50/50">
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm text-gray-500">Selecionar template de avaliação</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={selectedEvaluationTemplateId} onValueChange={setSelectedEvaluationTemplateId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Escolha um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEvaluationTemplates
                      .filter((t) => !evaluationTemplates.some((et) => et.id === t.id))
                      .map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleAddEvaluationTemplate} className="w-full sm:w-auto">
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-6">
        <Button onClick={handleSubmit} className="w-full sm:w-auto">
          {mode === "create" ? "Criar turma" : "Salvar alterações"}
        </Button>
      </div>

      <Dialog open={!!confirmRemove} onOpenChange={(open) => { if (!open) setConfirmRemove(null); }}>
        <DialogContent onKeyDown={(e) => { if (e.key === "Escape") setConfirmRemove(null); }}>
          <DialogHeader>
            <DialogTitle>Remover aluno da turma?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja retirar <strong>{confirmRemove?.name ?? confirmRemove?.email}</strong> desta turma?
              Esta ação pode ser desfeita antes de salvar o formulário.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmRemove(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmRemove) handleRemoveStudent(confirmRemove.id);
                setConfirmRemove(null);
              }}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
