"use client";

import { useEffect, useState, Fragment } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Users,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";

type GenerationItem = { label: string; score: number | null; questionCount: number };

type StudentInTemplate = {
  id: number;
  name: string | null;
  email: string;
  totalRequests: number;
  avgScore: number | null;
  generations: GenerationItem[];
  summary: string | null;
  summaryUpdatedAt: string | null;
};

type TemplateSectionData = {
  templateId: number;
  templateName: string;
  usageCount: number;
  avgScore: number | null;
  students: StudentInTemplate[];
};

type StudentStat = {
  id: number;
  name: string | null;
  email: string;
  totalRequests: number;
  totalAnswers: number;
  correctAnswers: number;
  avgScore: number | null;
  lastActivityAt: string | null;
};

type StatsData = {
  totalStudents: number;
  totalRequests: number;
  students: StudentStat[];
  studentsPage: number;
  studentsTotalPages: number;
  perTemplate: TemplateSectionData[];
};

function scoreColor(v: number) {
  return v >= 7 ? "text-emerald-600" : v >= 5 ? "text-amber-500" : "text-orange-500";
}

function parseSummary(raw: string): { main: string[]; tips: string[] } {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const tipKeywords = /revisar|recomend|livro|curso|plataforma|material|dica|sugest/i;
  const tipsStart = lines.findIndex((l) => tipKeywords.test(l));
  if (tipsStart === -1) return { main: lines, tips: [] };
  return { main: lines.slice(0, tipsStart), tips: lines.slice(tipsStart) };
}

