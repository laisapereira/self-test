'use client';

import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import QuestionRequestCreatePage from "./questionRequests/create/page";
import Footer from "@/components/footer";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8">
      {!session && (
        <h1 className="text-center text-xl mb-8 max-w-2xl">
          O SelfTest ajuda você a testar seu conhecimento em computação com questões personalizadas geradas por IA. Venha se testar!
        </h1>
      )}

      {status === "authenticated" ? (
        <QuestionRequestCreatePage />
      ) : status === "unauthenticated" ? (
        <button onClick={() => signIn("google")} className="bg-blue-600 text-white px-8 py-3 rounded-md text-[1.5rem] font-medium shadow hover:bg-blue-700 transition">
          Entrar e Gerar Questões
        </button>
      ) : null}

    </div>
  );
}
