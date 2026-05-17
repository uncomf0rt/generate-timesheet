import axios from "axios";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/holidays/[...slug]'>) {
  const { slug } = await ctx.params;
  const [year, month] = slug as string[];

  try {
    const response = await axios.get(
      `https://api-hari-libur.vercel.app/api?year=${year}&month=${month}`  
    );

    return Response.json(response.data?.data || []);
  } catch {
    return Response.json([]);
  }
}
