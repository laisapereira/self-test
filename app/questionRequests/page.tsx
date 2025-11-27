'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSearchParams } from "next/navigation";
import { fetchRequests } from "./server";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import DateComponent from "@/components/date";
import QuestionRequestCreatePage from "./create/page";
import Pagination from "@/components/pagination";

import { useRouter } from 'next/navigation';
// apenas pra questao multipla escolha qnd temos discursiva agr tbm

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

const router = useRouter();
  
  useEffect(() => {
    async function fetchData() {
      const result = await fetchRequests({userId, page, pageSize: 6});
      setRequests(result.data); 
      
      setTotalPages(result.totalPages);
    
      setCurrentPage(result.currentPage);
         
    }

    fetchData();
  }, [userId, page]);

  
  const handleRowClick = (requestId: string, requestUserId: number) => {
    router.push(`/questions?questionRequestId=${requestId}&userId=${requestUserId}`);
  };
 

  return (
    <>


    
    <div className="w-full max-w-5xl mx-auto p-4 my-6"> 
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 text-center">Histórico de Perguntas Geradas</h1>
        
        {userId !== -1 ? (
          <a href="/questionRequests?userId=-1" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
            Ver as questões geradas de todos os usuários&rarr;
          </a>
        ) : (
          <a href="/questionRequests" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
            Ver minhas questões geradas &rarr;
          </a>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              
              <TableHead className="w-[100px]">Data de Geração</TableHead>
              
              {userId === -1 && <TableHead className="w-[150px]">Usuário</TableHead>}
              
             
              <TableHead className="text-center">Tema e Parâmetros</TableHead>
              
              {/* Score compacto */}
              <TableHead className="text-right">Desempenho</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {requests?.map((request: any) => {
             
               const score = getNumberOfCorrectAnswers(request.questions);
               const scoreColor = score.correct === score.total ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700";

               return (
                <TableRow 
                  key={request.id} 
                  
                  className="cursor-pointer hover:bg-blue-50/50 transition-colors group"
                  onClick={() => handleRowClick(request.id, request.userId)}
                >
                  {/* DATA: Simplificada */}
                  <TableCell className="align-top py-4">
                    <div className="text-sm font-medium text-slate-700">
                      {new Date(request.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </div>
                    <div className="text-xs text-slate-400 flex">
                     
                       Hora: {new Date(request.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' })}
                    </div>
                  </TableCell>

                  {/* USUÁRIO (Apenas se admin) */}
                  {userId === -1 && (
                    <TableCell className="align-top py-4">
                      <div className="font-medium text-sm">{request.user.name}</div>
                    </TableCell>
                  )}

                  
                  <TableCell className="align-top py-4 max-w-[400px]"> 
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {request.template?.name}
                      </span>
                      
                      
                      <span className="text-xs text-slate-500 truncate block w-full" title={getParameterString(request.parameterValues)}>
                        {getParameterString(request.parameterValues)}
                      </span>
                    </div>
                  </TableCell>

                  
                  <TableCell className="text-right align-top py-4">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${scoreColor}`}>
                        {score.correct} / {score.total} acertos
                     </span>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>      </Table>
      </div>
      <div className="mt-4">
        <Pagination totalPages={totalPages} currentPage={currentPage}/>
      </div>
    </div>

      </>
      
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

function getNumberOfCorrectAnswers(questions: PrismaJson.MultipleChoiceQuestion[] | PrismaJson.DiscursiveQuestion[]) {
  const total = questions.length;
  let correct = 0;
  let answered = 0;

  for (const question of questions) {
    // Questão de múltipla escolha
    if (question.type === "multiple-choice") {
      const answerIndex = question.answers[0]?.answerIndex;
      if (answerIndex !== undefined && answerIndex !== null) {
        answered++;
        if (answerIndex == question.correctAnswerIndex) {
          correct++;
          console.log(  'Resposta correta para questão de múltipla escolha:', question);
        }
      }
    }
    // Questão discursiva
    else if (question.type === "discursive") {
      const userAnswer = question.answers[0]?.content;
      const autoEvaluation = question.answers[0]?.autoEvaluation; 
      if (userAnswer && autoEvaluation) {
        answered++;
        console.log('Autoavaliação da resposta discursiva:', autoEvaluation);
        if (autoEvaluation.score >= 4) {
          correct++;
        }
      }
    }
  }

  return { total, correct, answered };
}
