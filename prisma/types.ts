import { AutoEvaluation } from "#main-entry-point";

export namespace PrismaJson {
  export type QuestionRequestTemplateParameter = {
    name: string;
    values: string[];
    multipleSelect: boolean;
  };

  export type QuestionRequestParameterValue = {
    name: string;
    values: string[];
  };

type BaseQuestion = { content: string; }

 export type DiscursiveQuestion =  BaseQuestion & {
  type: "discursive";
  evaluationCriteria: string[];
};
  
export type DiscursiveQuestionResponse = BaseQuestion & {
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
