"use client";

import { useEffect, useState } from "react";
import { Zap, MessageSquare, BarChart2, TrendingUp, School } from "lucide-react";

type TypeRow = {
  type: "QUESTION_GENERATION" | "ANSWER_EVALUATION" | "PERFORMANCE_SUMMARY";
  promptTokens: number;
  completionTokens: number;
  count: number;
};

type MonthRow = {
  month: string;
  type: string;
  promptTokens: number;
  completionTokens: number;
  count: number;
};

type ClassRow = {
  classId: number;
  className: string;
  promptTokens: number;
  completionTokens: number;
  count: number;
};

type UsageData = {
  byType: TypeRow[];
  byMonth: MonthRow[];
  byClass: ClassRow[];
  total: { promptTokens: number; completionTokens: number; count: number };
};

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  QUESTION_GENERATION: {
    label: "Geração de questões",
    icon: <Zap className="h-4 w-4" />,
    color: "text-blue-600 bg-blue-50 border-blue-100",
  },
  ANSWER_EVALUATION: {
    label: "Avaliação de respostas",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-violet-600 bg-violet-50 border-violet-100",
  },
  PERFORMANCE_SUMMARY: {
    label: "Análise de desempenho",
    icon: <BarChart2 className="h-4 w-4" />,
    color: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-sm text-slate-400">Carregando dados de uso...</div>;
  }

  if (!data) {
    return <div className="p-8 text-sm text-red-500">Erro ao carregar dados.</div>;
  }

  const months = [...new Set(data.byMonth.map((r) => r.month))].sort().reverse();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Uso do modelo LLM</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          DeepSeek · tokens de entrada e saída por tipo de operação
        </p>
      </div>

      {/* Total geral */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-6 py-4 flex items-center gap-6">
        <TrendingUp className="h-6 w-6 text-slate-400 shrink-0" />
        <div className="flex gap-8 flex-wrap">
          <div>
            <p className="text-xs text-slate-400 font-medium">Gerações totais</p>
            <p className="text-2xl font-bold text-slate-800">{fmt(data.total.count)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Tokens de entrada</p>
            <p className="text-2xl font-bold text-blue-600">{fmt(data.total.promptTokens)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Tokens de saída</p>
            <p className="text-2xl font-bold text-violet-600">{fmt(data.total.completionTokens)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total de tokens</p>
            <p className="text-2xl font-bold text-slate-700">
              {fmt(data.total.promptTokens + data.total.completionTokens)}
            </p>
          </div>
        </div>
      </div>

      {/* Por tipo */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Por tipo de operação
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {data.byType.map((row) => {
            const meta = TYPE_LABELS[row.type];
            return (
              <div
                key={row.type}
                className={`rounded-xl border px-5 py-4 space-y-3 ${meta?.color ?? "border-slate-100 bg-slate-50"}`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  {meta?.icon}
                  {meta?.label ?? row.type}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gerações</span>
                    <span className="font-medium">{fmt(row.count)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Input</span>
                    <span className="font-medium">{fmt(row.promptTokens)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Output</span>
                    <span className="font-medium">{fmt(row.completionTokens)}</span>
                  </div>
                  <div className="flex justify-between border-t border-current/10 pt-1 mt-1">
                    <span className="text-slate-500">Total</span>
                    <span className="font-bold">{fmt(row.promptTokens + row.completionTokens)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Por turma */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <School className="h-4 w-4" /> Por turma
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          {data.byClass.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400 italic text-center">
              Nenhuma geração vinculada a uma turma ainda. Os dados aparecem aqui nas próximas gerações.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Turma</th>
                  <th className="px-4 py-3 text-right">Gerações</th>
                  <th className="px-4 py-3 text-right">Input</th>
                  <th className="px-4 py-3 text-right">Output</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.byClass.map((row) => (
                  <tr
                    key={row.classId}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-700">{row.className}</td>
                    <td className="px-4 py-3 text-right">{fmt(row.count)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{fmt(row.promptTokens)}</td>
                    <td className="px-4 py-3 text-right text-violet-600">{fmt(row.completionTokens)}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      {fmt(row.promptTokens + row.completionTokens)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Por mês */}
      {months.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Por mês
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Mês</th>
                  <th className="px-4 py-3 text-left">Operação</th>
                  <th className="px-4 py-3 text-right">Gerações</th>
                  <th className="px-4 py-3 text-right">Input</th>
                  <th className="px-4 py-3 text-right">Output</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {months.map((month) => {
                  const rows = data.byMonth.filter((r) => r.month === month);
                  return rows.map((row, i) => (
                    <tr
                      key={`${month}-${row.type}`}
                      className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                    >
                      {i === 0 && (
                        <td
                          className="px-4 py-3 font-medium text-slate-700 align-top capitalize"
                          rowSpan={rows.length}
                        >
                          {fmtMonth(month)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-500">
                        {TYPE_LABELS[row.type]?.label ?? row.type}
                      </td>
                      <td className="px-4 py-3 text-right">{fmt(row.count)}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{fmt(row.promptTokens)}</td>
                      <td className="px-4 py-3 text-right text-violet-600">{fmt(row.completionTokens)}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {fmt(row.promptTokens + row.completionTokens)}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.total.count === 0 && (
        <p className="text-sm text-slate-400 italic text-center py-8">
          Nenhuma geração registrada ainda. Os dados aparecem aqui a partir da próxima geração.
        </p>
      )}
    </div>
  );
}
