'use client';

import TemplateForm from "@/components/TemplateForm";
import { useRouter } from "next/navigation";

export default function CreateTemplatePage() {
  const router = useRouter();

  async function createTemplate(newTemplate: any) {
    if (!newTemplate.name || !newTemplate.promptTemplate) return;
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTemplate),
    });
    
    if (res.ok) {
      router.push("/templates");
    } else {
      const errorData = await res.json().catch(() => null);
      alert(`Falha ao criar template: ${errorData?.error || res.statusText}`);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Create Template</h1>
      <TemplateForm onSubmit={createTemplate} mode="create" />
    </div>
  );
}