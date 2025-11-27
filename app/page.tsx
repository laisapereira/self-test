'use client';

import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import QuestionRequestCreatePage from "./questionRequests/create/page";

export default function Home() {
  // const { data: session, status } = useSession();
  // const router = useRouter();
  // const [isMounted, setIsMounted] = useState(false);

  // useEffect(() => {
  //   setIsMounted(true);
  // }, []);

  // useEffect(() => {
  //   if (isMounted) {
  //     if (status === "authenticated") {
  //       router.push("/profile");
  //     } else if (status === "unauthenticated") {
  //       signIn("google");
  //     }
  //   }
  // }, [isMounted, status, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen px-4">
      <h1 className="text-center text-xl">O SelfTest ajuda você a testar o que realmente sabe com questões personalizadas geradas por IA.</h1>

      <QuestionRequestCreatePage />
    </div>
  );
}
