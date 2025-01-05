import { toFormData } from "./FormDataUtils";
import { RequestModel } from "./RequestModel";

// Function to generate all combinations of parameter values
// function getCombinations(paramsArray: any[][]) {
//     return paramsArray.reduce((acc, paramValues) => {
//         return acc.flatMap(accItem => paramValues.map(value => [...accItem, value]));
//     }, [[]]);
// }

function getCombinations(paramsArray: any[][]) {
    return paramsArray.reduce((acc, paramValues) => {
        // Check if paramValues is an array
        if (!Array.isArray(paramValues)) {
            // If it's the body, treat it as a single element array
            if (typeof paramValues === 'object') {
                return acc.map(accItem => [...accItem, paramValues]);
            }
            throw new TypeError(`Expected an array, but received: ${typeof paramValues}`);
        }

        return acc.flatMap(accItem => paramValues.map(value => [...accItem, value]));
    }, [[]]);
}

// Collect parameter values by type from the schema
function collectParameterValuesByType(parameters: any[]) {
    const paramValuesByType = {
        query: [],
        header: [],
        path: [],
        body: [] as any[]
    };

    parameters.forEach(param => {
        let values: any;
        if (param.schema && param.schema.enum) {
            values = param.schema.enum;
            paramValuesByType[param.in].push(values);
        }
        if (param.schema && param.schema.example) {
            values = [param.schema.example];
            paramValuesByType[param.in].push(values);
        }
        if (param.example) {
            values = [param.example];
            paramValuesByType[param.in].push(values);
        }
    });

    return paramValuesByType;
}

// Generate all combinations of parameter values
function generateCombinations(paramValuesByType: any) {
    return getCombinations([
        ...paramValuesByType.query,
        ...paramValuesByType.header,
        ...paramValuesByType.path,
        ...paramValuesByType.body
    ]);
}

// Updated buildRequestObject to handle form-data body
function buildRequestObject(path: string, method: string, parameters: any[], combination: any[], formDataFields: any[], requestBodyType: string): RequestModel {
    const request: RequestModel = {
        path,
        method: method.toUpperCase(),
        queryParameters: {},
        headers: {},
        body: {},
        expectedResponses: {},
        requestBodyType: requestBodyType
    };

    parameters.forEach((param, index) => {
        if (param.in === 'query') {
            request.queryParameters[param.name] = combination[index];
        }
        if (param.in === 'path') {
            request.path = request.path.replace(`{${param.name}}`, combination[index]);
        }
        if (param.in === 'header') {
            request.headers[param.name] = combination[index];
        }
    });

    // Add form-data fields to the body
    if (formDataFields.length > 0) {
        const formBodyObject = formDataFields.reduce((acc, field) => {
            acc[field.name] = field.value;
            return acc;
        }, {});

        request.body = formBodyObject;
    }
    return request;
}

function processResponses(operation: any, spec: any, request: RequestModel) {
    try {
        for (const statusCode in operation.responses) {
            const response = operation.responses[statusCode];
            if (response.content && response.content['application/json'] && response.content['application/json'].schema) {
                const refs = extractRefs(response.content['application/json'].schema);
                const resolvedRefs = resolveReferences(refs, spec);

                request.expectedResponses[statusCode] = {
                    code: parseInt(statusCode),
                    refs: refs,
                    resolvedRefs: resolvedRefs,
                    schema: response.content['application/json'].schema,
                    components: {
                        schemas: {}
                    }
                };

                addResolvedRefsToComponents(request.expectedResponses[statusCode].components.schemas, resolvedRefs);
            }
        }
    } catch (error) {
        console.error(`Error processing responses for ${request.method} ${request.path}:`, error);
    }
}

// Resolve references from the specification
function resolveReferences(refs: string[], spec: any) {
    const resolvedRefs = {};
    for (const ref of refs) {
        resolvedRefs[ref] = resolveRef(ref, spec);
    }
    return resolvedRefs;
}

// Add resolved references to the components.schemas
function addResolvedRefsToComponents(componentsSchemas: any, resolvedRefs: any) {
    for (const [refKey, refValue] of Object.entries(resolvedRefs)) {
        const parts = refKey.split('/');
        const refName = parts[parts.length - 1];
        componentsSchemas[refName] = refValue;
    }
}

// Function to recursively extract $ref from a schema
function extractRefs(schema: any): string[] {
    const refs: string[] = [];

    if (schema.$ref) {
        refs.push(schema.$ref);
    }

    if (typeof schema === 'object' && schema !== null) {
        if (schema.properties) {
            for (const key in schema.properties) {
                const property = schema.properties[key];
                refs.push(...extractRefs(property)); // Recursively extract refs from properties
            }
        }

        if (schema.items) {
            refs.push(...extractRefs(schema.items));
        }

        for (const key in schema) {
            if (key !== 'properties' && key !== 'items') {
                refs.push(...extractRefs(schema[key]));
            }
        }
    }

    return refs;
}

