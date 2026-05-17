import axios from "axios";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = await req.nextUrl;
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  try {
    const response = await axios.get(
      `https://api-hari-libur.vercel.app/api`, {
      params: {
        year,
        month
      }
    }
    );

    return Response.json(response.data?.data || []);
  } catch {
    return Response.json([]);
  }
}
