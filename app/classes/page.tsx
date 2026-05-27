"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Link2, Crown } from "lucide-react";

type Class = {
  id: number;
  name: string;
  link: string;
  ownerId: number;
  _count?: { students: number; questionTemplates: number };
};

export default function ClassesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);

  async function fetchClasses() {
    const res = await fetch("/api/classes");
    if (res.ok) {
      const data = await res.json();
      setClasses(data.classes);
    }
  }

  useEffect(() => {
    if (status === "authenticated") fetchClasses();
  }, [status]);

  if (status === "loading") {
    return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  }

  const canCreate =
    session?.user?.typeRole === "ADMIN" ||
    session?.user?.typeRole === "PROFESSOR";

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Turmas</h1>
        {canCreate && (
          <Button onClick={() => router.push("/classes/create")} className="h-11">
            Criar turma
          </Button>
        )}
      </div>

      {classes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500 text-sm">
            {canCreate
              ? "Você ainda não tem turmas. Crie uma para começar."
              : "Você ainda não foi adicionado a nenhuma turma."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => {
            return (
              <li key={c.id}>
                <Card
                  className="border-gray-200 hover:shadow-md transition-shadow cursor-pointer h-full"
                  onClick={() => router.push(`/classes/${c.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-lg font-semibold text-gray-800 leading-tight">
                        {c.name}
                      </h2>
                      {session?.user?.typeRole !== "STUDENT" && (
                        <span className="flex items-center gap-1 shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                          <Crown className="h-3 w-3" />
                          Professor
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {c._count?.students ?? 0} aluno(s)
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {c._count?.questionTemplates ?? 0} template(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Link2 className="h-3 w-3" />
                      <span className="font-mono">{c.link}</span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
