import axios from "axios";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const { organization, project, pat } = await req.json();
    const token = Buffer.from(`:${pat}`).toString('base64');

    const res = await axios.get(`https://dev.azure.com/${organization}/${project}/_apis/git/repositories?api-version=7.1`, {
        headers: {
            Authorization: `Basic ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
    });
    return Response.json({
        repositories: res.data.value,
    });
}