import { NextRequest } from 'next/server';

const API_BASE = 'https://api-hari-libur.vercel.app/api';

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
    const json = await response.json();

    const rawData = Array.isArray(json) ? json : (json?.data ?? []);
    const filteredData = rawData.filter(
      (item: { description: string }) => !item.description.startsWith('Cuti Bersama')
    );

    return Response.json(filteredData);
  } catch {
    return Response.json([]);
  }
}
