import { Answer, AutoEvaluation, Question } from "@/prisma";
import { PrismaJson } from "@/prisma/types";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || "");
  return !inline && match ? (
    <SyntaxHighlighter
      style={oneLight as any}
      language={match[1]}
      PreTag="div"
      className="rounded-md my-2 border border-gray-200 bg-gray-50 p-2"
      {...props}
    >
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  ) : (
    <code
      className={`${className || ""} bg-slate-100 text-slate-800 rounded px-1 py-0.5 font-mono text-xs`}
      {...props}
    >
      {children}
    </code>
  );
};

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ConfidenceLevel } from "./confidenceLevel";
import { set } from "date-fns";
import { Spinner } from "./spinner";

export type EvaluationCriteria = {
  description: string;
  weight: number;
};

type CriterionScore = {
  description: string;
  weight: number;
  score: number;
};

export function QuestionCard(props: {
  question: Question;
  userId?: number;
  withAnswer?: Answer;
  withEvaluation?: AutoEvaluation;
  questionNumber?: number;
}) {
  const { question, questionNumber } = props;
  const [alternative, setAlternative] = useState<number | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(props.withAnswer ?? null);
  const [discursiveAnswer, setDiscursiveAnswer] = useState<string>("");
  const [feedbackLLM, setFeedbackLLM] = useState<AutoEvaluation | null>(
    props.withEvaluation ?? null,
  );
  const [criteriaScores, setCriteriaScores] = useState<CriterionScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams();
    if (props.userId) {
      searchParams.append("userId", props.userId.toString());
    }
    // searchParams.append("userId", userId ? userId.toString() : currentUser.id.toString());

    const fetchDiscursiveAnswer = async () => {
      try {
        const response = await fetch(
          `/api/questions/${question.id}/answers/discursiveAnswers?${searchParams.toString()}`,
        );

        if (response.status === 404) return;

        const { answer, feedbackLLM, criteriaScores } = await response.json();

        setAnswer(answer);
        setCriteriaScores(criteriaScores ?? []);

        setFeedbackLLM(feedbackLLM ?? null);
      } catch (error) {
        console.error(
          "[QuestionCard] falha ao buscar resposta discursiva | questionId:",
          question.id,
          error,
        );
      }
    };

    const fetchAnswer = async () => {
      const response = await fetch(
        `/api/questions/${question.id}/answers?${searchParams.toString()}`,
      );

      if (response.status === 404) return;

      const answer = await response.json();
      setAnswer(answer);
    };

    fetchAnswer();

    question.type === "multiple-choice"
      ? fetchAnswer()
      : fetchDiscursiveAnswer();
  }, [question.id, props.question]);

  useEffect(() => {
    if (answer) {
      unstable_batchedUpdates(() => {
        setAlternative(answer.answerIndex);
        setConfidenceLevel(answer.confidenceLevel);
      });
    }
  }, [answer]);

  async function submitAnswer() {
    if (alternative === null || confidenceLevel === null) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/questions/${question.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerIndex: alternative, confidenceLevel }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(
          "[QuestionCard] falha ao enviar resposta | questionId:",
          question.id,
          "status:",
          response.status,
          text,
        );
        throw new Error("Failed to submit discursive answer");
      }

      const data = await response.json();
      setAnswer(data);
      console.log(
        "[QuestionCard] resposta enviada com sucesso | questionId:",
        question.id,
      );
    } catch (error) {
      console.error(
        "[QuestionCard] erro no request de submissao de resposta | questionId:",
        question.id,
        error,
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function submitDiscursiveAnswer(
    evaluationCriteria: EvaluationCriteria[] = [],
  ) {
    if (!discursiveAnswer.trim() || confidenceLevel === null) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/questions/${question.id}/answers/discursiveAnswers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            openAnswer: discursiveAnswer,
            confidenceLevel,
            evaluationCriteria,
          }),
        },
      );
      if (!response.ok) {
        const text = await response.text();
        console.error(
          "[QuestionCard] falha ao enviar resposta discursiva | questionId:",
          question.id,
          "status:",
          response.status,
          text,
        );
        throw new Error("Failed to submit discursive answer");
      }
      const { answer, feedbackLLM, criteriaScores } = await response.json();
      setAnswer(answer);
      setFeedbackLLM(feedbackLLM);
      setCriteriaScores(criteriaScores);
      console.log(
        "[QuestionCard] resposta discursiva enviada com sucesso | questionId:",
        question.id,
      );
    } catch (error) {
      console.error(
        "[QuestionCard] erro no request de submissao de resposta discursiva | questionId:",
        question.id,
        error,
      );
    } finally {
      setIsLoading(false);
    }
  }

  function getAlternativeStyle(alternativeIdx: number) {
    if (answer === null)
      return "border-gray-100 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer";

    if (alternativeIdx === question.correctAnswerIndex) {
      return "border-green-200 bg-green-50 text-green-800";
    }

    if (
      alternative === alternativeIdx &&
      alternativeIdx !== question.correctAnswerIndex
    ) {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-transparent bg-white text-gray-500 opacity-60";
  }

  return (
    <Card className="w-full bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-200 border border-gray-200/70">
      <div className="bg-white border-b border-gray-200">
        <CardHeader className="p-3 sm:p-4 pb-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-800">
                Questão {questionNumber}
              </h3>
              <p className="text-xs text-slate-500">
                Tipo:{" "}
                {question.type === "discursive"
                  ? "Discursiva"
                  : "Múltipla escolha"}
              </p>
            </div>
            {answer && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${answer.correct ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}
              >
                {answer.correct ? "Correta" : "Incorreta"}
              </span>
            )}
          </div>
        </CardHeader>

        <div className="p-3 sm:p-4">
          <div className="prose prose-sm max-w-none text-slate-800 prose-headings:text-slate-900">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{ code: CodeBlock }}
            >
              {question.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      <CardContent className="p-4 sm:p-5 bg-white space-y-4">
        {question.type === "discursive" ? (
          answer === null ? (
            <div>
              <textarea
                className="w-full border rounded-lg p-3 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                rows={5}
                value={discursiveAnswer}
                onChange={(e) => setDiscursiveAnswer(e.target.value)}
                placeholder="Digite sua resposta aqui..."
                disabled={answer !== null}
              />

              <div className="mt-4">
                <ConfidenceLevel
                  questionId={question.id}
                  value={confidenceLevel}
                  disabled={answer !== null}
                  onChange={setConfidenceLevel}
                />
              </div>

              <div className="mt-4">
                {isLoading ? (
                  <Spinner>Enviando a resposta...</Spinner>
                ) : (
                  <Button
                    variant="default"
                    disabled={
                      !discursiveAnswer.trim() || confidenceLevel === null
                    }
                    onClick={() =>
                      submitDiscursiveAnswer(
                        question.evaluationCriteria as EvaluationCriteria[],
                      )
                    }
                  >
                    Enviar resposta
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <div className="text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider">
                  Sua resposta
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 text-sm text-slate-800 leading-relaxed font-mono whitespace-pre-wrap">
                  {answer?.openAnswer}
                </div>
              </div>

              {criteriaScores && criteriaScores.length > 0 && (
                <div className="mb-6 overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2 border-b">Critério</th>
                        <th className="px-3 py-2 border-b text-center w-20">
                          Peso
                        </th>
                        <th className="px-3 py-2 border-b text-center w-20">
                          Nota
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {criteriaScores.map((c, index) => (
                        <tr key={index} className="bg-white">
                          <td className="px-3 py-2 font-medium text-gray-700">
                            {c.description}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500">
                            {c.weight}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-800">
                            {c.score}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {feedbackLLM && (
                <div className="mt-4 border border-gray-200 bg-gray-50 rounded-lg p-4 sm:p-5 mb-4">
                  <div className="text-xs uppercase font-bold text-gray-500 mb-3 tracking-wider">
                    Feedback do modelo
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-medium text-slate-700 text-sm">
                      Nota:
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-slate-800 shadow-sm">
                      {feedbackLLM.score}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {feedbackLLM.justification}
                  </p>
                </div>
              )}
            </div>
          )
        ) : (
          <>
            <RadioGroup
              disabled={answer !== null}
              className="flex flex-col space-y-3"
              value={alternative !== null ? String(alternative) : undefined}
              onValueChange={(value: string) => setAlternative(parseInt(value))}
            >
              {(
                question.alternatives as Array<{
                  content: string;
                  feedback: string;
                }>
              ).map((alternativeObj, alternativeIdx: number) => {
                const isSelected = alternative === alternativeIdx;

                return (
                  <div
                    key={alternativeIdx}
                    className={`flex flex-col space-y-2 p-3 sm:p-4 rounded-xl border transition-all ${getAlternativeStyle(alternativeIdx)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem
                        id={`question-${question.id}-${alternativeIdx}`}
                        value={String(alternativeIdx)}
                        className="mt-1"
                      />
                      <Label
                        htmlFor={`question-${question.id}-${alternativeIdx}`}
                        className={`font-medium cursor-pointer flex-1 leading-relaxed ${isSelected ? "opacity-100" : "opacity-90"}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-bold shrink-0">
                            {String.fromCharCode(65 + alternativeIdx)}.
                          </span>
                          <span className="prose prose-sm max-w-none w-full">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{ code: CodeBlock, p: "span" }}
                            >
                              {alternativeObj.content}
                            </ReactMarkdown>
                          </span>
                        </div>
                      </Label>
                    </div>
                    {answer && alternativeObj.feedback && (
                      <div className="pl-7 pr-2 pt-2">
                        <div className="mt-2 text-sm pt-2 border-t border-black/10">
                          {alternativeObj.feedback}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </RadioGroup>

            {answer === null && (
              <div className="mt-6">
                <ConfidenceLevel
                  questionId={question.id}
                  value={confidenceLevel}
                  disabled={answer !== null}
                  onChange={setConfidenceLevel}
                />

                <div className="mt-4">
                  {isLoading ? (
                    <Spinner>Enviando...</Spinner>
                  ) : (
                    <Button
                      variant="default"
                      disabled={
                        alternative === null || confidenceLevel === null
                      }
                      onClick={() => submitAnswer()}
                    >
                      Enviar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {answer && <QuestionFeedback question={question} answer={answer} />}
      </CardContent>
    </Card>
  );
}

function QuestionFeedback(props: { question: Question; answer: Answer }) {
  const { question, answer } = props;
  const [feedback, setFeedback] = useState<PrismaJson.QuestionFeedback>({
    flaggedIncorrect: answer.flaggedIncorrect,
    flaggedProblematic: answer.flaggedProblematic,
    flaggedExcellent: answer.flaggedExcellent,
    observation: answer.observation,
  });

  async function submitFeedback() {
    try {
      const response = await fetch(`/api/answers/${answer.id}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      const data = await response.json();
      toast.success("Feedback submitted successfully");
      console.log(
        "[QuestionCard] feedback de questao enviado com sucesso | questionId:",
        question.id,
      );
    } catch (error) {
      toast.error("Error submitting feedback:" + error);
    }
  }

  return (
    <div>
      <br />
      <details>
        <summary className="cursor-pointer text-blue-500">Feedback</summary>
        <div className="mt-2">
          <RadioGroup
            value={
              feedback.flaggedIncorrect
                ? "incorrect"
                : feedback.flaggedProblematic
                  ? "problems"
                  : feedback.flaggedExcellent
                    ? "excellent"
                    : undefined
            }
            onValueChange={(value) => {
              setFeedback((prev) => ({
                ...prev,
                flaggedIncorrect: value === "incorrect",
                flaggedProblematic: value === "problems",
                flaggedExcellent: value === "excellent",
              }));
            }}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="incorrect"
                id={`incorrect-${question.id}`}
              />
              <Label htmlFor={`incorrect-${question.id}`}>
                A questão está incorreta
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="problems" id={`problems-${question.id}`} />
              <Label htmlFor={`problems-${question.id}`}>
                A questão possui problemas
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="excellent"
                id={`excellent-${question.id}`}
              />
              <Label htmlFor={`excellent-${question.id}`}>
                A questão está excelente
              </Label>
            </div>
          </RadioGroup>
          <br />

          <Input
            type="text"
            onChange={(e) =>
              setFeedback((prev) => ({ ...prev, observation: e.target.value }))
            }
            value={feedback.observation}
            placeholder="Observações"
            className="mt-2"
          />
          <Button variant="default" className="mt-2" onClick={submitFeedback}>
            Enviar feedback
          </Button>
        </div>
      </details>
    </div>
  );
}
