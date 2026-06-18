"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QuestionRequestCreatePage } from "./questionRequests/create/_form";

export default function Home() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId");
  const [studentClasses, setStudentClasses] = useState<{ id: number; name: string }[]>([]);
  const [selectedClassName, setSelectedClassName] = useState<string>("");

  const firstName = session?.user?.name?.split(" ")[0] || "Usuário";

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.typeRole !== "STUDENT") return;
    fetch("/api/classes")
      .then((r) => r.json())
      .then((data) => setStudentClasses(data.classes ?? []));
  }, [status, session?.user?.typeRole]);

  if (status === "loading") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-sm text-gray-500">Carregando conteúdo...</div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {!session ? (
        <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-10 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Vamos testar seu conhecimento?
          </h1>
          <p className="text-base text-gray-600 mb-6 leading-relaxed max-w-3xl">
            Configure abaixo os tópicos para gerar um desafio personalizado de
            perguntas. O SelfTest, usando Inteligência Artificial, ajuda você a
            estudar melhor e acompanhar seu progresso com feedback inteligente
          </p>

          <button
            onClick={() => signIn("google")}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white text-base font-medium transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Entrar com Google
          </button>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <article className="rounded-lg border border-gray-100 p-4 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-800">
                1. Escolha um tema
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Selecione áreas da computação e níveis de dificuldade.
              </p>
            </article>
            <article className="rounded-lg border border-gray-100 p-4 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-800">
                2. Gere questões
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Receba questões personalizadas em segundos.
              </p>
            </article>
            <article className="rounded-lg border border-gray-100 p-4 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-800">
                3. Avalie seu desempenho
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Veja respostas e feedback detalhado da IA.
              </p>
            </article>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Oi, {firstName}!
            </h1>
            <p className="text-sm text-gray-500">
              Use o formulário abaixo para gerar ou revisar suas questões.
            </p>
          </div>

          {studentClasses.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-400 mb-1">
                {selectedClassName ? "Turma selecionada" : studentClasses.length === 1 ? "Sua turma" : "Suas turmas"}
              </p>
              <p className="text-lg font-bold text-blue-700">
                {selectedClassName || studentClasses.map((c) => c.name).join(" · ")}
              </p>
            </div>
          )}

          <QuestionRequestCreatePage
            classId={classId ?? undefined}
            onClassChange={(_id, name) => setSelectedClassName(name)}
          />
        </section>
      )}
    </main>
  );
}
