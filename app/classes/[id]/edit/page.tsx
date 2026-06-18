"use client";

import ClassForm, { ClassFormData } from "@/components/ClassForm";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditClassPage() {
  const params = useParams();
  const router = useRouter();
  const [defaultValues, setDefaultValues] = useState<ClassFormData | null>(null);
  const [owner, setOwner] = useState<{ id: number; name: string; email: string } | undefined>();

  useEffect(() => {
    async function fetchClass() {
      const res = await fetch(`/api/classes/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        const c = data.class;
        setOwner(c.owner);
        setDefaultValues({
          name: c.name,
          collaborators: c.collaborators.map((col: any) => col.user),
          students: c.students,
          questionTemplates: c.questionTemplates,
          evaluationTemplates: c.evaluationTemplates,
        });
      }
    }
    fetchClass();
  }, [params.id]);

  async function handleSubmit(data: ClassFormData) {
    const res = await fetch(`/api/classes/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        collaborators: data.collaborators.map((c) => c.id),
        students: data.students.map((s) => s.id),
        questionTemplates: data.questionTemplates.map((t) => t.id),
        evaluationTemplates: data.evaluationTemplates.map((t) => t.id),
      }),
    });

    if (res.ok) router.push(`/classes/${params.id}`);
  }

  if (!defaultValues) {
    return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Editar turma</h1>
      <ClassForm mode="edit" owner={owner} defaultValues={defaultValues} onSubmit={handleSubmit} />
    </div>
  );
}
