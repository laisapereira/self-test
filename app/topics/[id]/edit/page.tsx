'use client';

import TopicForm from "@/components/TopicForm";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

export default function EditTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [topic, setTopic] = useState<any>(null);
  const id = use(params).id;

  async function fetchTopic(id: string) {
    const response = await fetch(`/api/topics/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch topic");
    }
    return response.json();
  }
  
  async function updateTopic(updatedTopic: any) {
    if (!updatedTopic.name) {
      alert("O nome do tema é obrigatório!");
      return;
    }
    
    const response = await fetch(`/api/topics/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedTopic),
    });
    
    if (response.ok) {
      router.push("/topics");
    } else {
      alert("Erro ao atualizar tema");
    }
  }
  
  useEffect(() => {
    async function loadTopic() {
      try {
        const topicData = await fetchTopic(id);
        setTopic(topicData);
      } catch (error) {
        console.error("Error fetching topic:", error);
      }
    }
    loadTopic();
  }, [id]);

  if (!topic) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Editar Tema</h1>
      <TopicForm onSubmit={updateTopic} mode="edit" defaultValues={topic} />
    </div>
  );
}
