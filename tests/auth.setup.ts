import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/session.json');

setup('authenticate', async ({ request }) => {
    const loginUrl = `${process.env.CF_BASE_URL}/user.cfc?method=login`;
    const response = await request.post(loginUrl, {
        form: {
            username: process.env.CF_LOGIN_USER!,
            password: process.env.CF_LOGIN_PASS!,
            captchaToken: 'something',
        },
    });

    const responseBody = await response.json();
    const sessionId = responseBody.sessionid;
    fs.writeFileSync(authFile, JSON.stringify({ sessionid: sessionId }));
});