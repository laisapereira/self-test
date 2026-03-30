"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["USER", "ADMIN"]),
});

export type NewUserFormValues = z.infer<typeof createUserSchema>;

interface NewUserFormProps {
  onSubmit: (data: NewUserFormValues) => void | Promise<void>;
  defaultRole?: "USER" | "ADMIN";
}

export function NewUserForm({
  onSubmit,
  defaultRole = "USER",
}: NewUserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: defaultRole },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Nome
        </label>
        <input
          {...register("name")}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.name && (
          <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          E-mail
        </label>
        <input
          {...register("email")}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.email && (
          <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Senha
        </label>
        <input
          type="password"
          {...register("password")}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.password && (
          <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Perfil
        </label>
        <select
          {...register("role")}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Enviando..." : "Criar usuário"}
      </button>
    </form>
  );
}
