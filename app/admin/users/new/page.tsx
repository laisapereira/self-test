"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NewUserForm, NewUserFormValues } from "@/components/users/NewUserForm";

async function createUser(data: NewUserFormValues) {
  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "Falha ao criar usuário");
  }

  return response.json();
}

export default function NewAdminUserPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: NewUserFormValues) {
    setError(null);

    try {
      await createUser(formData);
      toast.success("Admin criado com sucesso.");
      router.push("/admin/users");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Criar novo usuário
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Insira os dados do usuário e confirme a criação.
        </p>
        {error && (
          <p className="mb-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <NewUserForm onSubmit={handleSubmit} defaultRole="ADMIN" />
        <p className="mt-4 text-xs text-slate-500">
          Observação: este projeto usa login via Google; o usuário também poderá entrar com e-mail e senha.
        </p>
      </div>
    </div>
  );
}
