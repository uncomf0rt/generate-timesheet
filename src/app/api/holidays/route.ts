import { NextRequest } from 'next/server';

const API_BASE = 'https://libur.deno.dev/api';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const year = searchParams.get('year') || '';
  const month = searchParams.get('month') || '';

  try {
    const params = new URLSearchParams();
    if (year) params.set('year', year);
    if (month) params.set('month', month);

    const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();

    return Response.json(data);
  } catch {
    return Response.json([]);
  }
}
