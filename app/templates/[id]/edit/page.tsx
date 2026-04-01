"use client";

import TemplateForm from "@/components/TemplateForm";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const id = use(params).id;

  async function fetchTemplate(id: string) {
    const response = await fetch(`/api/templates/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch template");
    }
    return response.json();
  }

  async function updateTemplate(newTemplate: any) {
    if (!newTemplate.name || !newTemplate.promptTemplate) return;
    console.log(
      "[TemplateEditPage] atualizando template | id:",
      id,
      "nome:",
      newTemplate.name,
    );
    const res = await fetch(`/api/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTemplate),
    });

    if (res.ok) {
      router.push("/templates");
    } else {
      const errorData = await res.json().catch(() => null);
      alert(`Falha ao editar template: ${errorData?.error || res.statusText}`);
    }
  }

  useEffect(() => {
    async function loadTemplate() {
      try {
        const templateData = await fetchTemplate(id);
        setTemplate(templateData);
      } catch (error) {
        console.error(
          "[TemplateEditPage] falha ao buscar template | id:",
          id,
          error,
        );
      }
    }
    loadTemplate();
  }, [id]);

  if (!template) {
    return <div>Carregando template...</div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Editar template</h1>
      <TemplateForm
        onSubmit={updateTemplate}
        mode="edit"
        defaultValues={template}
      />
    </div>
  );
}
