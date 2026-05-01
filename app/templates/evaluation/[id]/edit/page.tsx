"use client";

import EvaluationTemplateForm, {
  type EvaluationTemplateFormData,
} from "@/components/EvaluationTemplateForm";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

type RawTemplate = {
  id: number;
  name: string;
  description: string | null;
  evaluationPrompt: string | null;
  criteria: {
    id: number;
    weight: number;
    order: number;
    criterion: { id: number; name: string; description: string };
  }[];
  _count: { questionRequestTemplates: number };
};

export default function EditEvaluationTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [raw, setRaw] = useState<RawTemplate | null>(null);

  useEffect(() => {
    fetch(`/api/templates/evaluation/${id}`)
      .then((r) => r.json())
      .then(setRaw)
      .catch(console.error);
  }, [id]);

  async function updateTemplate(data: {
    name: string;
    description: string;
    evaluationPrompt: string;
    criteria: { criterionName: string; description: string; weight: number }[];
  }) {
    const res = await fetch(`/api/templates/evaluation/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push("/templates/evaluation");
    } else {
      const errorData = await res.json().catch(() => null);
      alert(
        `Falha ao atualizar template: ${errorData?.error ?? res.statusText}`,
      );
    }
  }

  if (!raw) {
    return (
      <div className="p-8 text-center text-slate-500">
        Carregando template...
      </div>
    );
  }

  const defaultValues: EvaluationTemplateFormData = {
    name: raw.name,
    description: raw.description ?? "",
    evaluationPrompt: raw.evaluationPrompt ?? "",
    criteria: raw.criteria.map((tc) => ({
      criterionName: tc.criterion.name ?? "",
      description: tc.criterion.description,
      weight: Math.round(tc.weight * 100),
    })),
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Editar template de avaliação</h1>
      <EvaluationTemplateForm
        onSubmit={updateTemplate}
        mode="edit"
        defaultValues={defaultValues}
        linkedCount={raw._count.questionRequestTemplates}
      />
    </div>
  );
}
