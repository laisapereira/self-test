"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import Forbidden from "./forbidden";
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";

export const DEFAULT_EVALUATION_PREAMBLE = `Você é um professor universitário de Ciência da Computação avaliando a resposta de um aluno de graduação. Seu objetivo é ser justo, construtivo e considerar o nível esperado para o contexto acadêmico.
Enunciado da questão
"""<enunciado>"""
Resposta do aluno
"""<resposta>"""
Critérios de avaliação
Avalie a resposta usando exatamente os critérios abaixo, na ordem apresentada:
<criterios>

Rubrica analítica

Para cada critério, atribua um nível de 1 a 4 e converta para a escala 0–10 conforme descrito abaixo:
O nível 4 (Excelente) corresponde a notas de 9 a 10 e deve ser atribuído quando a resposta atende plenamente ao critério, demonstrando domínio completo e sem erros relevantes. A resposta é precisa, completa e clara no que diz respeito a este critério.
O nível 3 (Satisfatório) corresponde a notas de 7 a 8 e deve ser atribuído quando a resposta atende ao critério de forma adequada. Há compreensão sólida, com pequenas imprecisões ou omissões que não comprometem o entendimento geral.
O nível 2 (Parcial) corresponde a notas de 4 a 6 e deve ser atribuído quando a resposta atende parcialmente ao critério. Há tentativa válida, mas com lacunas importantes, erros conceituais ou falta de clareza que comprometem parte da resposta.
O nível 1 (Insuficiente) corresponde a notas de 0 a 3 e deve ser atribuído quando a resposta não atende ao critério. A resposta é incorreta, irrelevante, ausente ou demonstra incompreensão fundamental do que foi pedido.

Sua tarefa:

Para cada critério recebido:

Leia a descrição e o peso;
Atribua um nível (1 a 4) com base na rubrica acima;
Converta para um score de 0 a 10 dentro da faixa do nível;
Justifique brevemente a escolha do nível.


Calcule a nota final como média ponderada:
notaFinal = (Σ score_i × peso_i) ÷ (Σ peso_i)
Retorne o JSON abaixo:

json{
  "autoEvaluation": [
    {
      "templateCriterionId": "<id do critério>",
      "description": "texto EXATO da descrição do critério",
      "weight": 2,
      "level": 4,
      "score": 9,
      "levelJustification": "Breve justificativa do nível atribuído"
    }
  ],
  "finalScore": 8.67,
  "finalScoreFormula": "notaFinal = (9×2 + 8×1) ÷ (2 + 1) = 26 ÷ 3 ≈ 8.67",
  "justification": "Resumo geral do desempenho, destacando acertos e pontos de melhoria. Seja construtivo."
}

Regras importantes

Avalie pelo que foi explicitamente pedido no enunciado. Não penalize por conteúdo além do escopo.
Se a questão usar palavras como "simples", "básico" ou "exemplo", isso restringe o escopo. Não penalize por ausência de profundidade além dessa restrição.
Para clareza: avalie a qualidade da explicação textual, não a legibilidade do código-fonte.
Para corretude: erros menores de sintaxe ou digitação não devem penalizar mais do que 1–2 pontos se o raciocínio estiver correto.
Se a resposta atender completamente ao que foi pedido, o nível 4 (score 9–10) deve ser atribuído. Não reserve a nota máxima para uma resposta hipotética ideal.
Na dúvida, interprete a resposta do aluno de forma favorável.
NÃO crie nem remova critérios.
NÃO altere a ordem dos critérios.
NÃO modifique o texto de descrição dos critérios.
Retorne apenas o JSON final, sem texto extra e sem blocos de código.`;

type CriterionInput = {
  criterionName: string;
  description: string;
  weight: number; // 0-100 (percentage shown in UI)
};

export type EvaluationTemplateFormData = {
  name: string;
  description: string;
  evaluationPrompt: string;
  criteria: CriterionInput[];
};

