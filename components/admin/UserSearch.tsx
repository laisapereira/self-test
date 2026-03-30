"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface UserSearchProps {
  initialQuery: string;
  placeholder?: string;
  debounceMs?: number;
}

export function UserSearch({
  initialQuery,
  placeholder = "Buscar por nome ou email",
  debounceMs = 400,
}: UserSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  const paramsString = useMemo(
    () => searchParams?.toString() || "",
    [searchParams],
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(paramsString);
      const trimmed = value.trim();

      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }

      params.set("page", "1");
      const queryString = params.toString();
      router.push(`/admin/users${queryString ? `?${queryString}` : ""}`);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [value, debounceMs, paramsString, router]);

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={placeholder}
      className="w-64 rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
