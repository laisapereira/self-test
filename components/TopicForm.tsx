'use client';

import { PrismaJson } from "@/prisma/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Topic = {
  id?: number;
  name: string;
  parameters: PrismaJson.QuestionRequestTemplateParameter[];
  evaluationCriteria?: any;
};

type TopicFormProps = {
  defaultValues?: Topic;
  onSubmit: (data: Topic) => void;
  mode: 'create' | 'edit';
};

export default function TopicForm({ defaultValues, onSubmit, mode }: TopicFormProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated" && session?.user?.isAdmin === false) {
      alert("You do not have permission to access this page.");
      router.push("/");
    }
  }, [status, router]);

  const [newTopic, setNewTopic] = useState<Topic>({
    name: defaultValues?.name || "",
    parameters: defaultValues?.parameters || [],
    evaluationCriteria: defaultValues?.evaluationCriteria || null,
  });
  
  const [newParameter, setNewParameter] = useState({
    name: "",
    values: "",
    multipleSelect: false,
  });

  function addParameter() {
    if (!newParameter.name) return;
    const valuesArray = newParameter.values.trim().length == 0 ? [] : newParameter.values.split(";").map((v) => v.trim());
    setNewTopic({
      ...newTopic,
      parameters: [
        ...newTopic.parameters,
        { ...newParameter, values: valuesArray },
      ],
    });
    setNewParameter({ name: "", values: "", multipleSelect: false });
  }

  function removeParameter(index: number) {
    setNewTopic({
      ...newTopic,
      parameters: newTopic.parameters.filter((_: any, i: number) => i !== index),
    });
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Cadastro de Temas</h1>
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-xl font-semibold">{mode === 'create' ? 'Criar Novo Tema' : 'Editar Tema'}</h2>
        </CardHeader>
        <CardContent>
          <Label htmlFor="topicName">Nome do Tema</Label>
          <Input
            id="topicName"
            type="text"
            value={newTopic.name}
            onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
            placeholder="Ex: Programação Mobile, Estruturas de Dados, etc."
            className="mb-4"
          />
          
          <h3 className="text-lg font-medium mb-2">Parâmetros do Tema</h3>
          <p className="text-sm text-gray-600 mb-4">
            Defina os parâmetros que o usuário poderá escolher ao criar questões sobre este tema.
          </p>
          
          <ul className="mt-4 space-y-2">
            {newTopic.parameters.map((param: any, index: any) => (
              <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <strong>{param.name}</strong> ({param.multipleSelect ? "Seleção Múltipla" : "Seleção Única"})
                  {param.values.length > 0 && (
                    <span className="text-sm text-gray-600 ml-2">
                      : {param.values.join(", ")}
                    </span>
                  )}
                </div>
                <Button variant="destructive" size="sm" onClick={() => removeParameter(index)}>
                  Remover
                </Button>
              </li>
            ))}
          </ul>
          
          <Card className="mt-4">
            <CardContent className="pt-4">
              <h3 className="text-lg font-medium mb-2">Adicionar Parâmetro</h3>
              <Label htmlFor="paramName">Nome do Parâmetro</Label>
              <Input
                id="paramName"
                type="text"
                value={newParameter.name}
                onChange={(e) => setNewParameter({ ...newParameter, name: e.target.value })}
                placeholder="Ex: linguagem, subtopico, nivel"
                className="mb-2"
              />
              <Label htmlFor="paramValues">Valores (separados por ponto e vírgula)</Label>
              <Input
                id="paramValues"
                type="text"
                value={newParameter.values}
                onChange={(e) => setNewParameter({ ...newParameter, values: e.target.value })}
                placeholder="Ex: Python; JavaScript; Java (deixe vazio para campo livre)"
                className="mb-2"
              />
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox 
                  id="multipleSelect"
                  checked={newParameter.multipleSelect}
                  onCheckedChange={(checked) => setNewParameter({ ...newParameter, multipleSelect: !!checked })}
                />
                <Label htmlFor="multipleSelect">Permitir seleção múltipla</Label>
              </div>
              <Button onClick={addParameter} className="mt-2">Adicionar Parâmetro</Button>
            </CardContent>
          </Card>
          
          <Button onClick={() => onSubmit(newTopic)} className="mt-4 w-full">
            {mode == 'create' ? 'Criar Tema' : 'Atualizar Tema'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
