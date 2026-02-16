'use client';

import { PrismaJson } from "@/prisma/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Template = {
  id?: number;
  name: string;
  promptTemplate: string;
  questionType: string;
};

type TemplateFormProps = {
  defaultValues?: Template;
  onSubmit: (data: Template) => void;
  mode: 'create' | 'edit';
};

export default function TemplateForm({ defaultValues, onSubmit, mode }: TemplateFormProps) {
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

  const [newTemplate, setNewTemplate] = useState<Template>({
    name: defaultValues?.name || "",
    promptTemplate: defaultValues?.promptTemplate || "",
    questionType: defaultValues?.questionType || "",
  });
  const [newParameter, setNewParameter] = useState({
    name: "",
    values: "",
    multipleSelect: false,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Template de Questões</h1>
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-xl font-semibold">Criar novo template</h2>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            value={newTemplate.name}
            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            placeholder="Template Name"
            className="mb-2"
          />

          <Select
            value={newTemplate.questionType}
            onValueChange={(value) => setNewTemplate({ ...newTemplate, questionType: value })}>
            <SelectGroup className="mb-2">
              <label>Tipo de questão</label>
              <SelectValue placeholder="Selecione o tipo de questão que esse template irá gerar" />
              <SelectTrigger>
                <SelectValue placeholder="Tipo de questão" />
              </SelectTrigger>
              <SelectContent defaultValue="multiple-choice">
                <SelectItem value="multiple-choice">Múltipla escolha</SelectItem>
                <SelectItem value="discursive">Discursiva</SelectItem>
                <SelectItem value="mixed">Ambas</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </SelectGroup>

          </Select>
          <Textarea
            value={newTemplate.promptTemplate}
            onChange={(e) => setNewTemplate({ ...newTemplate, promptTemplate: e.target.value })}
            placeholder="Prompt Template"
            className="mb-4" />
          <Button onClick={() => onSubmit(newTemplate)} className="mt-4">{mode == 'create' ? 'Create' : 'Update'}</Button>
        </CardContent>
      </Card>

    </div>
  );
}
