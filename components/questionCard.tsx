import { Answer, Question } from "../prisma";
import { PrismaJson } from "@/prisma/types";
import { Label } from "@radix-ui/react-label";
import { marked } from "marked";
import { useEffect, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { ConfidenceLevel } from "./confidenceLevel";

export function QuestionCard(props: { question: Question, userId?: number, withAnswer?: Answer }) {
  const { question } = props;
  const [alternative, setAlternative] = useState<number | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(props.withAnswer ?? null);
  const [discursiveAnswer, setDiscursiveAnswer] = useState<string>(""); 

  useEffect(() => {
    const searchParams = new URLSearchParams();
    if (props.userId) {
      searchParams.append("userId", props.userId.toString());
    }
    // searchParams.append("userId", userId ? userId.toString() : currentUser.id.toString());

    const fetchAnswer = async () => {
      const response = await fetch(`/api/questions/${question.id}/answers?${searchParams.toString()}`);
      if (response.status === 404) {
        return;
      }
      const answer = await response.json();
      setAnswer(answer);
    };

    fetchAnswer();
  }, []);

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

    try {
      const response = await fetch(`/api/questions/${question.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerIndex: alternative, confidenceLevel }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit answer");
      }

      const data = await response.json();
      setAnswer(data);
      console.log("Answer submitted successfully", data);
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  }

  async function submitDiscursiveAnswer() {
    console.log("Ainda em construção")
  }

  function getAnswerClassName(alternativeIdx: number) {
    if (answer === null) return '';
    if (alternativeIdx === question.correctAnswerIndex) {
      return 'text-green-700';
    } else {
      return 'text-red-700';
    }
  }

  return (
  <Card className="w-full">
    <CardHeader>
      <h1 className="text-2xl font-bold">Question</h1>
      {answer && (
        <div>
          <p className={answer?.answerIndex !== null && answer?.answerIndex !== undefined ? getAnswerClassName(answer.answerIndex) : ''}>
            Your answer is {answer?.correct ? 'correct' : 'incorrect'}! (Confidence level: {answer?.confidenceLevel})
          </p>
        </div>
      )}
    </CardHeader>

    <CardContent>
      <p
        className="text-gray-500"
        dangerouslySetInnerHTML={{ __html: marked.parse(question.content) }}
      />
      <br />

      {question.type === 'discursive' ? (
        answer === null ? (
          <div>
            <textarea
              className="w-full border rounded p-2"
              rows={5}
              value={discursiveAnswer}
              onChange={(e) => setDiscursiveAnswer(e.target.value)}
              placeholder="Digite sua resposta aqui..."
              disabled={answer !== null}
            />

            
            <ConfidenceLevel
              questionId={question.id}
              value={confidenceLevel}
              disabled={answer !== null}
              onChange={setConfidenceLevel}
            />

            <br />
            <Button
              variant="default"
              disabled={!discursiveAnswer.trim() || confidenceLevel === null}
              onClick={submitDiscursiveAnswer}
            >
              Enviar resposta
            </Button>
          </div>
        ) : (
          <div>
            <p className="mt-2">
              <b>Sua resposta:</b> {answer?.openAnswer}
            </p>
          </div>
        )
      ) : (
        <>
          <RadioGroup
            disabled={answer !== null}
            className="flex flex-col space-y-2"
            value={alternative !== null ? String(alternative) : undefined}
            onValueChange={(value: string) => setAlternative(parseInt(value))}
          >
            {question.alternatives.map(
              (alternativeObj: { content: string; feedback: string }, alternativeIdx: number) => (
                <div className="flex flex-col space-y-1" key={alternativeIdx}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      id={`question-${question.id}-${alternativeIdx}`}
                      value={String(alternativeIdx)}
                    />
                    <Label
                      htmlFor={`question-${question.id}-${alternativeIdx}`}
                      className="ml-2"
                    >
                      {answer &&
                        (alternativeIdx === question.correctAnswerIndex ? (
                          <span className={getAnswerClassName(alternativeIdx)}>✓ </span>
                        ) : (
                          <span className={getAnswerClassName(alternativeIdx)}>✗ </span>
                        ))}
                      <span className="font-bold">{String.fromCharCode(65 + alternativeIdx)}. </span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: marked.parseInline(alternativeObj.content),
                        }}
                      />
                    </Label>
                  </div>
                  {answer && (
                    <p className={getAnswerClassName(alternativeIdx)}>
                      {question.alternatives[alternativeIdx].feedback}
                    </p>
                  )}
                </div>
              )
            )}
          </RadioGroup>

          {answer === null && (
            <>
              
              <ConfidenceLevel
                questionId={question.id}
                value={confidenceLevel}
                disabled={answer !== null}
                onChange={setConfidenceLevel}
              />

              <br />
              <Button
                variant="default"
                disabled={alternative === null || confidenceLevel === null}
                onClick={() => submitAnswer()}
              >
                Submit
              </Button>
            </>
          )}
        </>
      )}


      {answer && <QuestionFeedback question={question} answer={answer} />}
    </CardContent>
  </Card>
);
}

function QuestionFeedback(props: { question: Question, answer: Answer }) {
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
      console.log("Feedback submitted successfully", data);
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
          <Checkbox
            id={`incorrect-${question.id}`}
            checked={feedback.flaggedIncorrect}
            onCheckedChange={(checked) => { setFeedback(prev => ({ ...prev, flaggedIncorrect: Boolean(checked) })) }} />
          <Label htmlFor={`incorrect-${question.id}`} className="ml-2">A questão está incorreta</Label>
          <br />
          <Checkbox
            id={`problems-${question.id}`}
            checked={feedback.flaggedProblematic}
            onCheckedChange={(checked) => { setFeedback(prev => ({ ...prev, flaggedProblematic: Boolean(checked) })) }} />
          <Label htmlFor={`problems-${question.id}`} className="ml-2">A questão possui problemas</Label>
          <br />
          <Checkbox
            id={`excellent-${question.id}`}
            checked={feedback.flaggedExcellent}
            onCheckedChange={(checked) => { setFeedback(prev => ({ ...prev, flaggedExcellent: Boolean(checked) })) }} />
          <Label htmlFor={`excellent-${question.id}`} className="ml-2">A questão está excelente</Label>
          <br />
          <Input
            type="text"
            onChange={(e) => setFeedback(prev => ({ ...prev, observation: e.target.value }))}
            value={feedback.observation}
            placeholder="Observações"
            className="mt-2" />
          <Button
            variant="default"
            className="mt-2"
            onClick={submitFeedback}>
            Enviar feedback
          </Button>
        </div>
      </details>
    </div>
  )
}