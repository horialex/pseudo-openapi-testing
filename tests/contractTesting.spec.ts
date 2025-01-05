import { test, expect } from '@playwright/test';
import Ajv from 'ajv'
import addFormats from 'ajv-formats-draft2019'
import { loadOpenApiSpec } from '../utils/OpenAPISpecReader';
import { buildRequestsFromSpec, handleRequestBody } from '../utils/ApiSpecRequestBuilder';
import { createUrl, getSessionId } from '../utils/RequestHelper';
import { Logger } from '../utils/Logger';

const ajv = new Ajv({ strict: false, coerceTypes: false });
addFormats(ajv);

let sessionId: string;
const openApiSpec = loadOpenApiSpec('../openapi_doc.yaml');
const requests = buildRequestsFromSpec(openApiSpec);

async function validateResponse(responseBody: any, expectedSchema: any) {
    const validate = ajv.compile(expectedSchema);
    const valid = validate(responseBody);
    if (!valid) {
        console.error('Validation errors:', validate.errors);
    }
    return valid;
}


test.beforeAll(async () => {
    sessionId = await getSessionId();
    // Enable logging if the environment variable ENABLE_LOGGING is set
    if (process.env.ENABLE_LOGGING! === 'true') {
        Logger.enableLogging();
    } else {
        Logger.disableLogging();
    }
});


requests.forEach(async req => {
    const url = await createUrl(req, process.env.BASE_URL!, sessionId);
    test(`Dynamic API request ${req.method} for ${req.path} :: URL: ${url}`, async ({ request }) => {
        Logger.logRequest(req);

        const method = req.method.toLowerCase()
        const options: any = {
            headers: req.headers,
            ...(await handleRequestBody(req, method)),
        };
        url.searchParams.append('sessionid', sessionId);

        const actualResponse = await request[method](url.toString(), options);
        const actualResponseCode = await actualResponse.status();
        const responseBody = await actualResponse.json();

        const expectedResponse = req.expectedResponses[actualResponseCode];
        expect(expectedResponse?.code).toBe(actualResponseCode);

        if (expectedResponse) {
            const { schema, components } = expectedResponse;
            const filteredSchema = { ...schema, components };

            const isValidResponse = await validateResponse(responseBody, filteredSchema);
            expect(isValidResponse, "The response is not according to the schema").toBeTruthy();

            console.log(isValidResponse ? 'Response is valid against the schema.' : 'Response validation failed.');
        } else {
            console.warn('No expected schema found for status code:', actualResponseCode);
        }
    });
})
