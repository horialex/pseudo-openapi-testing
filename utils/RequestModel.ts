export interface RequestModel {
    path: string;
    method: string;
    queryParameters: Record<string, any>;
    headers: Record<string, any>;
    body?: Record<string, any>;
    expectedResponses: Record<string, any>;
    requestBodyType?: string;
}