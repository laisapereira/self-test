"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function JoinClassPage() {
  const params = useParams();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function join() {
      const res = await fetch(`/api/classes/join/${params.link}`, {
        method: "POST",
      });

      if (!res.ok) {
        setError("Turma não encontrada ou link inválido.");
        return;
      }

      const { classId } = await res.json();
      router.replace(`/classes/${classId}`);
    }

    join();
  }, [params.link]);

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
