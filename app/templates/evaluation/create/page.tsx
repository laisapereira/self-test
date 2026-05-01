"use client";

import EvaluationTemplateForm from "@/components/EvaluationTemplateForm";
import { useRouter } from "next/navigation";

export default function CreateEvaluationTemplatePage() {
  const router = useRouter();

  async function createTemplate(data: {
    name: string;
    description: string;
    criteria: { description: string; weight: number }[];
  }) {
    const res = await fetch("/api/templates/evaluation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push("/templates/evaluation");
    } else {
      const errorData = await res.json().catch(() => null);
      alert(
        `Falha ao criar template: ${errorData?.error ?? res.statusText}`,
      );
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Criar template de avaliação</h1>
      <EvaluationTemplateForm onSubmit={createTemplate} mode="create" />
    </div>
  );
}
