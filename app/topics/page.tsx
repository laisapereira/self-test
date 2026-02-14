'use client';

import { useState, useEffect, Fragment } from "react";
import { PrismaJson } from "@/prisma/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Topic = {
  id: number;
  name: string;
  parameters: PrismaJson.QuestionRequestTemplateParameter[];
  evaluationCriteria?: any;
  createdAt: Date;
  updatedAt: Date;
};

export default function TopicsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated" && session?.user?.isAdmin === false) {
      alert("Você não tem permissão para acessar esta página.");
      router.push("/");
    }
  }, [status, router]);

  const [topics, setTopics] = useState<Topic[]>([]);

  async function fetchTopics() {
    const response = await fetch("/api/topics");
    const data = await response.json();
    setTopics(data);
  }

  useEffect(() => {
    fetchTopics();
  }, []);

  async function removeTopic(id: number) {
    if (!confirm("Tem certeza que deseja remover este tema?")) return;
    
    await fetch(`/api/topics/${id}`, {
      method: "DELETE",
    });
    fetchTopics();
  }

  return (
    <div className="p-4">
      <Button onClick={() => router.push("/topics/create")} className="mb-4">
        Criar Novo Tema
      </Button>
      <h1 className="text-2xl font-bold mb-4">Temas Cadastrados</h1>
      <TopicList topics={topics} removeTopic={removeTopic} />
    </div>
  );
}

function TopicList(props: { topics: Topic[], removeTopic: (id: number) => void }) {
  const { topics, removeTopic } = props;
  const router = useRouter();

  if (topics.length === 0) {
    return <p className="text-gray-500">Nenhum tema cadastrado ainda.</p>;
  }

  return (
    <Fragment>
      <ul className="space-y-4">
        {topics.map((topic) => (
          <Card key={topic.id}>
            <CardHeader>
              <h3 className="text-lg font-medium">{topic.name}</h3>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold mb-2">Parâmetros:</h4>
              {topic.parameters.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {topic.parameters.map((param, index) => (
                    <li key={index} className="text-sm">
                      <strong>{param.name}</strong> ({param.multipleSelect ? "Seleção Múltipla" : "Seleção Única"})
                      {param.values.length > 0 && (
                        <span className="text-gray-600">: {param.values.join(", ")}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Nenhum parâmetro definido</p>
              )}
              <div className="mt-4 space-x-2">
                <Button variant="outline" onClick={() => router.push(`/topics/${topic.id}/edit`)}>
                  Editar
                </Button>
                <Button variant="destructive" onClick={() => removeTopic(topic.id)}>
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </ul>
    </Fragment>
  );
}
