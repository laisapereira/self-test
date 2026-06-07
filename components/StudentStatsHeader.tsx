"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, ChevronUp, BookOpen, Lightbulb } from "lucide-react";

type TemplateStat = {
  templateId: number;
  templateName: string;
  requests: number;
  answers: number;
  correctAnswers: number;
  avgScore: number | null;
  summary: string | null;
};

type Stats = {
  totalRequests: number;
  totalAnswers: number;
  correctAnswers: number;
  avgScore: number | null;
  byTemplate: TemplateStat[];
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

export function StudentStatsHeader() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState<Set<number>>(new Set());
  const [localSummaries, setLocalSummaries] = useState<Map<number, string>>(new Map());

  async function handleGenerateSummary(templateId: number) {
    setGenerating((prev) => new Set(prev).add(templateId));
    try {
      const res = await fetch("/api/users/me/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (res.ok) {
        const { summary } = await res.json();
        setLocalSummaries((prev) => new Map(prev).set(templateId, summary));
      }
    } finally {
      setGenerating((prev) => {
        const next = new Set(prev);
        next.delete(templateId);
        return next;
      });
    }
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "você";

  useEffect(() => {
    fetch("/api/users/me/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setStats(data); });
  }, []);

  if (!stats || stats.totalRequests === 0) return null;

  const correctPct =
    stats.totalAnswers > 0 ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100) : 0;

  const ranked = [...stats.byTemplate].filter((t) => t.avgScore !== null);
  const sorted = [...ranked].sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const showInsights = best && worst && best.templateId !== worst.templateId;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Gerações</p>
          <p className="text-2xl font-bold text-slate-800">{stats.totalRequests}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Respostas</p>
          <p className="text-2xl font-bold text-slate-800">{stats.totalAnswers}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Acertos</p>
          <p className="text-2xl font-bold text-emerald-600">{correctPct}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Média geral</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats.avgScore !== null ? stats.avgScore.toFixed(1) : "—"}
          </p>
        </div>
      </div>

      {stats.byTemplate.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {open ? "Ocultar análise" : "Ver análise por tema"}
          </button>
        </div>
      )}

      {open && stats.byTemplate.length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Greeting header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-base font-semibold text-slate-800">
              Oi, {firstName}! Aqui está sua análise detalhada por tema.
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Veja como você está evoluindo em cada área estudada.
            </p>
          </div>

          <div className="p-4 space-y-5">
            {/* Best / needs work cards */}
            {showInsights && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3">
                  <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-widest mb-1">
                    Seu ponto forte
                  </p>
                  <p className="text-sm font-medium text-emerald-800 leading-snug">{best.templateName}</p>
                  {best.avgScore !== null && (
                    <p className="text-lg font-bold text-emerald-700 mt-1">{best.avgScore.toFixed(1)}</p>
                  )}
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                  <p className="text-[11px] text-amber-600 font-semibold uppercase tracking-widest mb-1">
                    Oportunidade de crescimento
                  </p>
                  <p className="text-sm font-medium text-amber-800 leading-snug">{worst.templateName}</p>
                  {worst.avgScore !== null && (
                    <p className="text-lg font-bold text-amber-700 mt-1">{worst.avgScore.toFixed(1)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Per-template breakdown */}
            <div className="space-y-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Por tema
              </p>
              {stats.byTemplate.map((t) => {
                const summary = localSummaries.get(t.templateId) ?? t.summary;
                const { main, tips } = summary ? parseSummary(summary) : { main: [], tips: [] };
                const isGenerating = generating.has(t.templateId);
                return (
                  <div key={t.templateId} className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-slate-700 leading-snug flex-1 min-w-0">
                        {t.templateName}
                      </span>
                      <span className="text-xs text-slate-400">
                        {t.requests} geração{t.requests !== 1 ? "ões" : ""}
                      </span>
                      {t.avgScore !== null ? (
                        <span className={`text-sm font-bold ${scoreColor(t.avgScore)}`}>
                          {t.avgScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">sem nota</span>
                      )}
                    </div>

                    {main.length > 0 && (
                      <ul className="space-y-1">
                        {main.map((line, i) => (
                          <li key={i} className="text-sm text-slate-600 leading-relaxed flex gap-2">
                            <span className="text-slate-300 shrink-0">–</span>
                            <span>{line.replace(/^[-–]\s*/, "")}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {tips.length > 0 && (
                      <div className="border-t border-slate-100 pt-2 space-y-1">
                        <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" /> Dicas: materiais que recomendo
                        </p>
                        <ul className="space-y-1">
                          {tips.map((line, i) => (
                            <li key={i} className="text-sm text-slate-600 leading-relaxed flex gap-2">
                              <span className="text-amber-300 shrink-0">–</span>
                              <span>{line.replace(/^[-–]\s*/, "")}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-0.5">
                      {!summary && !isGenerating && (
                        <p className="text-xs text-slate-400 italic">Nenhuma análise gerada ainda.</p>
                      )}
                      {isGenerating && (
                        <p className="text-xs text-slate-400 italic">Gerando análise...</p>
                      )}
                      <button
                        disabled={isGenerating}
                        onClick={() => handleGenerateSummary(t.templateId)}
                        className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {summary ? "Atualizar análise" : "Gerar minha análise"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
