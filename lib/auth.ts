import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      typeRole?: "STUDENT" | "PROFESSOR" | "ADMIN";
      isAdmin?: boolean;
      isProfessor?: boolean;
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
          typeRole: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({
      user,
    }: {
      user: {
        email?: string | null;
        name?: string | null;
        image?: string | null;
        typeRole?: "STUDENT" | "PROFESSOR" | "ADMIN";
      };
    }) {
      if (user.email) {
 
        const userCount = await prisma.user.count();
        const isFirstAdmin = userCount === 0;

        // Busca a turma de testers pelo nome configurado na env var
        const testerClass = process.env.TESTER_CLASS_NAME
          ? await prisma.class.findFirst({
              where: { name: process.env.TESTER_CLASS_NAME },
            })
          : null;

        console.log("[Auth] testerClass:", testerClass);

        await prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            role: isFirstAdmin ? "ADMIN" : "STUDENT",
            // Conecta à turma testers apenas se ela existir
            ...(testerClass && {
              studentClasses: { connect: { id: testerClass.id } },
            }),
          },
        });
        return true;
      }
      return false;
    },
    async session({ session, token }: { session: import("next-auth").Session; token: import("next-auth/jwt").JWT }) {
      if (token?.email && session.user) {
        const user = await prisma.user.findUnique({
          where: { email: token.email },
        });
        session.user.typeRole = user?.role;
        session.user.isAdmin = user?.role === "ADMIN";
        session.user.isProfessor = user?.role === "PROFESSOR";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
