'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
interface ForbiddenProps {
    message?: string;
    redirectTo?: string;
    redirectDelay?: number; // segundos
}
export default function Forbidden({
    message = "Você não tem permissão para acessar esta página ;(",
    redirectTo = "/",
    redirectDelay = 3,
}: ForbiddenProps) {
    const router = useRouter();
    const [countdown, setCountdown] = useState(redirectDelay);
    useEffect(() => {
        if (countdown === 0) { router.push(redirectTo); return; }
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, router, redirectTo]);
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <span className="text-6xl">🚫</span>
            <h1 className="text-3xl font-bold text-slate-800">Acesso Negado</h1>
            <p className="text-slate-500 text-center max-w-md">{message}</p>
            <p className="text-sm text-slate-400">
                Redirecionando em <span className="font-bold text-slate-700">{countdown}</span>...
            </p>
        </div>
    );
}