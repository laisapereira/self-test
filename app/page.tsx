'use client';

import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import QuestionRequestCreatePage from "./questionRequests/create/page";
import Footer from "@/components/footer";
import Link from "next/link";

export default function Home() {

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] px-4">
      <h1 className="text-center text-xl">O SelfTest ajuda você a testar o que realmente sabe com questões personalizadas geradas por IA. Venha se testar!</h1>

      <QuestionRequestCreatePage />



    </div>
  );
}
