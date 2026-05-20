import axios from 'axios';
import { NextRequest } from 'next/server';
import { ADOProject } from '@/lib/types';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const { searchParams } = new URL(req.url);
  const org = searchParams.get('org');

  if (!authHeader?.startsWith('Basic ')) {
    return Response.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
  }

  if (!org) {
    return Response.json({ error: 'Missing org parameter' }, { status: 400 });
  }

  try {
    const res = await axios.get(`https://dev.azure.com/${org}/_apis/projects?api-version=7.1`, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      params: {
        $orderBy: 'name asc',
      },
    });

    const projects: ADOProject[] = res.data.value.map((project: any) => ({
      id: project.id,
      name: project.name,
    }));

    return Response.json({ projects });
  } catch (error: any) {
    console.error('Failed to fetch projects:', error.response?.data || error.message);
    return Response.json(
      { error: 'Failed to fetch projects', details: error.response?.data || error.message },
      { status: error.response?.status || 500 }
    );
  }
}