type EvaluationTemplateFormProps = {
  defaultValues?: EvaluationTemplateFormData;
  onSubmit: (data: {
    name: string;
    description: string;
    evaluationPrompt: string;
    criteria: { criterionName: string; description: string; weight: number }[];
  }) => void;
  mode: "create" | "edit";
  linkedCount?: number;
};

export default function EvaluationTemplateForm({
  defaultValues,
  onSubmit,
  mode,
  linkedCount = 0,
}: EvaluationTemplateFormProps) {
  const { data: session, status } = useSession();

  const [form, setForm] = useState<EvaluationTemplateFormData>({
    name: defaultValues?.name ?? "",
    description: defaultValues?.description ?? "",
    evaluationPrompt:
      defaultValues?.evaluationPrompt ?? DEFAULT_EVALUATION_PREAMBLE,
    criteria: defaultValues?.criteria ?? [],
  });

  const [newCriterion, setNewCriterion] = useState<CriterionInput>({
    criterionName: "",
    description: "",
    weight: 0,
  });

  const isForbidden =
    status === "authenticated" && session?.user?.isAdmin === false;

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

  const totalWeight = form.criteria.reduce((sum, c) => sum + c.weight, 0);
  const weightOk = Math.abs(totalWeight - 100) < 0.01;
  const canSubmit =
    form.name.trim() !== "" && form.criteria.length > 0 && weightOk;

  function addCriterion() {
    if (
      !newCriterion.criterionName.trim() ||
      !newCriterion.description.trim() ||
      !newCriterion.weight
    )
      return;
    setForm({
      ...form,
      criteria: [...form.criteria, { ...newCriterion }],
    });
    setNewCriterion({ criterionName: "", description: "", weight: 0 });
  }

  function removeCriterion(index: number) {
    setForm({
      ...form,
      criteria: form.criteria.filter((_, i) => i !== index),
    });
  }

  function updateCriterion(
    index: number,
    field: keyof CriterionInput,
    value: string | number,
  ) {
    setForm({
      ...form,
      criteria: form.criteria.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    });
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      name: form.name,
      description: form.description,
      evaluationPrompt: form.evaluationPrompt,
      criteria: form.criteria.map((c) => ({
        criterionName: c.criterionName,
        description: c.description,
        weight: c.weight / 100,
      })),
    });
  }

  return (
    <div className="space-y-6">
      {mode === "edit" && linkedCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Atenção:</strong> Este template está vinculado a {linkedCount}{" "}
          template(s) de questão. Alterações impactarão somente avaliações
          futuras.
        </div>
      )}

      {/* Seção 1 — Identificação */}
      <Card className="border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold">Identificação</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do template *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Critérios de resposta discursiva de SO"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Descreva quando e como usar este template..."
              rows={2}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Seção 2 — Critérios */}
      <Card className="border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Critérios de avaliação</h2>
            {form.criteria.length > 0 && (
              <WeightBadge total={totalWeight} ok={weightOk} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de critérios existentes */}
          {form.criteria.length > 0 && (
            <ul className="space-y-3">
              {form.criteria.map((criterion, index) => (
                <li
                  key={index}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2"
                >
                  <div className="flex flex-wrap gap-3 items-start">
                    <div className="w-48 shrink-0">
                      <Label className="text-xs text-gray-500">Nome</Label>
                      <Input
                        value={criterion.criterionName}
                        onChange={(e) =>
                          updateCriterion(
                            index,
                            "criterionName",
                            e.target.value,
                          )
                        }
                        placeholder="Ex: Corretude"
                        className="mt-1 bg-white text-sm"
                      />
                    </div>
                    <div className="w-28 shrink-0">
                      <Label className="text-xs text-gray-500">Peso (%)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={criterion.weight}
                        onChange={(e) =>
                          updateCriterion(
                            index,
                            "weight",
                            Number(e.target.value),
                          )
                        }
                        className="mt-1 bg-white text-sm"
                      />
                    </div>
                    <div className="flex items-end pb-1 ml-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCriterion(index)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        title="Remover critério"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Descrição</Label>
                    <Textarea
                      value={criterion.description}
                      onChange={(e) =>
                        updateCriterion(index, "description", e.target.value)
                      }
                      rows={2}
                      placeholder="Descreva o que será observado neste critério..."
                      className="mt-1 bg-white text-sm"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Formulário de novo critério */}
          <Card className="border-dashed border-gray-300 bg-gray-50/50">
            <CardContent className="pt-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">
                Adicionar critério
              </h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="w-48 shrink-0">
                  <Label
                    htmlFor="new-criterion-name"
                    className="text-xs text-gray-500"
                  >
                    Nome *
                  </Label>
                  <Input
                    id="new-criterion-name"
                    value={newCriterion.criterionName}
                    onChange={(e) =>
                      setNewCriterion({
                        ...newCriterion,
                        criterionName: e.target.value,
                      })
                    }
                    placeholder="Ex: Corretude"
                    className="mt-1"
                  />
                </div>
                <div className="w-28 shrink-0">
                  <Label htmlFor="new-weight" className="text-xs text-gray-500">
                    Peso (%) *
                  </Label>
                  <Input
                    id="new-weight"
                    type="number"
                    min={1}
                    max={100}
                    value={newCriterion.weight || ""}
                    onChange={(e) =>
                      setNewCriterion({
                        ...newCriterion,
                        weight: Number(e.target.value),
                      })
                    }
                    placeholder="Ex: 40"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label
                  htmlFor="new-description"
                  className="text-xs text-gray-500"
                >
                  Descrição *
                </Label>
                <Textarea
                  id="new-description"
                  value={newCriterion.description}
                  onChange={(e) =>
                    setNewCriterion({
                      ...newCriterion,
                      description: e.target.value,
                    })
                  }
                  placeholder="Ex: O estudante demonstra compreensão do conceito principal, com raciocínio correto e linguagem precisa."
                  rows={2}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={addCriterion}
                disabled={
                  !newCriterion.criterionName.trim() ||
                  !newCriterion.description.trim() ||
                  !newCriterion.weight
                }
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar critério
              </Button>
            </CardContent>
          </Card>

          {!weightOk && form.criteria.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />A soma dos pesos deve
              ser exatamente 100%. Atual: {totalWeight}%.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção 3 — Prévia */}
      {form.criteria.length > 0 && (
        <Card className="border-gray-200">
          <CardHeader>
            <h2 className="text-lg font-semibold">Prévia</h2>
            <p className="text-sm text-gray-500">
              Como os critérios aparecerão na avaliação automática
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-gray-100 bg-slate-50 divide-y divide-gray-100">
              {form.criteria.map((c, i) => (
                <div key={i} className="flex items-start gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {c.criterionName || (
                        <span className="italic text-gray-400">Sem nome</span>
                      )}
                    </p>
                    {c.description ? (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.description}
                      </p>
                    ) : (
                      <p className="text-xs italic text-gray-400 mt-0.5">
                        Sem descrição
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-blue-600 whitespace-nowrap pt-0.5">
                    {c.weight}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção 4 — Prompt de avaliação */}
      <Card className="border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold">Prompt de avaliação</h2>
          <p className="text-sm text-gray-500">
            Instruções enviadas ao modelo ao avaliar respostas discursivas.
            Define a persona do avaliador, escala de pontuação e regras
            específicas da disciplina. O enunciado, a resposta do aluno e os
            critérios são sempre injetados automaticamente pelo sistema.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.evaluationPrompt}
            onChange={(e) =>
              setForm({ ...form, evaluationPrompt: e.target.value })
            }
            rows={14}
            className="font-mono text-sm"
            placeholder="Descreva o papel do avaliador, escala de pontuação e regras..."
          />
          <button
            type="button"
            onClick={() =>
              setForm({
                ...form,
                evaluationPrompt: DEFAULT_EVALUATION_PREAMBLE,
              })
            }
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Restaurar padrão
          </button>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full h-11"
      >
        {mode === "create"
          ? "Criar template de avaliação"
          : "Salvar alterações"}
      </Button>
    </div>
  );
}

function WeightBadge({ total, ok }: { total: number; ok: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
        ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5" />
      )}
      {total}% / 100%
    </div>
  );
}
