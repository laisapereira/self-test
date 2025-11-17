'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSearchParams } from "next/navigation";
import { fetchRequests } from "./server";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Date from "@/components/date";
import QuestionRequestCreatePage from "./create/page";
import Pagination from "@/components/pagination";


export interface QuestionRequest {
  id: number;
  userId: number;
  templateId: number;
  createdAt: Date;
  parameterValues: any[]

  user: {
    id: number;
    name: string | null;
  };

  template: {
    id: number;
    name: string;
  } | null;

  questions: {
    id: number;
    correctAnswerIndex: number | null;
    answers: {
      id: number;
      answerIndex: number | null;
      confidenceLevel: number;
      correct: boolean;
    }[];
  }[];
}


export default function QuestionRequestsPage() {
  return <Suspense>
    <QuestionRequestsPageInner />
  </Suspense>
}

function QuestionRequestsPageInner() {
  const [requests, setRequests] = useState<QuestionRequest[] | null>(null);
  const searchParams = useSearchParams();
  const userIdStr = searchParams?.get("userId") || null;
  const userId = userIdStr === null || userIdStr == '' ? undefined : parseInt(userIdStr, 10);
  const pageStr = searchParams?.get("page")
  const page = pageStr? parseInt(pageStr, 10) : 1
  const [totalPages, setTotalPages] = useState(1);
const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
    async function fetchData() {
      const result = await fetchRequests({userId, page, pageSize: 10});
      setRequests(result.data); 
      
      setTotalPages(result.totalPages);
    
      setCurrentPage(result.currentPage);
         
    }

    fetchData();
  }, [userId, page]);

  
 

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>
        <QuestionRequestCreatePage />

        {userId !== -1 ? <>
          <a href="/questionRequests?userId=-1" className="text-blue-500 hover:underline">
            View recent requests from all users
          </a>
          <br />
        </>
          :
          <>
            <a href="/questionRequests" className="text-blue-500 hover:underline">
              View your requests
            </a>
            <br />
          </>
        }

        <h1>Question Requests</h1>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">Creation</TableHead>
              {userId === -1 && <TableHead className="text-left">User</TableHead>}
              <TableHead className="text-left">Template</TableHead>
              <TableHead className="text-left">Parameters</TableHead>
              <TableHead className="text-left">Correct</TableHead>
              <TableHead className="text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests?.map((request: any) => (
              <TableRow key={request.id}>
                <TableCell><Date date={request.createdAt} /></TableCell>
                {
                  userId === -1 &&
                  <TableCell>
                    <Link href={`/questionRequests?userId=${request.userId}`} className="text-blue-500 hover:underline">
                      {request.user.name}
                    </Link>
                  </TableCell>
                }
                <TableCell>{request.template?.name}</TableCell>
                <TableCell>{getParameterString(request.parameterValues)}</TableCell>
                <TableCell>
                  {
                    (() => {
                      const data = getNumberOfCorrectAnswers(request.questions);
                      return <span>
                        <span title="Correct" style={{ cursor: 'pointer', color: 'green', fontWeight: 'bold' }}>{data.correct}</span>&nbsp;
                        <span title="Answered" style={{ cursor: 'pointer', color: 'blue' }}>{data.answered}</span>&nbsp;
                        <span title="Total" style={{ cursor: 'pointer' }}>{data.total}</span>
                      </span>;
                    })()
                  }
                </TableCell>
                <TableCell>
                  <Link href={`/questions?questionRequestId=${request.id}&userId=${request.userId}`} className="text-blue-500 hover:underline">
                    View Questions
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

            <Pagination totalPages={totalPages} currentPage={currentPage}/>

      </div>

            
      
    </Suspense>
  );
}

function getParameterString(parameterValues: any) {
  if (parameterValues.length === 0) {
    return "No parameters";
  }
  return parameterValues.map((param: any) => {
    if (param.values.length > 0) {
      return `${param.name}: ${param.values.join(", ")}`;
    } else {
      return `${param.name}: No values`;
    }
  }).join(", ");
}

function getNumberOfCorrectAnswers(questions: any) {
  const total = questions.length;
  let correct = 0;
  let answered = 0;

  for (const question of questions) {
    // Questão de múltipla escolha
    if (question.correctAnswerIndex !== null && question.correctAnswerIndex !== undefined) {
      const answerIndex = question.answers[0]?.answerIndex;
      if (answerIndex !== undefined && answerIndex !== null) {
        answered++;
        if (answerIndex == question.correctAnswerIndex) {
          correct++;
        }
      }
    }
    // Questão discursiva
    else {
      const userAnswer = question.answers[0]?.content;
      const autoEvaluation = question.answers[0]?.autoEvaluation; // supondo que você salva a avaliação automática aqui
      if (userAnswer && autoEvaluation) {
        answered++;
        // Considere "correta" se a nota de corretude for >= 4, por exemplo
        if (autoEvaluation.corretude >= 4) {
          correct++;
        }
      }
    }
  }

  return { total, correct, answered };
}
