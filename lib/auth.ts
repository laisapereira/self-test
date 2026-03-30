import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from '@/lib/prisma';

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
    };
  }
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user }: { user: { email?: string | null; name?: string | null; image?: string | null } }) {
      if (user.email /*user.email?.endsWith("@ufba.br")*/) {
        console.log("[Auth] usuario sendo upsertado | email:", user.email);
        const userCount = await prisma.user.count();
        const isAdmin = userCount === 0;
        await prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            admin: isAdmin,
          },
        });
        return true;
      }
      return false;
    },
    async session({ session, token }: { session: any; token: any }) {
      const fs = require('fs');
      fs.appendFileSync('nextauth_debug.log', JSON.stringify({ event: 'session', token, session }) + '\\n');
      if (token && token.email) {
        const user = await prisma.user.findUnique({ where: { email: token.email } });
        fs.appendFileSync('nextauth_debug.log', JSON.stringify({ event: 'user_fetched', user }) + '\\n');
        session.user.isAdmin = user?.admin || false;
        fs.appendFileSync('nextauth_debug.log', JSON.stringify({ event: 'session_modified', session }) + '\\n');
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
