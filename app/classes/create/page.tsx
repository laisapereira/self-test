"use client";

import ClassForm, { ClassFormData } from "@/components/ClassForm";
import { useRouter } from "next/navigation";

export default function CreateClassPage() {
  const router = useRouter();

  // TODO: conectar ao backend
  async function handleSubmit(data: ClassFormData) {
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        collaborators: data.collaborators.map((c) => c.id),
        students: data.students.map((s) => s.id),
        questionTemplates: data.questionTemplates.map((t) => t.id),
        evaluationTemplates: data.evaluationTemplates.map((t) => t.id),
      }),
    });

    if (res.ok) router.push("/classes");
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Criar turma</h1>
      <ClassForm mode="create" onSubmit={handleSubmit} />
    </div>
  );
}
