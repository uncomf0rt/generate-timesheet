import axios from "axios";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const { organization,
        project,
        pat,
        repoId,
        searchCriteria:
        { author, fromDate, toDate }
    } = await req.json();
    const token = Buffer.from(`:${pat}`).toString('base64');

    const res = await axios.get(`https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repoId}/commits`, {
        headers: {
            Authorization: `Basic ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        params: {
            'searchCriteria.author': author,
            'searchCriteria.fromDate': fromDate,
            'searchCriteria.toDate': toDate
        }
    });
    return Response.json({
        commits: res.data.value,
    });
}