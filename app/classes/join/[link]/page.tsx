"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function JoinClassPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    // Redireciona para login mantendo o link de destino como callbackUrl
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=/classes/join/${params.link}`);
      return;
    }

    async function join() {
      const res = await fetch(`/api/classes/join/${params.link}`, {
        method: "POST",
      });

      if (!res.ok) {
        setError("Turma não encontrada ou link inválido.");
        return;
      }

      const { classId } = await res.json();
      router.replace(`/?classId=${classId}`);
    }

    join();
  }, [params.link, status]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 text-center text-slate-500 text-sm">
      Entrando na turma...
    </div>
  );
}
