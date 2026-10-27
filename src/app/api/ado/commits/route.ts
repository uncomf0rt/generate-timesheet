import axios from 'axios';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { organization, project, pat, repoId, searchCriteria } = await req.json();

  const { fromDate, toDate } = searchCriteria;
  const authors: string[] = Array.isArray(searchCriteria.authors)
    ? searchCriteria.authors
    : searchCriteria.author
      ? [searchCriteria.author]
      : [];

  if (authors.length === 0) {
    return Response.json({ commits: [] });
  }

  const token = Buffer.from(`:${pat}`).toString('base64');
  const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repoId}/commits`;

  const responses = await Promise.all(
    authors.map((author) =>
      axios
        .get(url, {
          headers: {
            Authorization: `Basic ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          params: {
            'searchCriteria.author': author,
            'searchCriteria.fromDate': fromDate,
            'searchCriteria.toDate': toDate,
          },
        })
        .then((r) => (Array.isArray(r.data?.value) ? r.data.value : []))
        .catch((e) => {
          console.warn(
            `ADO commits fetch failed for author ${author} in ${organization}/${project}#${repoId}:`,
            e?.message ?? e
          );
          return [];
        })
    )
  );

  // Dedupe by commitId — overlapping authors can return the same commit.
  const dedup = new Map<string, any>();
  for (const list of responses) {
    for (const commit of list) {
      const id = commit?.commitId;
      if (id && !dedup.has(id)) {
        dedup.set(id, commit);
      }
    }
  }

  return Response.json({ commits: Array.from(dedup.values()) });
}
