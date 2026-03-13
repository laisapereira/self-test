'use client';

import './globals.css'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { Fragment, ReactNode, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { SessionProvider, signIn, signOut, useSession } from 'next-auth/react';
import { Toaster } from '@/components/ui/sonner';
import Footer from '@/components/footer';

const inter = Inter({ subsets: ['latin'] })

// export const metadata = {
//   title: 'My App',
//   description: 'Responsive menu example in Next.js 15',
// }

const routes = [


  {
    title: 'Gerar Questões',
    href: '/',
  },
  {
    title: 'Templates de Questões',
    href: '/templates',
    requireAdmin: true,
  },

  {
    title: 'Questões Geradas',
    href: '/questionRequests',
  },

  {
    title: 'Usuários',
    href: '/users',
    requireAdmin: true,
  },
  {
    title: 'Dashboard',
    href: '/dashboard',
  },


]

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.png" />
        <title>SelfTest</title>
        <meta name="description" content="O SelfTest permite estudantes de computação testarem seus conhecimentos utilizando perguntas personalizadas geradas por IA. Venha se testar!" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          <Navbar />
          <main className="p-4">
            {children}

          </main>

          <Link href="https://forms.gle/BLVawYyYqAWBM1Vd8" target="_blank" className="mt-4 text-xl text-blue-600 hover:underline text-center flex justify-center">
            O que você tem achado do SelfTest? Avalie aqui!
          </Link>
          <Footer />
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}

function Navbar() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()

  return (
    <nav className="bg-white shadow-md px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">

        <Link href="/"> <Image src="/logo.png" alt="SelfTest Logo" width={200} height={150} /></Link>

        {session && (
          <button
            className="md:hidden text-gray-800"
            onClick={() => setOpen(!open)}
            aria-label="Toggle Menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        )}

        <ul className="hidden md:flex gap-6 text-gray-700 font-medium items-center">
          <MenuItems />
        </ul>

        {!session && (
          <ul className="flex md:hidden gap-6 text-gray-700 font-medium items-center">
            <MenuItems />
          </ul>
        )}
      </div>
      {open && session && (
        <ul className="md:hidden mt-2 space-y-2 text-gray-700 font-medium pb-2">
          <MenuItems onClick={() => setOpen(false)} />
        </ul>
      )}
    </nav>
  )
}

function MenuItems(props: { onClick?: () => void }) {
  const { onClick } = props;
  const { data: session } = useSession();
  const isUserAdmin = () => {
    if (!session || !session.user) return false;
    return session.user.isAdmin === true;
  }

  return session ? (
    <Fragment>
      {routes
        .filter((route => !route.requireAdmin || isUserAdmin()))
        .map((route, index) =>
        (
          <Link key={index} href={route.href} onClick={onClick} className="block px-4 py-2 hover:bg-gray-100">
            {route.title}
          </Link>))}
      <Link href='/api/auth/signout' className="block px-4 py-2 hover:bg-gray-100">{session.user?.email}</Link>
    </Fragment>) : (
    <Link href='/login' >Login</Link>
  );

}
