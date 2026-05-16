"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Fragment, ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/ui/sidebar";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import Footer from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

// export const metadata = {
//   title: 'My App',
//   description: 'Responsive menu example in Next.js 15',
// }

const routes = [
  {
    title: "Gerar Questões",
    href: "/",
  },
  {
    title: "Templates de Questões",
    href: "/templates",
    requireAdmin: true,
  },
  {
    title: "Templates de Avaliação",
    href: "/templates/evaluation",
    requireAdmin: true,
  },

  {
    title: "Questões Geradas",
    href: "/questionRequests",
  },

  {
    title: "Usuários",
    href: "/admin/users",
    requireAdmin: true,
  },
  {
    title: "Dashboard",
    href: "/dashboard",
  },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/selftest-logo.svg" />
        <title>SelfTest</title>
        <meta
          name="description"
          content="O SelfTest permite estudantes de computação testarem seus conhecimentos utilizando perguntas personalizadas geradas por IA. Venha se testar!"
        />
        <link rel="apple-touch-icon" href="/selftest-logo.svg" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        className={`${inter.className} min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
        <SessionProvider>
          <LayoutContent>{children}</LayoutContent>
        </SessionProvider>
      </body>
    </html>
  );
}

function LayoutContent({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const hasSession = status !== "loading" && !!session;

  return (
    <>
      <Navbar />
      {hasSession ? (
        <div className="flex-1 lg:flex lg:min-h-[calc(100vh-64px)]">
          <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-gray-200 bg-white">
            <div className="px-6 py-6">
              <span className="text-base font-semibold text-gray-900">
                Navegação
              </span>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 pb-6">
              <ul className="space-y-1 text-sm font-medium text-gray-700">
                <MenuItems />
              </ul>
            </nav>
            <div className="border-t border-gray-200 px-6 py-4">
              <UserPanel />
            </div>
          </aside>
          <main className="flex-1 p-4">{children}</main>
        </div>
      ) : (
        <main className="flex-1 p-4">{children}</main>
      )}

      <div className="px-4">
        <Link
          href="https://forms.gle/BLVawYyYqAWBM1Vd8"
          target="_blank"
          className="mb-4 block text-center text-xl text-blue-600 hover:underline"
        >
          O que você tem achado do SelfTest? Avalie aqui!
        </Link>
      </div>

      <Footer />
      <Toaster />
    </>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center shrink-0">
              <Image
                src="/selftest-logo.svg"
                alt="SelfTest Logo"
                width={180}
                height={90}
                className="h-12 w-auto sm:h-14"
              />
            </Link>
            {status !== "loading" && session ? (
              <button
                onClick={() => setOpen(!open)}
                className="lg:hidden text-gray-800"
                aria-label="Abrir painel de navegação"
              >
                <Menu className="w-6 h-6" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <>
                <span className="hidden sm:inline-block text-sm text-gray-600 truncate max-w-[180px]">
                  {session.user?.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Sair
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </nav>
      {status !== "loading" && session ? (
        <Sidebar
          isOpen={open}
          toggle={() => setOpen(false)}
          items={routes
            .filter((route) => !route.requireAdmin || session.user?.isAdmin)
            .map((route) => ({ href: route.href, title: route.title }))}
        />
      ) : null}
    </>
  );
}

function MenuItems(props: { onClick?: () => void }) {
  const { onClick } = props;
  const { data: session } = useSession();
  const isUserAdmin = () => {
    if (!session || !session.user) return false;
    return session.user.isAdmin === true;
  };

  if (!session) {
    return <></>;
  }

  return (
    <>
      {routes
        .filter((route) => !route.requireAdmin || isUserAdmin())
        .map((route, index) => (
          <li key={index}>
            <Link
              href={route.href}
              onClick={onClick}
              className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
            >
              {route.title}
            </Link>
          </li>
        ))}
    </>
  );
}

function UserPanel() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="text-sm text-gray-500">Carregando...</div>;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Entrar
      </button>
    );
  }

  return (
    <div className="space-y-2 text-sm text-gray-700">
      <div className="truncate font-medium">{session.user?.email}</div>
      <button
        onClick={() => signOut()}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        Sair
      </button>
    </div>
  );
}
