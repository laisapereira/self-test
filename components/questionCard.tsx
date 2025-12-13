import { Answer, AutoEvaluation, Question } from "../prisma";
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
import { set } from "date-fns";
import { Spinner } from "./spinner";


export type EvaluationCriteria = {
  description: string,
  weight: number;
}


type CriterionScore = {
  description: string;
  weight: number;
  score: number;
};

export function QuestionCard(props: { question: Question, userId?: number, withAnswer?: Answer, withEvaluation?: AutoEvaluation }) {
  const { question } = props;
  const [alternative, setAlternative] = useState<number | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(props.withAnswer ?? null);
  const [discursiveAnswer, setDiscursiveAnswer] = useState<string>(""); 
  const [feedbackLLM, setFeedbackLLM] = useState<AutoEvaluation | null>(props.withEvaluation ?? null)
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
        const response = await fetch(`/api/questions/${question.id}/answers/discursiveAnswers?${searchParams.toString()}`)
        
         if (response.status === 404) return;

        const { answer, feedbackLLM, criteriaScores} = await response.json()

        console.log("criterios", criteriaScores)
        
        setAnswer(answer);
        setCriteriaScores(criteriaScores ?? [])
        
        setFeedbackLLM(feedbackLLM ?? null)
        console.log("feedback", feedbackLLM)
      } catch (error) {
        console.log("o erro", error)
      }
  
    
    }

    const fetchAnswer = async () => {
      
      const response = await fetch(`/api/questions/${question.id}/answers?${searchParams.toString()}`);

      if (response.status === 404) return;
    
      const answer = await response.json();
      console.log("a resposta", answer)
      setAnswer(answer);

      
    };

    fetchAnswer();

    question.type === 'multiple-choice' ? fetchAnswer() : fetchDiscursiveAnswer()

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
         console.error("Erro ao enviar resposta discursiva:", response.status, text);
         throw new Error("Failed to submit discursive answer");
      }

      const data = await response.json();
      setAnswer(data);
      console.log("Answer submitted successfully", data);
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally{
      setIsLoading(false);
    }
  }

  async function submitDiscursiveAnswer(evaluationCriteria: EvaluationCriteria[] = []) {
    if (!discursiveAnswer.trim() || confidenceLevel === null) return;

    setIsLoading(true);

    console.log("resposta", discursiveAnswer)
    

    try {
      const response = await fetch(`/api/questions/${question.id}/answers/discursiveAnswers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openAnswer: discursiveAnswer, confidenceLevel, evaluationCriteria }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("Erro ao enviar resposta discursiva:", response.status, text);
        throw new Error("Failed to submit discursive answer");
    }
      const {answer, feedbackLLM, criteriaScores} = await response.json();
      console.log("resposta", answer, feedbackLLM)
      console.log("feedback", feedbackLLM)
      console.log("criterios", criteriaScores)
    
      setAnswer(answer);
      setFeedbackLLM(feedbackLLM)
      console.log("o feedbck", feedbackLLM)
      setCriteriaScores(criteriaScores); 
      //console.log("Discursive answer submitted successfully",);

      console.log("notas", criteriaScores)
    } catch (error) {
      console.error("Error submitting discursive answer:", error);
    } finally {
      setIsLoading(false);
    }
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
            Sua resposta está {answer?.correct ? 'correta' : 'incorreta'}! ( e seu nível de confiança para responder foi: {answer?.confidenceLevel})
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

            { isLoading
            
            ? ( <Spinner>
                Enviando a resposta...
            </Spinner>
            ) : (    
            
            <Button
              variant="default"
              disabled={!discursiveAnswer.trim() || confidenceLevel === null}
              onClick={() => submitDiscursiveAnswer(question.evaluationCriteria as EvaluationCriteria[])}
            >
              Enviar resposta
            </Button>

            )}
          </div>
        ) : (
          <div>
            <p className="mt-2">
              <b>Sua resposta:</b> {answer?.openAnswer}
            </p>


            {criteriaScores && (
              <table className="mt-4 w-full border text-sm">
                <thead>
                  <tr>
                    <th className="border px-2 py-1 text-left">Critério</th>
                    <th className="border px-2 py-1 text-center">Peso</th>
                    <th className="border px-2 py-1 text-center">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {criteriaScores.map((c, index) => (
                    <tr key={index}>
                      <td className="border px-2 py-1">{c.description}</td>
                      <td className="border px-2 py-1 text-center">{c.weight}</td>
                      <td className="border px-2 py-1 text-center">{c.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

        

          {feedbackLLM && (
            <div className="mt-2 border-t pt-2">
              <p className="text-center"><b>Feedback pelo LLM</b></p>
              <p><b>Nota:</b> {feedbackLLM.score}</p>
              <p><b>Justificativa do feedback</b> {feedbackLLM.justification}</p>
            </div>
          )}
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
            {(question.alternatives as Array<{ content: string; feedback: string }>).map(
              (alternativeObj, alternativeIdx: number) => (
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
                      {(question.alternatives[alternativeIdx] as { content: string; feedback: string })?.feedback}
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

              { isLoading 
              ? ( <Spinner>
                Enviando a resposta...
              </Spinner>
              ): ( <Button
                variant="default"
                disabled={alternative === null || confidenceLevel === null}
                onClick={() => submitAnswer()}
              >
                Enviar
              </Button>

              )}
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