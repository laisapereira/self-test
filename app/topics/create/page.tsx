'use client';

import TopicForm from "@/components/TopicForm";
import { useRouter } from "next/navigation";

export default function CreateTopicPage() {
  const router = useRouter();

  async function createTopic(newTopic: any) {
    if (!newTopic.name) {
      alert("O nome do tema é obrigatório!");
      return;
    }
    
    const response = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTopic),
    });
    
    if (response.ok) {
      router.push("/topics");
    } else {
      alert("Erro ao criar tema");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Criar Tema</h1>
      <TopicForm onSubmit={createTopic} mode="create" />
    </div>
  );
}
