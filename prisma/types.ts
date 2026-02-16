import { AutoEvaluation } from "#main-entry-point";

export namespace PrismaJson {
  export type TopicParameters = {
    name: string;
    values: string[];
    multipleSelect: boolean;
  };

  export type QuestionRequestParameterValue = {
    name: string;
    values: string[];
  };

  type BaseQuestion = {
    content: string;
    type: "discursive" | "multiple-choice";

  }

  export type DiscursiveQuestion = BaseQuestion & {
    evaluationCriteria: string[];
  };

  export type DiscursiveQuestionResponse = BaseQuestion & {
    type: "discursive";
    questions: DiscursiveQuestion[];
  }

  export type MultipleChoiceQuestionResponse = BaseQuestion & {
    questions: MultipleChoiceQuestion[];
  }

  export type MultipleChoiceQuestion = BaseQuestion & {
    type: "multiple-choice";
    correctAnswerIndex: number;
    alternatives: MultipleChoiceQuestionAlternative[];
  }

  export type MultipleChoiceQuestionAlternative = {
    content: string;
    feedback: string;
  };

  export type QuestionFeedback = {
    flaggedIncorrect: boolean;
    flaggedProblematic: boolean;
    flaggedExcellent: boolean;
    observation: string;
  }

}

export interface QuestionRequest {
  id: number;
  userId: number;
  templateId: number;
  createdAt: Date;
  parameterValues: any[];

  user: { id: number; name: string | null };
  template: { id: number; name: string } | null;

  questions: {
    id: number;
    content: string;
    type: "multiple-choice" | "discursive" | string;
    correctAnswerIndex: number | null;


    alternatives: { content: string; feedback: string }[] | null;

    evaluationCriteria?: string[];
    referenceAnswer?: string;

    answers: {
      id: number;
      answerIndex: number | null;
      confidenceLevel: number;
      correct: boolean;
      content?: string;

      autoEvaluation?: {
        score: number;
        justification: string;
        modelVersion?: string;
        evaluatedAt: string;
        criteria: { description: string; weight: number; score: number }[];
      } | null;
    }[];
  }[];
}
