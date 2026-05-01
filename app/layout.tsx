"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Fragment, ReactNode, useState } from "react";
import { Menu, X } from "lucide-react";
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
          <Navbar />
          <main className="flex-1 p-4">{children}</main>

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
        </SessionProvider>
      </body>
    </html>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/selftest-logo.svg"
            alt="SelfTest Logo"
            width={160}
            height={80}
          />
        </Link>

        <div className="flex items-center gap-3">
          {status === "loading" ? null : session ? (
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden text-gray-800"
              aria-label="Toggle menu"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          ) : null}

          <ul className="hidden md:flex gap-4 text-gray-700 font-medium items-center">
            <MenuItems />
          </ul>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {session ? (
            <>
              <span className="text-sm text-gray-600">
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

      {open && session && (
        <ul className="md:hidden mt-2 space-y-1 text-gray-700 font-medium">
          <MenuItems onClick={() => setOpen(false)} />
          <li>
            <button
              onClick={() => {
                signOut();
                setOpen(false);
              }}
              className="w-full text-left block px-4 py-2 hover:bg-gray-100 rounded"
            >
              Sair
            </button>
          </li>
        </ul>
      )}
    </nav>
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
    <Fragment>
      {routes
        .filter((route) => !route.requireAdmin || isUserAdmin())
        .map((route, index) => (
          <li key={index}>
            <Link
              href={route.href}
              onClick={onClick}
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              {route.title}
            </Link>
          </li>
        ))}
    </Fragment>
  );
}
