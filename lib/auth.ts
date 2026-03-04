import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from '@/lib/prisma';
import fs from 'fs';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            if (user.email) {
                console.log('User:', user.email, user.name, user.image);
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
        async session({ session, token }) {
            if (token && token.email) {
                const user = await prisma.user.findUnique({ where: { email: token.email } });
                if (session.user) {
                    session.user.isAdmin = user?.admin || false;
                }
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
