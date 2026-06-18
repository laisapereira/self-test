import prisma from "@/lib/prisma";
import { getCurrentUser, isUserAdmin } from "@/lib/apiUtils";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!isUserAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [byType, byMonth, byClass, totals] = await Promise.all([
      prisma.llmUsage.groupBy({
        by: ["type"],
        _sum: { promptTokens: true, completionTokens: true },
        _count: { id: true },
        orderBy: { type: "asc" },
      }),

      prisma.$queryRaw<
        { month: string; type: string; promptTokens: number; completionTokens: number; count: number }[]
      >`
        SELECT
          to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
          type::text,
          SUM("promptTokens")::int     AS "promptTokens",
          SUM("completionTokens")::int AS "completionTokens",
          COUNT(*)::int                AS count
        FROM "LlmUsage"
        GROUP BY month, type
        ORDER BY month DESC, type ASC
      `,

      prisma.$queryRaw<
        { classId: number; className: string; promptTokens: number; completionTokens: number; count: number }[]
      >`
        SELECT
          c.id                          AS "classId",
          c.name                        AS "className",
          SUM(u."promptTokens")::int    AS "promptTokens",
          SUM(u."completionTokens")::int AS "completionTokens",
          COUNT(u.id)::int              AS count
        FROM "LlmUsage" u
        JOIN "Class" c ON c.id = u."classId"
        GROUP BY c.id, c.name
        ORDER BY SUM(u."promptTokens") + SUM(u."completionTokens") DESC
      `,

      prisma.llmUsage.aggregate({
        _sum: { promptTokens: true, completionTokens: true },
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      byType: byType.map((r) => ({
        type: r.type,
        promptTokens: r._sum.promptTokens ?? 0,
        completionTokens: r._sum.completionTokens ?? 0,
        count: r._count.id,
      })),
      byMonth,
      byClass,
      total: {
        promptTokens: totals._sum.promptTokens ?? 0,
        completionTokens: totals._sum.completionTokens ?? 0,
        count: totals._count.id,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