export default function ClassDashboardPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState("");
  const [openTemplates, setOpenTemplates] = useState<Set<number>>(new Set());
  const [studentsPage, setStudentsPage] = useState(1);
  const [generatingSummary, setGeneratingSummary] = useState<Set<string>>(new Set());
  const [summaries, setSummaries] = useState<Map<string, string>>(new Map());

  const isProfessorOrAdmin =
    session?.user?.typeRole === "ADMIN" ||
    session?.user?.typeRole === "PROFESSOR";

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!isProfessorOrAdmin) {
      router.replace(`/classes/${params.id}`);
      return;
    }
    fetch(`/api/classes/${params.id}`)
      .then((r) => r.json())
      .then((classData) => setClassName(classData.class?.name ?? ""));
  }, [status, isProfessorOrAdmin, params.id, router]);

  useEffect(() => {
    if (status !== "authenticated" || !isProfessorOrAdmin) return;
    fetch(`/api/classes/${params.id}/stats?page=${studentsPage}`)
      .then((r) => r.json())
      .then((statsData) => {
        const safeStats: StatsData = {
          totalStudents: statsData.totalStudents ?? 0,
          totalRequests: statsData.totalRequests ?? 0,
          students: statsData.students ?? [],
          studentsPage: statsData.studentsPage ?? 1,
          studentsTotalPages: statsData.studentsTotalPages ?? 1,
          perTemplate: statsData.perTemplate ?? [],
        };
        setStats(safeStats);
        // Pre-populate summaries from stats data (only on first load)
        if (studentsPage === 1) {
          const initial = new Map<string, string>();
          for (const t of safeStats.perTemplate) {
            for (const s of t.students) {
              if (s.summary) initial.set(`${s.id}:${t.templateId}`, s.summary);
            }
          }
          setSummaries(initial);
        }
        setLoading(false);
      });
  }, [status, studentsPage, isProfessorOrAdmin, params.id]);

  const toggleTemplate = (templateId: number) => {
    setOpenTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
  };

  const generateSummary = async (studentId: number, templateId: number) => {
    const key = `${studentId}:${templateId}`;
    setGeneratingSummary((prev) => new Set(prev).add(key));
    try {
      const res = await fetch(`/api/classes/${params.id}/summaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, templateId }),
      });
      if (res.ok) {
        const { summary } = await res.json();
        setSummaries((prev) => new Map(prev).set(key, summary));
      }
    } finally {
      setGeneratingSummary((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Carregando dashboard...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-500">
        Sem dados disponíveis.
      </div>
    );
  }

  const activeStudents = stats.students.filter(
    (s) => s.totalRequests > 0,
  ).length;
  const scoredStudents = stats.students.filter((s) => s.avgScore !== null);
  const overallAvg =
    scoredStudents.length > 0
      ? scoredStudents.reduce((sum, s) => sum + (s.avgScore ?? 0), 0) /
        scoredStudents.length
      : null;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/classes/${params.id}`}
          className="text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-base font-semibold text-blue-600 tracking-tight">{className}</p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Alunos
            </p>
            <p className="text-3xl font-bold text-slate-800 mt-1">
              {stats.totalStudents}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Ativos
            </p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {activeStudents}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Gerações
            </p>
            <p className="text-3xl font-bold text-slate-800 mt-1">
              {stats.totalRequests}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Média geral
            </p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">
              {overallAvg !== null ? overallAvg.toFixed(1) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seções por template */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Desempenho por template
        </h2>

        {stats.perTemplate.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            Nenhum template associado a esta turma.
          </p>
        ) : (
          stats.perTemplate.map((t) => {
            const isOpen = openTemplates.has(t.templateId);
            return (
              <Card
                key={t.templateId}
                className="border-slate-200 overflow-hidden"
              >
                <button
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  onClick={() => toggleTemplate(t.templateId)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                    <span className="font-medium text-slate-800 truncate">
                      {t.templateName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm shrink-0">
                    <span className="text-slate-400">
                      {t.usageCount} geraç{t.usageCount !== 1 ? "ões" : "ão"}
                    </span>
                    {t.avgScore !== null ? (
                      <span
                        className={`font-semibold ${scoreColor(t.avgScore)}`}
                      >
                        Média {t.avgScore.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">
                        Sem avaliações
                      </span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <CardContent className="pt-0 pb-4 px-4 border-t border-slate-100">
                    {t.students.length === 0 ? (
                      <p className="text-sm text-slate-400 py-4 text-center">
                        Nenhum aluno usou este template.
                      </p>
                    ) : (
                      <div className="overflow-x-auto mt-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="text-left py-2 px-2 font-medium text-slate-400 w-40">
                                Aluno
                              </th>
                              <th className="text-center py-2 px-2 font-medium text-slate-400 w-20">
                                Gerações
                              </th>
                              <th className="text-center py-2 px-2 font-medium text-slate-400 w-16">
                                Média
                              </th>
                              <th className="text-left py-2 px-2 font-medium text-slate-400">
                                Análise de desempenho
                              </th>
                              <th className="py-2 px-2 w-32"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.students.map((s) => {
                              const key = `${s.id}:${t.templateId}`;
                              const summary = summaries.get(key) ?? null;
                              const isGenerating = generatingSummary.has(key);
                              return (
                                <Fragment key={s.id}>
                                  <tr className="align-top border-t border-slate-100">
                                    <td className="py-3 px-2">
                                      <p className="font-medium text-slate-800">{s.name ?? "—"}</p>
                                      <p className="text-xs text-slate-400">{s.email}</p>
                                    </td>
                                    <td className="py-3 px-2 text-center text-slate-700">{s.totalRequests}</td>
                                    <td className="py-3 px-2 text-center">
                                      {s.avgScore !== null ? (
                                        <span className={`font-semibold ${scoreColor(s.avgScore)}`}>{s.avgScore.toFixed(1)}</span>
                                      ) : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="py-3 px-2">
                                      {summary ? (() => {
                                        const { main, tips } = parseSummary(summary);
                                        return (
                                          <div className="space-y-2">
                                            {main.length > 0 && (
                                              <ul className="space-y-0.5">
                                                {main.map((line, i) => (
                                                  <li key={i} className="text-sm text-slate-600 leading-relaxed flex gap-1.5">
                                                    <span className="text-slate-300 shrink-0">–</span>
                                                    <span>{line.replace(/^[-–]\s*/, "")}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                            {tips.length > 0 && (
                                              <div className="border-t border-slate-100 pt-2 space-y-0.5">
                                                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-widest flex items-center gap-1 mb-1">
                                                  <Lightbulb className="h-3 w-3" /> Dicas
                                                </p>
                                                {tips.map((line, i) => (
                                                  <div key={i} className="text-sm text-slate-500 leading-relaxed flex gap-1.5">
                                                    <span className="text-amber-300 shrink-0">–</span>
                                                    <span>{line.replace(/^[-–]\s*/, "")}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })() : <span className="text-sm text-slate-300 italic">Sem análise gerada.</span>}
                                    </td>
                                    <td className="py-3 px-2">
                                      <Button size="sm" variant="outline" disabled={isGenerating}
                                        onClick={() => generateSummary(s.id, t.templateId)}
                                        className="text-xs whitespace-nowrap">
                                        {isGenerating ? "Gerando..." : summary ? "Atualizar" : "Gerar análise"}
                                      </Button>
                                    </td>
                                  </tr>

                                  {s.generations.length > 0 && (
                                    <tr className="bg-slate-50/50">
                                      <td colSpan={5} className="px-6 pb-4 pt-1">
                                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Resumo por parâmetro</p>
                                        <table className="w-full text-xs border-separate border-spacing-0">
                                          <thead>
                                            <tr>
                                              <th className="text-left py-1.5 pr-4 font-medium text-slate-400 border-b border-slate-100">Parâmetro</th>
                                              <th className="text-center py-1.5 w-20 font-medium text-slate-400 border-b border-slate-100">Questões</th>
                                              <th className="text-center py-1.5 w-16 font-medium text-slate-400 border-b border-slate-100">Nota</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {s.generations.map((g, i) => (
                                              <tr key={i} className="border-b border-slate-100 last:border-0">
                                                <td className="py-1.5 pr-4 text-slate-600">{g.label}</td>
                                                <td className="py-1.5 text-center text-slate-400">{g.questionCount}</td>
                                                <td className="py-1.5 text-center">
                                                  {g.score !== null
                                                    ? <span className={`font-semibold ${scoreColor(g.score)}`}>{g.score.toFixed(1)}</span>
                                                    : <span className="text-slate-300">—</span>}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Visão geral dos alunos */}
      <Card className="border-slate-200">
        <CardHeader>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            Alunos na turma
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">
                    Aluno
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">
                    Gerações
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">
                    Respostas
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">
                    Acertos
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">
                    Média
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">
                    Última atividade
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.students.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {s.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-400">{s.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">
                      {s.totalRequests}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">
                      {s.totalAnswers}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.totalAnswers > 0 ? (
                        <span
                          className={
                            s.correctAnswers / s.totalAnswers >= 0.7
                              ? "text-emerald-600 font-medium"
                              : "text-slate-700"
                          }
                        >
                          {s.correctAnswers}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.avgScore !== null ? (
                        <span
                          className={`font-semibold ${scoreColor(s.avgScore)}`}
                        >
                          {s.avgScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                      {s.lastActivityAt
                        ? new Date(s.lastActivityAt).toLocaleDateString("pt-BR")
                        : "Nunca usou"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.students.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">
                Nenhum aluno na turma.
              </p>
            )}
          </div>

          {stats.studentsTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Página {stats.studentsPage} de {stats.studentsTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={studentsPage <= 1}
                  onClick={() => setStudentsPage((p) => p - 1)}
                  className="rounded px-3 py-1 text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  disabled={studentsPage >= stats.studentsTotalPages}
                  onClick={() => setStudentsPage((p) => p + 1)}
                  className="rounded px-3 py-1 text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
