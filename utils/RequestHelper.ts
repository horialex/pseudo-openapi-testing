import fs from 'fs';
import path from 'path';

export async function getSessionId(): Promise<string> {
    const sessionFilePath = path.join(__dirname, '../playwright/.auth/session.json');
    const sessionData = JSON.parse(fs.readFileSync(sessionFilePath, 'utf-8'));
    return sessionData.sessionid;
}

export async function createUrl(req: any, baseUrl: string, sessionId: string): Promise<URL> {
    const url = new URL(req.path, baseUrl);

    Object.entries(req.queryParameters).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
    });

    return url;
}
