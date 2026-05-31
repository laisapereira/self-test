"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Collaborator = { id: number; name: string; email: string };
type Student = { id: number; name: string; email: string };
type Template = { id: number; name: string };

export type ClassFormData = {
  name: string;
  collaborators: Collaborator[];
  students: Student[];
  questionTemplates: Template[];
  evaluationTemplates: Template[];
};

type ClassFormProps = {
  mode: "create" | "edit";
  defaultValues?: ClassFormData;
  onSubmit: (data: ClassFormData) => void;
};

export default function ClassForm({ mode, defaultValues, onSubmit }: ClassFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [collaborators, setCollaborators] = useState<Collaborator[]>(defaultValues?.collaborators ?? []);
  const [students, setStudents] = useState<Student[]>(defaultValues?.students ?? []);
  const [questionTemplates, setQuestionTemplates] = useState<Template[]>(defaultValues?.questionTemplates ?? []);
  const [evaluationTemplates, setEvaluationTemplates] = useState<Template[]>(defaultValues?.evaluationTemplates ?? []);

  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  const [collaboratorError, setCollaboratorError] = useState("");
  const [studentError, setStudentError] = useState("");

  const [availableQuestionTemplates, setAvailableQuestionTemplates] = useState<Template[]>([]);
  const [availableEvaluationTemplates, setAvailableEvaluationTemplates] = useState<Template[]>([]);
  const [selectedQuestionTemplateId, setSelectedQuestionTemplateId] = useState("");
  const [selectedEvaluationTemplateId, setSelectedEvaluationTemplateId] = useState("");

  // Busca os templates disponíveis ao montar o componente
  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((data) => {
      setAvailableQuestionTemplates(Array.isArray(data) ? data : []);
    });
    fetch("/api/templates/evaluation").then((r) => r.json()).then((data) => {
      setAvailableEvaluationTemplates(Array.isArray(data) ? data : []);
    });
  }, []);

  async function handleAddCollaborator() {
    setCollaboratorError("");
    const res = await fetch(`/api/users?email=${encodeURIComponent(collaboratorEmail)}`);
    if (!res.ok) {
      setCollaboratorError("Usuário não encontrado.");
      return;
    }
    const { user } = await res.json();
    if (user.role !== "PROFESSOR" && user.role !== "ADMIN") {
      setCollaboratorError("Apenas professores podem ser colaboradores.");
      return;
    }
    if (collaborators.some((c) => c.id === user.id)) {
      setCollaboratorError("Esse professor já foi adicionado.");
      return;
    }
    setCollaborators((prev) => [...prev, { id: user.id, name: user.name, email: user.email }]);
    setCollaboratorEmail("");
  }

  function handleRemoveCollaborator(id: number) {
    setCollaborators((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleAddStudent() {
    setStudentError("");
    const res = await fetch(`/api/users?email=${encodeURIComponent(studentEmail)}`);
    if (!res.ok) {
      setStudentError("Usuário não encontrado.");
      return;
    }
    const { user } = await res.json();
    if (students.some((s) => s.id === user.id)) {
      setStudentError("Esse usuário já está na turma.");
      return;
    }
    if (collaborators.some((c) => c.id === user.id)) {
      setStudentError("Esse usuário já é colaborador da turma.");
      return;
    }
    setStudents((prev) => [...prev, { id: user.id, name: user.name, email: user.email }]);
    setStudentEmail("");
  }

  function handleRemoveStudent(id: number) {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }

  function handleRemoveQuestionTemplate(id: number) {
    setQuestionTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  // Encontra o template selecionado pelo id e adiciona à lista, se ainda não estiver
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
          {collaborators.length > 0 && (
            <ul className="space-y-2">
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
          )}

          <Card className="border-dashed border-gray-300 bg-gray-50/50">
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm text-gray-500">Buscar professor por e-mail</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="professor@email.com"
                  className="flex-1"
                  value={collaboratorEmail}
                  onChange={(e) => setCollaboratorEmail(e.target.value)}
                />
                <Button variant="outline" onClick={handleAddCollaborator} className="w-full sm:w-auto">
                  Adicionar
                </Button>
              </div>
              {collaboratorError && (
                <p className="text-xs text-red-500">{collaboratorError}</p>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Alunos */}
      <Card className="border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold">Alunos</h2>
          <p className="text-sm text-gray-500">
            Adicione alunos à turma pelo e-mail.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {students.length > 0 && (
            <ul className="space-y-2">
              {students.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.email}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveStudent(s.id)}
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
              <p className="text-sm text-gray-500">Buscar aluno por e-mail</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="aluno@email.com"
                  className="flex-1"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                />
                <Button variant="outline" onClick={handleAddStudent} className="w-full sm:w-auto">
                  Adicionar
                </Button>
              </div>
              {studentError && (
                <p className="text-xs text-red-500">{studentError}</p>
              )}
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
                {/* Select populado com templates disponíveis da API */}
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
    </div>
  );
}