// Function to resolve $refs to their actual schema
function resolveRef(ref, spec) {
    const refPath = ref.replace(/^#\//, ''); // Remove leading '#/'
    const refParts = refPath.split('/');

    let resolved = spec;
    for (const part of refParts) {
        if (resolved[part]) {
            resolved = resolved[part];
        } else {
            return null;
        }
    }
    return resolved;
}

function collectMultipartUrlencodedFormDataFields(content: any) {
    const formDataFields = [] as any[];
    if (content['multipart/x-www-form-urlencoded']) {
        const properties = content['multipart/x-www-form-urlencoded'].schema.properties;
        for (const key in properties) {
            const prop = properties[key];
            if (prop.example) {
                formDataFields.push({ name: key, value: prop.example });
            }
        }
    }
    return formDataFields
}

function collectSimpleFormDataFields(content: any) {
    const formDataFields = [] as any[];
    if (content['form-data']) {
        const properties = content['form-data'].schema.properties;

        for (const key in properties) {
            const prop = properties[key];
            if (prop.example) {
                formDataFields.push({ name: key, value: prop.example });
            }
        }
    }

    return formDataFields;
}

function collectMultipartFormDataFields(content: any) {
    const formDataFields = [] as any[];

    // Check if content has 'multipart/form-data'
    if (content['multipart/form-data']) {
        const properties = content['multipart/form-data'].schema.properties;

        for (const key in properties) {
            const prop = properties[key];
            // Only push fields that have an example value
            if (prop.example) {
                formDataFields.push({ name: key, value: prop.example });
            }
        }
    }

    return formDataFields;
}


function resolveSchemaRef(ref: string, components: any): any {
    const refPath = ref.replace('#/components/schemas/', '');
    let schema = components.schemas[refPath];
    if (!schema) {
        console.warn(`Schema not found for reference: ${ref}`);
        return null;
    }

    // Handle allOf by merging properties from each referenced schema
    if (schema.allOf) {
        const mergedSchema = { properties: {} };

        for (const subSchema of schema.allOf) {
            let resolvedSubSchema = subSchema;

            // Resolve $ref if present in sub-schema
            if (subSchema.$ref) {
                resolvedSubSchema = resolveSchemaRef(subSchema.$ref, components);
            }

            // Merge properties from resolved schema
            if (resolvedSubSchema && resolvedSubSchema.properties) {
                Object.assign(mergedSchema.properties, resolvedSubSchema.properties);
            }
        }

        return mergedSchema;
    }

    return schema;
}


function collectJsonFields(content: any, components: any) {
    const jsonFields = {} as { [key: string]: any };

    // Check if content has 'application/json'
    if (content['application/json']) {
        let properties = content['application/json'].schema.properties;

        // Check if there's a $ref instead of properties
        if (content['application/json'].schema.$ref) {
            const ref = content['application/json'].schema.$ref;
            const resolvedSchema = resolveSchemaRef(ref, components);

            // If resolved schema is found, use its properties
            if (resolvedSchema) {
                properties = resolvedSchema.properties;
            }
        }

        for (const key in properties) {
            const prop = properties[key];
            // Add fields with examples to the jsonFields object
            if (prop.example) {
                jsonFields[key] = prop.example;
            }
            // Handle nested properties within 'payload'
            if (key === 'payload' && prop.properties) {
                const payloadProperties = prop.properties;
                for (const payloadKey in payloadProperties) {
                    const payloadProp = payloadProperties[payloadKey];
                    if (payloadProp.example) {
                        jsonFields[`${key}.${payloadKey}`] = payloadProp.example;
                    }
                }
            }
        }
    }

    return jsonFields;
}

// Main function to build request objects dynamically
export function buildRequestsFromSpec(spec: any) {
    const requests: RequestModel[] = [];

    for (const path in spec.paths) {
        const pathItem = spec.paths[path];

        for (const method in pathItem) {
            const operation = pathItem[method];
            const parameters = operation.parameters || [];
            const paramValuesByType = collectParameterValuesByType(parameters);
            let requestBodyType: string = "default";

            // Collect form-data fields if requestBody is present
            let formDataFields: any[] = [];

            if (operation.requestBody && operation.requestBody.content) {
                const content = operation.requestBody.content;

                // Check for each content type and collect fields accordingly
                if (content['multipart/x-www-form-urlencoded']) {
                    requestBodyType = "multipart/x-www-form-urlencoded";
                    formDataFields = collectMultipartUrlencodedFormDataFields(content);
                }

                if (content['form-data']) {
                    requestBodyType = "form-data";
                    formDataFields = collectSimpleFormDataFields(content);
                }

                if (content['multipart/form-data']) {
                    requestBodyType = "multipart/form-data";
                    formDataFields = collectMultipartFormDataFields(content);
                }

                if (content['application/json']) {
                    requestBodyType = "application/json";
                    const jsonFields = collectJsonFields(content, spec.components);
                    for (const key in jsonFields) {
                        formDataFields.push({ name: key, value: jsonFields[key] });
                    }
                }

                // Add the collected form data fields to the request body parameters
                if (formDataFields.length > 0) {
                    paramValuesByType.body.push(...formDataFields);
                }
            }

            // Generate combinations and create requests
            const allCombinations = generateCombinations(paramValuesByType);

            for (const combination of allCombinations) {
                const request = buildRequestObject(path, method, parameters, combination, formDataFields, requestBodyType);
                processResponses(operation, spec, request);
                requests.push(request);
            }
        }
    }
    return requests;
}

export async function handleRequestBody(req: RequestModel, method: string) {
    const options: any = {};

    // Only treat the form data for POST or PUT requests
    // if (method === 'post' || method === 'put') {
    switch (req.requestBodyType) {
        case 'multipart/x-www-form-urlencoded':
        case 'form-data':
        case 'multipart/form-data':
            const formData =
                typeof req.body === 'object' && req.body !== null
                    ? await toFormData(req.body) // Await if toFormData is async
                    : {};
            options.multipart = formData; // Attach form data to options
            break;

        case 'application/json':
            options.data = req.body; // Use the body directly for JSON
            break;

        default:
            // Handle any other content types if necessary
            break;
    }
    // }

    return options;
}